import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.deps import get_db, get_current_active_user
from app.models.models import Service, Escrow, Wallet, ServiceStatusEnum, User

router = APIRouter(prefix="/payments", tags=["Pagos y Custodia (Escrow)"])
class EscrowPaymentSchema(BaseModel): service_id: str
class EscrowReleaseSchema(BaseModel): escrow_id: str
class RefundSchema(BaseModel): service_id: str; reason: Optional[str] = "Reembolso solicitado por el cliente"

def _tx(db,u,a,t,s,d,r):
    db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) VALUES (:u,:a,:t,:s,:r,CURRENT_TIMESTAMP)"),{"u":u,"a":a,"t":t,"s":s,"r":r})
def _move(db,w,a,t,d):
    db.execute(text("INSERT INTO financial_movements (wallet_id,contract_id,movement_type,amount_dop,description,created_at) VALUES (:w,NULL,:t,:a,:d,CURRENT_TIMESTAMP)"),{"w":w,"a":a,"t":t,"d":d})
def _client_wallet(db,c):
    row=db.execute(text("SELECT id,available_balance FROM client_wallets WHERE client_id=:c FOR UPDATE"),{"c":c}).mappings().first()
    if not row:
        db.execute(text("INSERT INTO client_wallets (client_id) VALUES (:c) ON CONFLICT (client_id) DO NOTHING"),{"c":c})
        row=db.execute(text("SELECT id,available_balance FROM client_wallets WHERE client_id=:c FOR UPDATE"),{"c":c}).mappings().one()
    return row

@router.post("/escrow")
def pay_escrow(data:EscrowPaymentSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    service=db.query(Service).filter(Service.id==data.service_id).first()
    if not service: raise HTTPException(404,"Servicio no encontrado")
    if service.client_id!=current_user.id: raise HTTPException(403,"Solamente el cliente puede pagar este servicio")
    if not service.worker_id: raise HTTPException(400,"Debe seleccionar un técnico antes de realizar el pago.")
    existing=db.query(Escrow).filter(Escrow.service_id==service.id,Escrow.status.in_(["RETENIDO","EN_DISPUTA"])).first()
    if existing: raise HTTPException(400,"Este servicio ya tiene un pago activo en Custodia SERVIYA.")
    amount=float(service.price_rd)
    if amount<=0: raise HTTPException(400,"El monto del servicio debe ser mayor que RD$ 0.")
    wallet=_client_wallet(db,current_user.id); available=float(wallet["available_balance"] or 0)
    if available<amount: raise HTTPException(400,detail=f"Saldo insuficiente. Necesitas RD$ {amount:,.2f} y tienes RD$ {available:,.2f}.")
    rate=float(settings.PLATFORM_COMMISSION_PERCENT); commission=amount*rate/100; payout=amount-commission
    escrow=Escrow(service_id=service.id,client_id=current_user.id,worker_id=service.worker_id,total_amount_rd=amount,commission_rate_percent=rate,commission_amount_rd=commission,worker_payout_rd=payout,status="RETENIDO")
    db.add(escrow)
    db.execute(text("UPDATE client_wallets SET available_balance=available_balance-:a,total_spent=total_spent+:a,updated_at=CURRENT_TIMESTAMP WHERE id=:id"),{"a":amount,"id":wallet["id"]})
    service.status=ServiceStatusEnum.EN_PROGRESO
    ref=f"ESCROW-{uuid.uuid4().hex[:8].upper()}"; _tx(db,current_user.id,amount,"PAGO_CUSTODIA","RETENIDO",f"Pago en Custodia para servicio #{service.id[:8]}",ref)
    db.commit(); db.refresh(escrow)
    return {"message":f"Pago de RD$ {amount:,.2f} protegido exitosamente en Custodia SERVIYA.do","escrow_id":escrow.id,"reference":ref,"status":"RETENIDO","wallet_available_rd":available-amount}

@router.post("/release")
def release_escrow(data:EscrowReleaseSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    escrow=db.query(Escrow).filter(Escrow.id==data.escrow_id).with_for_update().first()
    if not escrow: raise HTTPException(404,"Registro de Custodia no encontrado")
    if escrow.status!="RETENIDO": raise HTTPException(400,detail=f"El escrow ya se encuentra en estado {escrow.status}")
    if escrow.client_id!=current_user.id: raise HTTPException(403,"Solamente el cliente creador puede autorizar la liberación.")
    wallet=db.query(Wallet).filter(Wallet.worker_id==escrow.worker_id).with_for_update().first()
    if not wallet:
        wallet=Wallet(worker_id=escrow.worker_id,available_balance=0.0,pending_custody_balance=0.0,total_earnings=0.0,total_commissions=0.0,total_withdrawn=0.0); db.add(wallet); db.flush()
    escrow.status="LIBERADO"; escrow.released_at=datetime.utcnow(); wallet.available_balance+=escrow.worker_payout_rd; wallet.total_earnings+=escrow.worker_payout_rd; wallet.total_commissions+=escrow.commission_amount_rd
    _move(db,wallet.id,escrow.worker_payout_rd,"LIBERACION_SERVICIO",f"Liberación del servicio #{escrow.service_id[:8]}"); _tx(db,escrow.worker_id,escrow.worker_payout_rd,"LIBERACION","EXITOSO",f"Fondos liberados del servicio #{escrow.service_id[:8]}",f"RELEASE-{escrow.id[:8]}")
    service=db.query(Service).filter(Service.id==escrow.service_id).first()
    if service:
        service.status=ServiceStatusEnum.COMPLETADA; worker=db.query(User).filter(User.id==escrow.worker_id).first()
        if worker: worker.jobs_completed=(worker.jobs_completed or 0)+1
    db.commit(); return {"message":"Fondos liberados exitosamente al técnico.","worker_payout_rd":escrow.worker_payout_rd}

@router.post("/refund")
def refund_escrow(data:RefundSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    escrow=db.query(Escrow).filter(Escrow.service_id==data.service_id,Escrow.status=="RETENIDO").with_for_update().first()
    if not escrow: raise HTTPException(409,"El reembolso directo no está disponible. Si existe una disputa, debe ser resuelta por administración.")
    if escrow.client_id!=current_user.id: raise HTTPException(403,"Solamente el cliente creador puede solicitar este reembolso.")
    wallet=_client_wallet(db,current_user.id); amount=float(escrow.total_amount_rd); escrow.status="REEMBOLSADO"
    service=db.query(Service).filter(Service.id==data.service_id).first()
    if service: service.status=ServiceStatusEnum.CANCELADA
    db.execute(text("UPDATE client_wallets SET available_balance=available_balance+:a,total_refunded=total_refunded+:a,updated_at=CURRENT_TIMESTAMP WHERE id=:id"),{"a":amount,"id":wallet["id"]})
    ref=f"REFUND-{uuid.uuid4().hex[:8].upper()}"; _tx(db,current_user.id,amount,"REEMBOLSO","EXITOSO",f"Reembolso del servicio #{data.service_id[:8]}: {data.reason}",ref); db.commit()
    balance=db.execute(text("SELECT available_balance FROM client_wallets WHERE id=:id"),{"id":wallet["id"]}).scalar_one()
    return {"message":f"Reembolso de RD$ {amount:,.2f} acreditado a la Billetera SERVIYA.","refund_amount_rd":amount,"reference":ref,"wallet_available_rd":float(balance)}
