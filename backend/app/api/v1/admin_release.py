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
        db.execute(text("INSERT INTO notifications (id,user_id,title,message,type,related_entity_id,read,created_at) VALUES (gen_random_uuid()::text,:u,:t,:m,:k,:rid,false,CURRENT_TIMESTAMP)"), {"u":user_id,"t":title,"m":message,"k":kind,"rid":related_entity_id})


def _audit(db, admin_id, action, target_id, notes):
    db.execute(text("INSERT INTO admin_audit_logs (admin_id,action,resource,target_id,details,timestamp) VALUES (:a,:action,'escrows',:id,:details,CURRENT_TIMESTAMP)"), {"a":admin_id,"action":action,"id":str(target_id),"details":notes or 'Aprobación administrativa'})


@router.get("/escrows/pending-deposits")
def pending_deposits(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows=db.execute(text("SELECT e.id,e.service_id,e.client_id,e.worker_id,e.total_amount_rd,e.voucher_url,e.bank_account_id,e.payment_method,e.created_at,s.title,s.negotiated_price_rd,COALESCE(NULLIF(TRIM(CONCAT(COALESCE(c.first_name,''),' ',COALESCE(c.last_name,''))),''),c.email) AS client_name,c.email AS client_email,c.phone AS client_phone,COALESCE(NULLIF(TRIM(CONCAT(COALESCE(w.first_name,''),' ',COALESCE(w.last_name,''))),''),w.email) AS worker_name,w.email AS worker_email,ba.bank_name,ba.account_number,ba.account_type FROM escrows e JOIN services s ON s.id=e.service_id LEFT JOIN users c ON c.id=e.client_id LEFT JOIN users w ON w.id=e.worker_id LEFT JOIN bank_accounts ba ON ba.id=e.bank_account_id WHERE e.status='PENDIENTE_VERIFICACION' ORDER BY e.created_at ASC")).mappings().all()
    deposits=[]
    for r in rows:
        item=dict(r); item["display_title"]=f"{item.get('client_name') or item.get('client_email') or 'Cliente'} — {item.get('title') or 'Servicio'}"; deposits.append(item)
    return {"pending_deposits":deposits,"summary":{"count":len(deposits),"pending_total_rd":sum(float(r['total_amount_rd'] or 0) for r in rows)}}


@router.get("/escrows/pending-release")
def pending_releases(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows=db.execute(text("""
        SELECT e.id,e.service_id,e.client_id,e.worker_id,e.total_amount_rd,e.commission_amount_rd,e.worker_payout_rd,e.status,e.created_at,
               e.released_at,s.title,s.completion_submitted,s.completion_summary,s.completion_submitted_at,
               COALESCE(NULLIF(TRIM(CONCAT(COALESCE(c.first_name,''),' ',COALESCE(c.last_name,''))),''),c.email) AS client_name,
               COALESCE(NULLIF(TRIM(CONCAT(COALESCE(w.first_name,''),' ',COALESCE(w.last_name,''))),''),w.email) AS worker_name
        FROM escrows e JOIN services s ON s.id=e.service_id
        LEFT JOIN users c ON c.id=e.client_id LEFT JOIN users w ON w.id=e.worker_id
        WHERE e.status='PENDIENTE_APROBACION' AND COALESCE(s.completion_submitted,false)=true
        ORDER BY COALESCE(s.completion_submitted_at,e.created_at) ASC
    """)).mappings().all()
    items=[]
    for r in rows:
        item=dict(r); item["amount_rd"]=float(r["total_amount_rd"] or 0); item["payout_rd"]=float(r["worker_payout_rd"] or 0); item["commission_rd"]=float(r["commission_amount_rd"] or 0); item["display_title"]=f"{r['client_name'] or 'Cliente'} — {r['title'] or 'Servicio'}"; items.append(item)
    return {"pending_releases":items,"summary":{"count":len(items),"pending_total_rd":sum(x["amount_rd"] for x in items)}}


@router.post("/escrows/{service_id}/approve-deposit")
def approve_deposit(service_id:str,data:ReleaseApproval,admin_user:User=Depends(require_admin),db:Session=Depends(get_db)):
    escrow=db.execute(text("SELECT id,client_id,worker_id,total_amount_rd,status,voucher_url,bank_account_id FROM escrows WHERE service_id=:sid AND status='PENDIENTE_VERIFICACION' ORDER BY created_at DESC LIMIT 1 FOR UPDATE"),{"sid":service_id}).mappings().first()
    if not escrow: raise HTTPException(404,"No existe un depósito pendiente de verificación para este servicio.")
    if not escrow['voucher_url']: raise HTTPException(400,"No se puede confirmar el depósito sin voucher.")
    service=db.execute(text("SELECT id,status,worker_id FROM services WHERE id=:sid FOR UPDATE"),{"sid":service_id}).mappings().first()
    if not service: raise HTTPException(404,"Servicio no encontrado")
    if not service['worker_id']: raise HTTPException(400,"El servicio todavía no tiene trabajador seleccionado.")

    wallet=db.execute(text("SELECT id FROM wallets WHERE worker_id=:w FOR UPDATE"),{"w":escrow['worker_id']}).mappings().first()
    if not wallet:
        db.execute(text("INSERT INTO wallets (worker_id,available_balance,pending_custody_balance,total_earnings,total_commissions,total_withdrawn) VALUES (:w,0,0,0,0,0)"),{"w":escrow['worker_id']})
        wallet=db.execute(text("SELECT id FROM wallets WHERE worker_id=:w FOR UPDATE"),{"w":escrow['worker_id']}).mappings().one()

    total=float(escrow['total_amount_rd'] or 0)
    db.execute(text("UPDATE escrows SET status='RETENIDO',commission_rate_percent=10.0,commission_amount_rd=ROUND(:total*0.10,2),worker_payout_rd=ROUND(:total*0.90,2) WHERE id=:id"),{"id":escrow['id'],'total':total})
    # Verification creates custody, but does not start the work automatically.
    db.execute(text("UPDATE services SET status='TRABAJADOR_SELECCIONADO' WHERE id=:sid AND status IN ('PUBLICADA','RECIBIENDO_POSTULACIONES','TRABAJADOR_SELECCIONADO')"),{"sid":service_id})
    db.execute(text("UPDATE wallets SET pending_custody_balance=COALESCE(pending_custody_balance,0)+:amount WHERE id=:wid"),{"wid":wallet['id'],'amount':total})
    db.execute(text("UPDATE transactions SET status='RETENIDO' WHERE user_id=:u AND type='PAGO_CUSTODIA_TRANSFERENCIA' AND status='PENDIENTE_VERIFICACION' AND created_at=(SELECT MAX(created_at) FROM transactions WHERE user_id=:u AND type='PAGO_CUSTODIA_TRANSFERENCIA' AND status='PENDIENTE_VERIFICACION')"),{"u":escrow['client_id']})
    custody_ref=f"CUSTODY-{str(escrow['id'])[:8].upper()}"
    db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) SELECT :u,:amount,'CUSTODIA_TRABAJO','RETENIDO',:ref,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE user_id=:u AND reference_code=:ref)"),{"u":escrow['worker_id'],"amount":total,"ref":custody_ref})
    _notify(db,escrow['client_id'],'Depósito verificado por Administración',f"Administración confirmó que llegaron RD$ {total:,.2f}. El dinero ahora está en Custodia SERVIYA.",'DEPOSIT_VERIFIED',service_id)
    _notify(db,escrow['worker_id'],'Dinero recibido en Custodia SERVIYA',f"Administración confirmó RD$ {total:,.2f} en Custodia. Inicia el trabajo desde tu panel; el dinero no estará disponible para retiro hasta la liberación administrativa.",'PAYMENT',service_id)
    _audit(db,admin_user.id,'ADMIN_VERIFY_DEPOSIT',escrow['id'],f"service_id={service_id}; {data.notes or 'Depósito verificado por Administración.'}")
    db.commit()
    return {"message":"Depósito verificado y fondos puestos en Custodia SERVIYA.","status":"RETENIDO","approved_by_admin":True,"service_status":"TRABAJADOR_SELECCIONADO","worker_wallet_custody_rd":total,"custody_reference":custody_ref}


@router.post("/escrows/{service_id}/reject-deposit")
def reject_deposit(service_id:str,data:ReleaseApproval,admin_user:User=Depends(require_admin),db:Session=Depends(get_db)):
    escrow=db.execute(text("SELECT id,client_id,total_amount_rd FROM escrows WHERE service_id=:sid AND status='PENDIENTE_VERIFICACION' ORDER BY created_at DESC LIMIT 1 FOR UPDATE"),{"sid":service_id}).mappings().first()
    if not escrow: raise HTTPException(404,"No existe un depósito pendiente de verificación para este servicio.")
    db.execute(text("UPDATE escrows SET status='RECHAZADO' WHERE id=:id"),{"id":escrow['id']})
    _notify(db,escrow['client_id'],'Voucher rechazado','Administración no pudo confirmar la llegada del depósito. El dinero no está en Custodia SERVIYA.','DEPOSIT_REJECTED',service_id)
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
    total=float(escrow['total_amount_rd'] or 0); commission=round(total*0.10,2); payout=round(total-commission,2); now=datetime.utcnow()
    db.execute(text("UPDATE escrows SET status='LIBERADO',commission_rate_percent=10.0,commission_amount_rd=:c,worker_payout_rd=:p,released_at=:now,otp_verified=true WHERE id=:id"),{"id":escrow['id'],'now':now,'c':commission,'p':payout})
    db.execute(text("UPDATE wallets SET available_balance=COALESCE(available_balance,0)+:p,pending_custody_balance=GREATEST(COALESCE(pending_custody_balance,0)-:t,0),total_earnings=COALESCE(total_earnings,0)+:p,total_commissions=COALESCE(total_commissions,0)+:c WHERE id=:id"),{"id":worker_wallet['id'],'p':payout,'t':total,'c':commission})
    release_ref=f"ADMIN-RELEASE-{service_id[:8].upper()}"
    db.execute(text("INSERT INTO wallet_transactions (id,wallet_id,user_id,type,amount_rd,description,reference,status,created_at) SELECT :id,:wid,:u,'LIBERACION_ADMIN',:p,:d,:ref,'EXITOSO',CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE reference=:ref)"),{"id":str(uuid.uuid4()),"wid":worker_wallet['id'],"u":escrow['worker_id'],"p":payout,"d":f"Liberación administrativa del servicio {service_id}","ref":release_ref})
    db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) SELECT :u,:p,'LIBERACION_ADMIN','COMPLETADO',:ref,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE user_id=:u AND reference_code=:ref)"),{"u":escrow['worker_id'],"p":payout,"ref":release_ref})
    db.execute(text("UPDATE services SET status='COMPLETADA' WHERE id=:sid"),{"sid":service_id})
    warranty=db.execute(text("SELECT id FROM service_warranties WHERE service_id=:sid LIMIT 1"),{"sid":service_id}).scalar()
    if not warranty:
        expires=now+timedelta(days=60); ref=f"GAR-SRV-{service_id[:8].upper()}"; db.execute(text("INSERT INTO service_warranties (id,service_id,client_id,worker_id,coverage_days,status,activated_at,expires_at,certificate_ref) VALUES (:id,:sid,:c,:w,60,'ACTIVA',:now,:exp,:ref)"),{"id":str(uuid.uuid4()),"sid":service_id,"c":escrow['client_id'],'w':escrow['worker_id'],'now':now,'exp':expires,'ref':ref})
    _notify(db,escrow['worker_id'],'Pago liberado por administración',f"Administración aprobó la liberación de RD$ {payout:,.2f}.",'PAYMENT_RELEASED',service_id)
    _notify(db,escrow['client_id'],'Pago aprobado y garantía activa','Administración aprobó la liquidación y activó la garantía SERVIYA por 60 días.','PAYMENT_ADMIN_APPROVED',service_id)
    _audit(db,admin_user.id,'ADMIN_APPROVE_RELEASE',escrow['id'],f"service_id={service_id}; {data.notes or 'Liberación aprobada por Administración.'}")
    db.commit()
    return {"message":"Fondos liberados correctamente y garantía de 60 días activada.","status":"LIBERADO","worker_payout_rd":payout,"commission_rd":commission,"service_status":"COMPLETADA"}


@router.post("/escrows/{service_id}/hold-release")
def hold_release(service_id:str,data:ReleaseApproval,admin_user:User=Depends(require_admin),db:Session=Depends(get_db)):
    escrow=db.execute(text("SELECT id,client_id,worker_id,total_amount_rd,status FROM escrows WHERE service_id=:sid AND status='PENDIENTE_APROBACION' ORDER BY created_at DESC LIMIT 1 FOR UPDATE"),{"sid":service_id}).mappings().first()
    if not escrow: raise HTTPException(404,"No existe una liberación pendiente para este servicio.")
    notes=(data.notes or '').strip()
    if not notes: raise HTTPException(400,"Debes indicar el motivo para mantener el dinero en Custodia.")
    db.execute(text("UPDATE escrows SET status='RETENIDO' WHERE id=:id"),{"id":escrow['id']})
    _notify(db,escrow['worker_id'],'Pago mantenido en Custodia',f"Administración decidió no liberar todavía los fondos del servicio. Motivo: {notes}",'PAYMENT_HOLD',service_id)
    _notify(db,escrow['client_id'],'Fondos mantenidos en Custodia',f"Administración mantiene los fondos en Custodia SERVIYA. Motivo: {notes}",'PAYMENT_HOLD',service_id)
    _audit(db,admin_user.id,'ADMIN_HOLD_RELEASE',escrow['id'],f"service_id={service_id}; Motivo: {notes}")
    db.commit()
    return {"message":"Los fondos permanecen en Custodia SERVIYA.","status":"RETENIDO"}
