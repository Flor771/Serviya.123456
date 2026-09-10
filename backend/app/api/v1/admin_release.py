from datetime import datetime, timedelta
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.models.models import User
router = APIRouter(prefix="/admin-panel", tags=["Aprobación administrativa de fondos"])
class ReleaseApproval(BaseModel):
    notes: str = Field(default="", max_length=1000)
def _notify(db, user_id, title, message, kind, related_entity_id=None):
    if user_id:
        db.execute(text("INSERT INTO notifications (user_id,title,message,type,related_entity_id,read,created_at) VALUES (:u,:t,:m,:k,:rid,false,CURRENT_TIMESTAMP)"), {"u":user_id,"t":title,"m":message,"k":kind,"rid":related_entity_id})
def _audit(db, admin_id, action, target_id, notes):
    db.execute(text("INSERT INTO admin_audit_logs (admin_id,action,resource,target_id,details,timestamp) VALUES (:a,:action,'escrows',:id,:details,CURRENT_TIMESTAMP)"), {"a":admin_id,"action":action,"id":target_id,"details":notes or 'Aprobación administrativa'})
@router.get("/escrows/pending-deposits")
def pending_deposits(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows=db.execute(text("SELECT e.id,e.service_id,e.client_id,e.worker_id,e.total_amount_rd,e.voucher_url,e.bank_account_id,e.payment_method,e.created_at,s.title,s.negotiated_price_rd,COALESCE(NULLIF(TRIM(CONCAT(COALESCE(c.first_name,''),' ',COALESCE(c.last_name,''))),''),c.email) AS client_name,c.email AS client_email,c.phone AS client_phone,COALESCE(NULLIF(TRIM(CONCAT(COALESCE(w.first_name,''),' ',COALESCE(w.last_name,''))),''),w.email) AS worker_name,w.email AS worker_email,ba.bank_name,ba.account_number,ba.account_type FROM escrows e JOIN services s ON s.id=e.service_id LEFT JOIN users c ON c.id=e.client_id LEFT JOIN users w ON w.id=e.worker_id LEFT JOIN bank_accounts ba ON ba.id=e.bank_account_id WHERE e.status='PENDIENTE_VERIFICACION' ORDER BY e.created_at ASC")).mappings().all()
    deposits=[]
    for r in rows:
        item=dict(r); item["display_title"]=f"{item.get('client_name') or item.get('client_email') or 'Cliente'} — {item.get('title') or 'Servicio'}"; deposits.append(item)
    return {"pending_deposits":deposits,"summary":{"count":len(deposits),"pending_total_rd":sum(float(r['total_amount_rd'] or 0) for r in rows)}}
@router.post("/escrows/{service_id}/approve-deposit")
def approve_deposit(service_id:str,data:ReleaseApproval,admin_user:User=Depends(require_admin),db:Session=Depends(get_db)):
    escrow=db.execute(text("SELECT id,client_id,worker_id,total_amount_rd,status,voucher_url,bank_account_id FROM escrows WHERE service_id=:sid AND status='PENDIENTE_VERIFICACION' ORDER BY created_at DESC LIMIT 1 FOR UPDATE"),{"sid":service_id}).mappings().first()
    if not escrow: raise HTTPException(404,"No existe un depósito pendiente de verificación para este servicio.")
    if not escrow['voucher_url']: raise HTTPException(400,"No se puede confirmar el depósito sin voucher.")
    service=db.execute(text("SELECT id,status,worker_id FROM services WHERE id=:sid FOR UPDATE"),{"sid":service_id}).mappings().first()
    if not service: raise HTTPException(404,"Servicio no encontrado")
    if not service['worker_id']: raise HTTPException(400,"El servicio todavía no tiene trabajador seleccionado.")
    db.execute(text("UPDATE escrows SET status='RETENIDO' WHERE id=:id"),{"id":escrow['id']})
    db.execute(text("UPDATE services SET status='EN_PROGRESO' WHERE id=:sid"),{"sid":service_id})
    db.execute(text("UPDATE transactions SET status='RETENIDO' WHERE user_id=:u AND type='PAGO_CUSTODIA_TRANSFERENCIA' AND status='PENDIENTE_VERIFICACION' AND created_at=(SELECT MAX(created_at) FROM transactions WHERE user_id=:u AND type='PAGO_CUSTODIA_TRANSFERENCIA' AND status='PENDIENTE_VERIFICACION')"),{"u":escrow['client_id']})
    _notify(db,escrow['client_id'],'Depósito verificado por Administración',f"Administración confirmó que llegaron RD$ {float(escrow['total_amount_rd']):,.2f}. El dinero ahora sí está en Custodia SERVIYA y tu trabajo ya está activo.",'DEPOSIT_VERIFIED',service_id)
    _notify(db,escrow['worker_id'],'Depósito confirmado — trabajo activo',f"Administración confirmó el depósito de RD$ {float(escrow['total_amount_rd']):,.2f}. El servicio ya está protegido en Custodia SERVIYA y puedes comenzar.",'PAYMENT',service_id)
    _audit(db,admin_user.id,'ADMIN_VERIFY_DEPOSIT',escrow['id'],f"service_id={service_id}; {data.notes or 'Depósito verificado por Administración.'}")
    db.commit()
    return {"message":"Depósito verificado. Fondos puestos en Custodia SERVIYA y servicio activado.","status":"RETENIDO","approved_by_admin":True,"service_status":"EN_PROGRESO"}
@router.post("/escrows/{service_id}/reject-deposit")
def reject_deposit(service_id:str,data:ReleaseApproval,admin_user:User=Depends(require_admin),db:Session=Depends(get_db)):
    escrow=db.execute(text("SELECT id,client_id,total_amount_rd FROM escrows WHERE service_id=:sid AND status='PENDIENTE_VERIFICACION' ORDER BY created_at DESC LIMIT 1 FOR UPDATE"),{"sid":service_id}).mappings().first()
    if not escrow: raise HTTPException(404,"No existe un depósito pendiente de verificación para este servicio.")
    db.execute(text("UPDATE escrows SET status='RECHAZADO' WHERE id=:id"),{"id":escrow['id']})
    _notify(db,escrow['client_id'],'Voucher rechazado','Administración no pudo confirmar la llegada del depósito. El dinero no está en Custodia SERVIYA. Revisa el comprobante y realiza nuevamente el proceso.','DEPOSIT_REJECTED',service_id)
    _audit(db,admin_user.id,'ADMIN_REJECT_DEPOSIT',escrow['id'],f"service_id={service_id}; {data.notes or 'Depósito rechazado por Administración.'}")
    db.commit()
    return {"message":"Depósito rechazado; no se activó Custodia ni el trabajo.","status":"RECHAZADO","approved_by_admin":True}
@router.post("/escrows/{service_id}/approve-release")
def approve_release(service_id:str,data:ReleaseApproval,admin_user:User=Depends(require_admin),db:Session=Depends(get_db)):
    escrow=db.execute(text("SELECT id,client_id,worker_id,total_amount_rd,commission_amount_rd,worker_payout_rd,status FROM escrows WHERE service_id=:sid AND status='PENDIENTE_APROBACION' ORDER BY created_at DESC LIMIT 1 FOR UPDATE"),{"sid":service_id}).mappings().first()
    if not escrow: raise HTTPException(404,"No existe una custodia pendiente de aprobación para este servicio.")
    service=db.execute(text("SELECT id,status,completion_submitted FROM services WHERE id=:sid FOR UPDATE"),{"sid":service_id}).mappings().first()
    if not service: raise HTTPException(404,"Servicio no encontrado")
    if not service['completion_submitted']: raise HTTPException(400,"El trabajador todavía no ha enviado el trabajo a revisión.")
    worker_wallet=db.execute(text("SELECT id FROM wallets WHERE worker_id=:w FOR UPDATE"),{"w":escrow['worker_id']}).mappings().first()
    if not worker_wallet:
        db.execute(text("INSERT INTO wallets (worker_id,available_balance,pending_custody_balance,total_earnings,total_commissions,total_withdrawn) VALUES (:w,0,0,0,0,0)"),{"w":escrow['worker_id']})
        worker_wallet=db.execute(text("SELECT id FROM wallets WHERE worker_id=:w FOR UPDATE"),{"w":escrow['worker_id']}).mappings().one()
    payout=float(escrow['worker_payout_rd'] or 0); commission=float(escrow['commission_amount_rd'] or 0); now=datetime.utcnow()
    db.execute(text("UPDATE escrows SET status='LIBERADO',released_at=:now,otp_verified=true WHERE id=:id"),{"id":escrow['id'],"now":now})
    db.execute(text("UPDATE wallets SET available_balance=COALESCE(available_balance,0)+:p,total_earnings=COALESCE(total_earnings,0)+:p,total_commissions=COALESCE(total_commissions,0)+:c WHERE id=:id"),{"id":worker_wallet['id'],"p":payout,"c":commission})
    db.execute(text("INSERT INTO financial_movements (wallet_id,contract_id,movement_type,amount_dop,description,created_at) VALUES (:w,NULL,'LIBERACION_ADMIN',:p,:d,CURRENT_TIMESTAMP)"),{"w":worker_wallet['id'],"p":payout,"d":f"Liberación administrativa del servicio {service_id}"})
    db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) VALUES (:u,:p,'LIBERACION_ADMIN','COMPLETADO',:ref,CURRENT_TIMESTAMP)"),{"u":escrow['worker_id'],"p":payout,"ref":f"ADMIN-RELEASE-{service_id[:8].upper()}"})
    db.execute(text("UPDATE services SET status='COMPLETADA' WHERE id=:sid"),{"sid":service_id})
    warranty=db.execute(text("SELECT id FROM service_warranties WHERE service_id=:sid LIMIT 1"),{"sid":service_id}).scalar()
    if not warranty:
        expires=now+timedelta(days=60); ref=f"GAR-SRV-{service_id[:8].upper()}"; db.execute(text("INSERT INTO service_warranties (id,service_id,client_id,worker_id,coverage_days,status,activated_at,expires_at,certificate_ref) VALUES (:id,:sid,:c,:w,60,'ACTIVA',:now,:exp,:ref)"),{"id":str(uuid.uuid4()),"sid":service_id,"c":escrow['client_id'],"w":escrow['worker_id'],"now":now,"exp":expires,"ref":ref})
    _notify(db,escrow['worker_id'],'Pago liberado por administración',f"Administración aprobó la liberación de RD$ {payout:,.2f}.",'PAYMENT_RELEASED',service_id)
    _notify(db,escrow['client_id'],'Pago aprobado y garantía activa','Administración aprobó la liquidación y activó la garantía SERVIYA por 60 días.','PAYMENT_ADMIN_APPROVED',service_id)
    _audit(db,admin_user.id,'ADMIN_APPROVE_RELEASE',escrow['id'],f"service_id={service_id}; {data.notes or 'Liberación aprobada por Administración.'}")
    db.commit()
    return {"message":"Fondos liberados correctamente y garantía de 60 días activada.","status":"LIBERADO","worker_payout_rd":payout,"service_status":"COMPLETADA"}
