import uuid
import random
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.deps import get_db, get_current_active_user
from app.models.models import Service, Escrow, Wallet, ServiceStatusEnum, User, BankAccount, Notification
router = APIRouter(prefix="/payments", tags=["Pagos y Custodia (Escrow)"])
class EscrowPaymentSchema(BaseModel): service_id:str
class BankTransferEscrowSchema(BaseModel): service_id:str; bank_account_id:Optional[int]=None; voucher_url:str
class EscrowReleaseSchema(BaseModel): service_id:str
class RefundSchema(BaseModel): service_id:str; reason:Optional[str]="Reembolso solicitado por el cliente"
def _tx(db,u,a,t,s,r,d,voucher=None,bank_account_id=None): db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at,voucher_url,bank_account_id) VALUES (:u,:a,:t,:s,:r,CURRENT_TIMESTAMP,:v,:b)"),{"u":u,"a":a,"t":t,"s":s,"r":r,"v":voucher,"b":bank_account_id})
def _client_wallet(db,c):
 row=db.execute(text("SELECT id,available_balance FROM client_wallets WHERE client_id=:c FOR UPDATE"),{"c":c}).mappings().first()
 if not row:
  db.execute(text("INSERT INTO client_wallets (client_id) VALUES (:c) ON CONFLICT (client_id) DO NOTHING"),{"c":c}); row=db.execute(text("SELECT id,available_balance FROM client_wallets WHERE client_id=:c FOR UPDATE"),{"c":c}).mappings().one()
 return row
def _validate_voucher(v):
 if not v or not v.startswith("data:image/") or len(v)>900000: raise HTTPException(400,"Debes subir el recibo/voucher del depósito (JPG, PNG o WebP, máximo 900 KB).")
def _agreed_price(db, service_id):
 row=db.execute(text("SELECT negotiated_price_rd,negotiation_status FROM services WHERE id=:id"),{"id":service_id}).mappings().first()
 if not row or row["negotiation_status"] != "ACORDADO" or row["negotiated_price_rd"] is None:
  raise HTTPException(400,"Primero deben negociar y acordar el precio final. El presupuesto de publicación es solo orientativo.")
 return float(row["negotiated_price_rd"])
def _ensure_warranty(db, service):
 existing=db.execute(text("SELECT id FROM service_warranties WHERE service_id=:sid LIMIT 1"),{"sid":service.id}).scalar()
 if existing:return existing
 wid=str(uuid.uuid4()); days=60; expires=datetime.utcnow()+timedelta(days=days); ref=f"GAR-SRV-{str(service.id)[:8].upper()}"
 db.execute(text("INSERT INTO service_warranties (id,service_id,client_id,worker_id,coverage_days,status,activated_at,expires_at,certificate_ref) VALUES (:id,:sid,:c,:w,:d,'ACTIVA',CURRENT_TIMESTAMP,:e,:ref)"),{"id":wid,"sid":service.id,"c":service.client_id,"w":service.worker_id,"d":days,"e":expires,"ref":ref})
 db.add(Notification(user_id=service.client_id,title="Garantía SERVIYA activada",message=f"Garantía de satisfacción activa por {days} días. Certificado {ref}.",type="WARRANTY_ACTIVATED",related_entity_id=service.id))
 return wid
@router.post("/escrow")
def pay_escrow(data:EscrowPaymentSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
 service=db.query(Service).filter(Service.id==data.service_id).with_for_update().first()
 if not service: raise HTTPException(404,"Servicio no encontrado")
 if service.client_id!=current_user.id: raise HTTPException(403,"Solamente el cliente puede pagar este servicio")
 if not service.worker_id: raise HTTPException(400,"Debe seleccionarse un técnico antes de realizar el pago.")
 if service.status!="TRABAJADOR_SELECCIONADO": raise HTTPException(400,"El pago se habilita después de la selección y del acuerdo final de precio.")
 amount=_agreed_price(db,service.id)
 if db.query(Escrow).filter(Escrow.service_id==service.id,Escrow.status.in_(["RETENIDO","EN_DISPUTA"])).first(): raise HTTPException(400,"Este servicio ya tiene un pago activo en Custodia SERVIYA.")
 wallet=_client_wallet(db,current_user.id); available=float(wallet["available_balance"] or 0)
 if available<amount: raise HTTPException(400,detail=f"Saldo insuficiente. Necesitas RD$ {amount:,.2f} y tienes RD$ {available:,.2f}.")
 rate=float(settings.PLATFORM_COMMISSION_PERCENT); commission=amount*rate/100; payout=amount-commission; otp=f"{random.randint(100000,999999)}"
 escrow=Escrow(service_id=service.id,client_id=current_user.id,worker_id=service.worker_id,total_amount_rd=amount,commission_rate_percent=rate,commission_amount_rd=commission,worker_payout_rd=payout,status="RETENIDO",release_otp=otp,otp_verified=False,payment_method="SALDO_BILLETERA"); db.add(escrow)
 db.execute(text("UPDATE client_wallets SET available_balance=available_balance-:a,total_spent=total_spent+:a,updated_at=CURRENT_TIMESTAMP WHERE id=:id"),{"a":amount,"id":wallet["id"]}); service.status=ServiceStatusEnum.EN_PROGRESO; ref=f"ESCROW-{uuid.uuid4().hex[:8].upper()}"; _tx(db,current_user.id,amount,"PAGO_CUSTODIA","RETENIDO",f"Pago acordado en Custodia para servicio #{service.id[:8]}",ref); db.add(Notification(user_id=service.worker_id,title="Precio acordado y pago en Custodia",message=f"El cliente depositó RD$ {amount:,.2f}. El trabajo ya está protegido en Custodia SERVIYA.",type="PAYMENT",related_entity_id=service.id)); db.commit(); return {"message":"Pago protegido en Custodia SERVIYA.","escrow_id":escrow.id,"reference":ref,"status":"RETENIDO","agreed_price_rd":amount}
@router.post("/escrow-bank-transfer")
def bank_transfer_escrow(data:BankTransferEscrowSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
 service=db.query(Service).filter(Service.id==data.service_id).with_for_update().first()
 if not service: raise HTTPException(404,"Servicio no encontrado")
 if service.client_id!=current_user.id: raise HTTPException(403,"Solamente el cliente puede realizar este depósito")
 if not service.worker_id: raise HTTPException(400,"Primero debes seleccionar un trabajador.")
 if service.status!="TRABAJADOR_SELECCIONADO": raise HTTPException(400,"Este servicio no está esperando el depósito en Custodia.")
 amount=_agreed_price(db,service.id); _validate_voucher(data.voucher_url)
 account=db.query(BankAccount).filter(BankAccount.id==data.bank_account_id,BankAccount.is_active==True).first() if data.bank_account_id is not None else None
 if data.bank_account_id is not None and not account: raise HTTPException(400,"La cuenta bancaria seleccionada ya no está disponible.")
 if db.query(Escrow).filter(Escrow.service_id==service.id,Escrow.status.in_(["RETENIDO","EN_DISPUTA"])).first(): raise HTTPException(400,"Este servicio ya tiene un depósito en Custodia SERVIYA.")
 rate=float(settings.PLATFORM_COMMISSION_PERCENT); commission=amount*rate/100; payout=amount-commission; otp=f"{random.randint(100000,999999)}"
 escrow=Escrow(service_id=service.id,client_id=current_user.id,worker_id=service.worker_id,total_amount_rd=amount,commission_rate_percent=rate,commission_amount_rd=commission,worker_payout_rd=payout,status="RETENIDO",voucher_url=data.voucher_url,bank_account_id=data.bank_account_id,payment_method="TRANSFERENCIA_BANCARIA",release_otp=otp,otp_verified=False); db.add(escrow); service.status=ServiceStatusEnum.EN_PROGRESO
 ref=f"ESCROW-BANK-{uuid.uuid4().hex[:8].upper()}"; _tx(db,current_user.id,amount,"PAGO_CUSTODIA_TRANSFERENCIA","RETENIDO",f"Depósito bancario con voucher para servicio #{service.id[:8]}",ref,data.voucher_url,data.bank_account_id)
 db.add(Notification(user_id=service.worker_id,title="Depósito en Custodia SERVIYA",message=f"El cliente realizó el depósito acordado de RD$ {amount:,.2f} y adjuntó el voucher. Ya puedes iniciar el trabajo.",type="PAYMENT",related_entity_id=service.id)); db.commit(); return {"message":"Voucher recibido y fondos registrados en Custodia SERVIYA.","escrow_id":escrow.id,"reference":ref,"status":"RETENIDO","voucher_received":True,"agreed_price_rd":amount}
@router.post("/release")
def release_escrow(data:EscrowReleaseSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
 escrow=db.query(Escrow).filter(Escrow.service_id==data.service_id).with_for_update().first()
 if not escrow: raise HTTPException(404,"Registro de Custodia no encontrado")
 if escrow.status!="RETENIDO": raise HTTPException(400,detail=f"El escrow ya se encuentra en estado {escrow.status}")
 if escrow.client_id!=current_user.id: raise HTTPException(403,"Solamente el cliente creador puede autorizar la liberación.")
 row=db.execute(text("SELECT completion_submitted FROM services WHERE id=:id"),{"id":data.service_id}).mappings().first()
 if not row or not row["completion_submitted"]: raise HTTPException(400,"El técnico debe enviar primero la evidencia y el trabajo a revisión del cliente.")
 wallet=db.query(Wallet).filter(Wallet.worker_id==escrow.worker_id).with_for_update().first()
 if not wallet: wallet=Wallet(worker_id=escrow.worker_id,available_balance=0.0,pending_custody_balance=0.0,total_earnings=0.0,total_commissions=0.0,total_withdrawn=0.0); db.add(wallet); db.flush()
 escrow.status="LIBERADO"; escrow.otp_verified=True; escrow.released_at=datetime.utcnow(); wallet.available_balance+=escrow.worker_payout_rd; wallet.total_earnings+=escrow.worker_payout_rd; wallet.total_commissions+=escrow.commission_amount_rd
 service=db.query(Service).filter(Service.id==escrow.service_id).first()
 if service:
  service.status=ServiceStatusEnum.COMPLETADA
  _ensure_warranty(db,service)
 db.commit(); return {"message":"Fondos liberados exitosamente al técnico y garantía SERVIYA activada.","worker_payout_rd":escrow.worker_payout_rd,"warranty_days":60}
@router.post("/refund")
def refund_escrow(data:RefundSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
 escrow=db.query(Escrow).filter(Escrow.service_id==data.service_id,Escrow.status=="RETENIDO").with_for_update().first()
 if not escrow: raise HTTPException(409,"El reembolso directo no está disponible. Si existe una disputa, debe ser resuelta por administración.")
 if escrow.client_id!=current_user.id: raise HTTPException(403,"Solamente el cliente creador puede solicitar este reembolso.")
 wallet=_client_wallet(db,current_user.id); amount=float(escrow.total_amount_rd); escrow.status="REEMBOLSADO"; service=db.query(Service).filter(Service.id==data.service_id).first()
 if service: service.status=ServiceStatusEnum.CANCELADA
 db.execute(text("UPDATE client_wallets SET available_balance=available_balance+:a,total_refunded=total_refunded+:a,updated_at=CURRENT_TIMESTAMP WHERE id=:id"),{"a":amount,"id":wallet["id"]}); ref=f"REFUND-{uuid.uuid4().hex[:8].upper()}"; _tx(db,current_user.id,amount,"REEMBOLSO","EXITOSO",f"Reembolso del servicio #{data.service_id[:8]}: {data.reason}",ref); db.commit(); balance=db.execute(text("SELECT available_balance FROM client_wallets WHERE id=:id"),{"id":wallet["id"]}).scalar_one(); return {"message":f"Reembolso de RD$ {amount:,.2f} acreditado a la Billetera SERVIYA.","refund_amount_rd":amount,"reference":ref,"wallet_available_rd":float(balance)}
