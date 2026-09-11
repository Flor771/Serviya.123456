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

@router.patch("/withdrawals/{withdrawal_id}")
def update_withdrawal_status(withdrawal_id: int, data: WithdrawalStatusBody, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    requested = str(data.status or "").strip().upper()
    if requested not in {"COMPLETADO", "RECHAZADO"}:
        raise HTTPException(400, "Estado de retiro no válido. Use COMPLETADO o RECHAZADO.")
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

    if requested == "COMPLETADO":
        db.execute(text("UPDATE withdrawals SET status='COMPLETADO' WHERE id=:id"), {"id": withdrawal_id})
        db.execute(text("UPDATE wallets SET total_withdrawn=COALESCE(total_withdrawn,0)+:amount WHERE id=:wallet_id"), {"amount": amount, "wallet_id": wallet["id"]})
        db.execute(text("UPDATE transactions SET status='COMPLETADO' WHERE user_id=:uid AND type='RETIRO' AND status='PENDIENTE' AND reference_code=:reference"), {"uid": row["worker_id"], "reference": row["reference_code"]})
        message = "Retiro confirmado: Administración confirmó el pago a la cuenta bancaria registrada."
        action = "WITHDRAWAL_CONFIRMED"
    else:
        db.execute(text("UPDATE withdrawals SET status='RECHAZADO' WHERE id=:id"), {"id": withdrawal_id})
        db.execute(text("UPDATE wallets SET available_balance=COALESCE(available_balance,0)+:amount WHERE id=:wallet_id"), {"amount": amount, "wallet_id": wallet["id"]})
        db.execute(text("UPDATE transactions SET status='RECHAZADO' WHERE user_id=:uid AND type='RETIRO' AND status='PENDIENTE' AND reference_code=:reference"), {"uid": row["worker_id"], "reference": row["reference_code"]})
        message = "Tu solicitud de retiro fue rechazada por Administración. El saldo fue devuelto a tu Billetera SERVIYA."
        action = "WITHDRAWAL_REJECTED"

    db.execute(text("INSERT INTO notifications (id,user_id,title,message,type,read,related_entity_id,created_at) VALUES (gen_random_uuid()::text,:uid,:title,:message,'RETIRO',false,:related,CURRENT_TIMESTAMP)"), {"uid": row["worker_id"], "title": "Retiro actualizado", "message": message, "related": str(withdrawal_id)})
    db.execute(text("INSERT INTO admin_audit_logs (admin_id,action,resource,target_id,details,timestamp) VALUES (:aid,:action,'withdrawals',:id,:details,CURRENT_TIMESTAMP)"), {"aid": admin_user.id, "action": action, "id": withdrawal_id, "details": (data.notes or message) + f" | Banco: {row['method']} | Cuenta: {row['account_number']} | Referencia: {row['reference_code'] or withdrawal_id}"})
    db.commit()
    return {"message": message, "withdrawal_id": withdrawal_id, "status": requested, "recipient": {"worker_id": row["worker_id"], "name": f"{worker['first_name']} {worker['last_name']}" if worker else None, "bank_name": row["method"], "account_type": row["account_type"], "account_number": row["account_number"], "account_holder_name": row["account_holder_name"], "reference": row["reference_code"]}}
