from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.models.models import User

router = APIRouter(prefix="/admin", tags=["Retiros administrativos"])

class WithdrawalStatusBody(BaseModel):
    status: str
    notes: str | None = None


def _process_completed(withdrawal_id: int, admin_user: User, db: Session):
    row = db.execute(text("SELECT id, worker_id, amount, status, method, account_number, account_type, account_holder_name, account_holder_cedula, bank_account_id, reference_code FROM withdrawals WHERE id=:id FOR UPDATE"), {"id": withdrawal_id}).mappings().first()
    if not row:
        raise HTTPException(404, "Solicitud de retiro no encontrada.")
    if row["status"] != "PENDIENTE":
        raise HTTPException(409, "El retiro ya fue procesado y no puede confirmarse nuevamente.")
    worker = db.execute(text("SELECT id, first_name, last_name, phone, email FROM users WHERE id=:id"), {"id": row["worker_id"]}).mappings().first()
    amount = float(row["amount"] or 0)
    wallet = db.execute(text("SELECT id FROM wallets WHERE worker_id=:worker_id FOR UPDATE"), {"worker_id": row["worker_id"]}).mappings().first()
    if not wallet:
        raise HTTPException(400, "El trabajador no tiene billetera.")

    # El saldo disponible ya fue descontado al solicitar el retiro.
    db.execute(text("UPDATE withdrawals SET status='COMPLETADO' WHERE id=:id"), {"id": withdrawal_id})
    db.execute(text("UPDATE wallets SET total_withdrawn=COALESCE(total_withdrawn,0)+:amount WHERE id=:wallet_id"), {"amount": amount, "wallet_id": wallet["id"]})
    db.execute(text("UPDATE transactions SET status='COMPLETADO' WHERE user_id=:uid AND type='RETIRO' AND status='PENDIENTE' AND reference_code=:reference"), {"uid": row["worker_id"], "reference": row["reference_code"]})
    process_ref = f"WITHDRAWAL-{withdrawal_id}"
    db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) SELECT :uid,:amount,'RETIRO_PROCESADO','COMPLETADO',:ref,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE reference_code=:ref)"), {"uid": row["worker_id"], "amount": amount, "ref": process_ref})
    db.execute(text("INSERT INTO wallet_transactions (wallet_id,user_id,type,amount_rd,description,reference,status,created_at) SELECT :wallet_id,:uid,'RETIRO_PROCESADO',:amount,:description,:ref,'EXITOSO',CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE reference=:ref)"), {"wallet_id": wallet["id"], "uid": row["worker_id"], "amount": amount, "description": f"Retiro {withdrawal_id} confirmado por Administración.", "ref": process_ref})
    db.execute(text("INSERT INTO financial_movements (wallet_id,movement_type,amount_dop,description,created_at) SELECT :wallet_id,'RETIRO_PROCESADO',:amount,:description,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM financial_movements WHERE wallet_id=:wallet_id AND movement_type='RETIRO_PROCESADO' AND description=:description)"), {"wallet_id": wallet["id"], "amount": -amount, "description": f"Retiro {withdrawal_id} confirmado por Administración."})
    db.execute(text("INSERT INTO admin_audit_logs (admin_id,action,resource,target_id,details,timestamp) VALUES (:aid,'WITHDRAWAL_CONFIRMED','withdrawals',:id,:details,CURRENT_TIMESTAMP)"), {"aid": admin_user.id, "id": withdrawal_id, "details": f"Retiro procesado por RD$ {amount:,.2f}"})
    db.execute(text("INSERT INTO notifications (id,user_id,title,message,type,read,related_entity_id,created_at) VALUES (gen_random_uuid()::text,:uid,'Retiro procesado','Tu retiro fue marcado como completado.','RETIRO',false,:related,CURRENT_TIMESTAMP)"), {"uid": row["worker_id"], "related": str(withdrawal_id)})
    db.commit()
    return {"message": "Retiro marcado como COMPLETADO y registrado financieramente.", "withdrawal_id": withdrawal_id, "status": "COMPLETADO", "recipient": {"worker_id": row["worker_id"], "name": f"{worker['first_name']} {worker['last_name']}" if worker else None, "bank_name": row["method"], "account_type": row["account_type"], "account_number": row["account_number"], "account_holder_name": row["account_holder_name"], "reference": row["reference_code"]}}

@router.post("/withdrawals/{withdrawal_id}/process")
def process_withdrawal_compat(withdrawal_id: int, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return _process_completed(withdrawal_id, admin_user, db)

@router.patch("/withdrawals/{withdrawal_id}")
def update_withdrawal_status(withdrawal_id: int, data: WithdrawalStatusBody, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    requested = str(data.status or "").strip().upper()
    if requested not in {"COMPLETADO", "RECHAZADO"}:
        raise HTTPException(400, "Estado de retiro no válido. Use COMPLETADO o RECHAZADO.")
    if requested == "COMPLETADO":
        return _process_completed(withdrawal_id, admin_user, db)

    row = db.execute(text("SELECT id, worker_id, amount, status, method, account_number, account_type, account_holder_name, account_holder_cedula, bank_account_id, reference_code FROM withdrawals WHERE id=:id FOR UPDATE"), {"id": withdrawal_id}).mappings().first()
    if not row:
        raise HTTPException(404, "Solicitud de retiro no encontrada.")
    if row["status"] != "PENDIENTE":
        raise HTTPException(409, "El retiro ya fue procesado y no puede confirmarse nuevamente.")
    worker = db.execute(text("SELECT id, first_name, last_name, phone, email FROM users WHERE id=:id"), {"id": row["worker_id"]}).mappings().first()
    amount = float(row["amount"] or 0)
    wallet = db.execute(text("SELECT id FROM wallets WHERE worker_id=:worker_id FOR UPDATE"), {"worker_id": row["worker_id"]}).mappings().first()
    if not wallet:
        raise HTTPException(400, "El trabajador no tiene billetera.")
    db.execute(text("UPDATE withdrawals SET status='RECHAZADO' WHERE id=:id"), {"id": withdrawal_id})
    db.execute(text("UPDATE wallets SET available_balance=COALESCE(available_balance,0)+:amount WHERE id=:wallet_id"), {"amount": amount, "wallet_id": wallet["id"]})
    db.execute(text("UPDATE transactions SET status='RECHAZADO' WHERE user_id=:uid AND type='RETIRO' AND status='PENDIENTE' AND reference_code=:reference"), {"uid": row["worker_id"], "reference": row["reference_code"]})
    reject_ref = f"WITHDRAWAL-REJECT-{withdrawal_id}"
    db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) SELECT :uid,:amount,'RETIRO_RECHAZADO','COMPLETADO',:ref,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE reference_code=:ref)"), {"uid": row["worker_id"], "amount": amount, "ref": reject_ref})
    db.execute(text("INSERT INTO wallet_transactions (wallet_id,user_id,type,amount_rd,description,reference,status,created_at) SELECT :wallet_id,:uid,'RETIRO_RECHAZADO',:amount,:description,:ref,'EXITOSO',CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE reference=:ref)"), {"wallet_id": wallet["id"], "uid": row["worker_id"], "amount": amount, "description": f"Saldo devuelto por retiro rechazado {withdrawal_id}.", "ref": reject_ref})
    db.execute(text("INSERT INTO financial_movements (wallet_id,movement_type,amount_dop,description,created_at) SELECT :wallet_id,'RETIRO_RECHAZADO',:amount,:description,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM financial_movements WHERE wallet_id=:wallet_id AND movement_type='RETIRO_RECHAZADO' AND description=:description)"), {"wallet_id": wallet["id"], "amount": amount, "description": f"Saldo devuelto por retiro rechazado {withdrawal_id}."})
    message = "Tu solicitud de retiro fue rechazada por Administración. El saldo fue devuelto a tu Billetera SERVIYA."
    db.execute(text("INSERT INTO notifications (id,user_id,title,message,type,read,related_entity_id,created_at) VALUES (gen_random_uuid()::text,:uid,'Retiro actualizado',:message,'RETIRO',false,:related,CURRENT_TIMESTAMP)"), {"uid": row["worker_id"], "message": message, "related": str(withdrawal_id)})
    db.execute(text("INSERT INTO admin_audit_logs (admin_id,action,resource,target_id,details,timestamp) VALUES (:aid,'WITHDRAWAL_REJECTED','withdrawals',:id,:details,CURRENT_TIMESTAMP)"), {"aid": admin_user.id, "id": withdrawal_id, "details": (data.notes or message) + f" | Banco: {row['method']} | Cuenta: {row['account_number']} | Referencia: {row['reference_code'] or withdrawal_id}"})
    db.commit()
    return {"message": message, "withdrawal_id": withdrawal_id, "status": "RECHAZADO", "recipient": {"worker_id": row["worker_id"], "name": f"{worker['first_name']} {worker['last_name']}" if worker else None, "bank_name": row["method"], "account_type": row["account_type"], "account_number": row["account_number"], "account_holder_name": row["account_holder_name"], "reference": row["reference_code"]}}