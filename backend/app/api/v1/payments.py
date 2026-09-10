import uuid
import random
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.deps import get_db, get_current_active_user
from app.models.models import Service, Escrow, Wallet, ServiceStatusEnum, User, BankAccount, Notification

router = APIRouter(prefix="/payments", tags=["Pagos y Custodia (Escrow)"])

class EscrowPaymentSchema(BaseModel): service_id: str
class BankTransferEscrowSchema(BaseModel): service_id: str; bank_account_id: Optional[int] = None; voucher_url: str
class EscrowReleaseSchema(BaseModel): service_id: str
class RefundSchema(BaseModel): service_id: str; reason: Optional[str] = "Reembolso solicitado por el cliente"

def _tx(db, u, a, t, s, description, reference_code, voucher=None, bank_account_id=None):
    db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at,voucher_url,bank_account_id) VALUES (:u,:a,:t,:s,:r,CURRENT_TIMESTAMP,:v,:b)"), {"u":u,"a":a,"t":t,"s":s,"r":reference_code,"v":voucher,"b":bank_account_id})

def _validate_voucher(v):
    if not v or not v.startswith("data:image/") or len(v) > 900000:
        raise HTTPException(400, "Debes subir el recibo/voucher del depósito (JPG, PNG o WebP, máximo 900 KB).")

def _agreed_price(db, service_id):
    row=db.execute(text("SELECT negotiated_price_rd,negotiation_status FROM services WHERE id=:id"),{"id":service_id}).mappings().first()
    if not row or row["negotiation_status"] != "ACORDADO" or row["negotiated_price_rd"] is None:
        raise HTTPException(400,"Primero deben negociar y acordar el precio final. El presupuesto de publicación es solo orientativo.")
    return float(row["negotiated_price_rd"])

@router.post("/escrow")
def pay_escrow(data:EscrowPaymentSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    raise HTTPException(400,"No se puede poner dinero en Custodia directamente. Primero realiza el depósito, sube el voucher y espera la verificación de Administración.")

@router.post("/escrow-bank-transfer")
def bank_transfer_escrow(data:BankTransferEscrowSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    service=db.query(Service).filter(Service.id==data.service_id).with_for_update().first()
    if not service: raise HTTPException(404,"Servicio no encontrado")
    if service.client_id != current_user.id: raise HTTPException(403,"Solamente el cliente puede realizar este depósito")
    if not service.worker_id: raise HTTPException(400,"Primero debes seleccionar un trabajador.")
    if service.status != "TRABAJADOR_SELECCIONADO": raise HTTPException(400,"Este servicio no está esperando el depósito en Custodia.")
    amount=_agreed_price(db,service.id); _validate_voucher(data.voucher_url)
    account=db.query(BankAccount).filter(BankAccount.id==data.bank_account_id,BankAccount.is_active==True).first() if data.bank_account_id is not None else None
    if data.bank_account_id is not None and not account: raise HTTPException(400,"La cuenta bancaria seleccionada ya no está disponible.")
    if db.query(Escrow).filter(Escrow.service_id==service.id,Escrow.status.in_(["PENDIENTE_VERIFICACION","RETENIDO","EN_DISPUTA","PENDIENTE_APROBACION"])).first(): raise HTTPException(400,"Este servicio ya tiene un depósito registrado o una Custodia activa.")
    rate=float(settings.PLATFORM_COMMISSION_PERCENT); commission=amount*rate/100; payout=amount-commission; otp=f"{random.randint(100000,999999)}"
    escrow=Escrow(service_id=service.id,client_id=current_user.id,worker_id=service.worker_id,total_amount_rd=amount,commission_rate_percent=rate,commission_amount_rd=commission,worker_payout_rd=payout,status="PENDIENTE_VERIFICACION",voucher_url=data.voucher_url,bank_account_id=data.bank_account_id,payment_method="TRANSFERENCIA_BANCARIA",release_otp=otp,otp_verified=False)
    db.add(escrow); db.flush()
    ref=f"ESCROW-BANK-{uuid.uuid4().hex[:8].upper()}"
    description=f"Custodia {ref} | escrow={escrow.id} | servicio={service.id} | cliente={current_user.id} | trabajador={service.worker_id} | banco={account.bank_name if account else 'NO_ESPECIFICADO'} | cuenta={account.account_number if account else 'NO_ESPECIFICADA'}"
    _tx(db,current_user.id,amount,"PAGO_CUSTODIA_TRANSFERENCIA","PENDIENTE_VERIFICACION",description,ref,data.voucher_url,data.bank_account_id)
    admins=db.execute(text("SELECT id FROM users WHERE role='ADMIN'")).scalars().all()
    for admin_id in admins:
        db.add(Notification(user_id=admin_id,title="Nuevo depósito pendiente de verificar",message=f"Depósito {ref}: RD$ {amount:,.2f}. Cliente #{current_user.id} → trabajador #{service.worker_id}. Verifica voucher, banco y cuenta antes de Custodia.",type="DEPOSIT_VERIFICATION",related_entity_id=service.id))
    db.add(Notification(user_id=current_user.id,title="Voucher recibido — verificación pendiente",message=f"Depósito {ref} recibido por RD$ {amount:,.2f}. Destinatario reservado: trabajador #{service.worker_id}. El dinero NO está en Custodia todavía.",type="DEPOSIT_PENDING_VERIFICATION",related_entity_id=service.id))
    db.commit()
    return {"message":"Voucher recibido. El depósito queda pendiente de verificación administrativa.","escrow_id":escrow.id,"reference":ref,"status":"PENDIENTE_VERIFICACION","voucher_received":True,"approved_by_admin":False,"agreed_price_rd":amount,"trace":{"service_id":service.id,"client_id":current_user.id,"worker_id":service.worker_id,"bank_account_id":data.bank_account_id}}

@router.post("/release")
def request_release_approval(data:EscrowReleaseSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    escrow=db.query(Escrow).filter(Escrow.service_id==data.service_id).with_for_update().first()
    if not escrow: raise HTTPException(404,"Registro de Custodia no encontrado")
    if escrow.status != "RETENIDO": raise HTTPException(400,detail=f"El escrow ya se encuentra en estado {escrow.status}")
    if escrow.client_id != current_user.id: raise HTTPException(403,"Solamente el cliente creador puede solicitar la liberación.")
    row=db.execute(text("SELECT completion_submitted FROM services WHERE id=:id"),{"id":data.service_id}).mappings().first()
    if not row or not row["completion_submitted"]: raise HTTPException(400,"El técnico debe enviar primero la evidencia y el trabajo a revisión del cliente.")
    escrow.status="PENDIENTE_APROBACION"
    admins=db.execute(text("SELECT id FROM users WHERE role='ADMIN'")).scalars().all()
    for admin_id in admins: db.add(Notification(user_id=admin_id,title="Liberación pendiente de aprobación",message=f"Custodia {escrow.id} | servicio {data.service_id} | trabajador {escrow.worker_id} | cliente {escrow.client_id}. Revisa y aprueba la liberación.",type="ADMIN_RELEASE_PENDING",related_entity_id=data.service_id))
    db.commit(); return {"message":"Confirmación recibida. La liberación queda pendiente de aprobación administrativa.","status":"PENDIENTE_APROBACION","approved_by_admin":False,"trace":{"escrow_id":escrow.id,"client_id":escrow.client_id,"worker_id":escrow.worker_id}}

@router.post("/refund")
def refund_escrow(data:RefundSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    escrow=db.query(Escrow).filter(Escrow.service_id==data.service_id,Escrow.status=="RETENIDO").with_for_update().first()
    if not escrow: raise HTTPException(409,"El reembolso directo no está disponible. Si existe una disputa, debe ser resuelta por administración.")
    if escrow.client_id != current_user.id: raise HTTPException(403,"Solamente el cliente creador puede solicitar este reembolso.")
    wallet=db.execute(text("SELECT id,available_balance FROM client_wallets WHERE client_id=:c FOR UPDATE"),{"c":current_user.id}).mappings().first()
    if not wallet:
        db.execute(text("INSERT INTO client_wallets (client_id) VALUES (:c) ON CONFLICT (client_id) DO NOTHING"),{"c":current_user.id}); wallet=db.execute(text("SELECT id,available_balance FROM client_wallets WHERE client_id=:c FOR UPDATE"),{"c":current_user.id}).mappings().one()
    amount=float(escrow.total_amount_rd); escrow.status="REEMBOLSADO"; service=db.query(Service).filter(Service.id==data.service_id).first()
    if service: service.status=ServiceStatusEnum.CANCELADA
    db.execute(text("UPDATE client_wallets SET available_balance=available_balance+:a,total_refunded=total_refunded+:a,updated_at=CURRENT_TIMESTAMP WHERE id=:id"),{"a":amount,"id":wallet["id"]})
    ref=f"REFUND-{uuid.uuid4().hex[:8].upper()}"; _tx(db,current_user.id,amount,"REEMBOLSO","EXITOSO",f"Reembolso del servicio #{data.service_id[:8]}: {data.reason}",ref)
    db.commit(); balance=db.execute(text("SELECT available_balance FROM client_wallets WHERE id=:id"),{"id":wallet["id"]}).scalar_one()
    return {"message":f"Reembolso de RD$ {amount:,.2f} acreditado a la Billetera SERVIYA.","refund_amount_rd":amount,"reference":ref,"wallet_available_rd":float(balance)}
