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


def _notify(db, user_id, title, message, kind):
    if user_id:
        db.execute(text("INSERT INTO notifications (user_id,title,message,type,is_read,created_at) VALUES (:u,:t,:m,:k,false,CURRENT_TIMESTAMP)"), {"u": user_id, "t": title, "m": message, "k": kind})


def _audit(db, admin_id, action, service_id, notes):
    db.execute(text("INSERT INTO admin_audit_logs (admin_id,action,resource,target_id,details,timestamp) VALUES (:a,:action,'escrows',:id,:details,CURRENT_TIMESTAMP)"), {"a": admin_id, "action": action, "id": service_id, "details": notes or "Aprobación administrativa de liberación"})


@router.post("/escrows/{service_id}/approve-release")
def approve_release(service_id: str, data: ReleaseApproval, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    escrow = db.execute(text("SELECT id,client_id,worker_id,total_amount_rd,commission_amount_rd,worker_payout_rd,status FROM escrows WHERE service_id=:sid AND status='PENDIENTE_APROBACION' ORDER BY created_at DESC LIMIT 1 FOR UPDATE"), {"sid": service_id}).mappings().first()
    if not escrow:
        raise HTTPException(404, "No existe una custodia pendiente de aprobación para este servicio.")
    service = db.execute(text("SELECT id,status,completion_submitted FROM services WHERE id=:sid FOR UPDATE"), {"sid": service_id}).mappings().first()
    if not service:
        raise HTTPException(404, "Servicio no encontrado")
    if not service["completion_submitted"]:
        raise HTTPException(400, "El trabajador todavía no ha enviado el trabajo a revisión.")

    worker_wallet = db.execute(text("SELECT id FROM wallets WHERE worker_id=:w FOR UPDATE"), {"w": escrow["worker_id"]}).mappings().first()
    if not worker_wallet:
        db.execute(text("INSERT INTO wallets (worker_id,available_balance,pending_custody_balance,total_earnings,total_commissions,total_withdrawn) VALUES (:w,0,0,0,0,0)"), {"w": escrow["worker_id"]})
        worker_wallet = db.execute(text("SELECT id FROM wallets WHERE worker_id=:w FOR UPDATE"), {"w": escrow["worker_id"]}).mappings().one()

    payout = float(escrow["worker_payout_rd"] or 0)
    commission = float(escrow["commission_amount_rd"] or 0)
    now = datetime.utcnow()
    db.execute(text("UPDATE escrows SET status='LIBERADO',released_at=:now,otp_verified=true WHERE id=:id"), {"id": escrow["id"], "now": now})
    db.execute(text("UPDATE wallets SET available_balance=COALESCE(available_balance,0)+:p,total_earnings=COALESCE(total_earnings,0)+:p,total_commissions=COALESCE(total_commissions,0)+:c WHERE id=:id"), {"id": worker_wallet["id"], "p": payout, "c": commission})
    db.execute(text("INSERT INTO financial_movements (wallet_id,contract_id,movement_type,amount_dop,description,created_at) VALUES (:w,NULL,'LIBERACION_ADMIN',:p,:d,CURRENT_TIMESTAMP)"), {"w": worker_wallet["id"], "p": payout, "d": f"Liberación administrativa del servicio {service_id}"})
    db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) VALUES (:u,:p,'LIBERACION_ADMIN','COMPLETADO',:ref,CURRENT_TIMESTAMP)"), {"u": escrow["worker_id"], "p": payout, "ref": f"ADMIN-RELEASE-{service_id[:8].upper()}"})
    db.execute(text("UPDATE services SET status='COMPLETADA' WHERE id=:sid"), {"sid": service_id})

    warranty = db.execute(text("SELECT id FROM service_warranties WHERE service_id=:sid LIMIT 1"), {"sid": service_id}).scalar()
    if not warranty:
        expires = now + timedelta(days=60)
        ref = f"GAR-SRV-{service_id[:8].upper()}"
        db.execute(text("INSERT INTO service_warranties (id,service_id,client_id,worker_id,coverage_days,status,activated_at,expires_at,certificate_ref) VALUES (:id,:sid,:c,:w,60,'ACTIVA',:now,:exp,:ref)"), {"id": str(uuid.uuid4()), "sid": service_id, "c": escrow["client_id"], "w": escrow["worker_id"], "now": now, "exp": expires, "ref": ref})

    _notify(db, escrow["worker_id"], "Pago liberado por administración", f"Administración aprobó la liberación de RD$ {payout:,.2f}.", "PAYMENT_RELEASED")
    _notify(db, escrow["client_id"], "Pago aprobado y garantía activa", "Administración aprobó la liquidación y activó la garantía SERVIYA por 60 días.", "PAYMENT_ADMIN_APPROVED")
    _audit(db, admin_user.id, "ADMIN_APPROVE_RELEASE", service_id, data.notes)
    db.commit()
    return {"message": "Liberación aprobada por administración.", "worker_payout_rd": payout, "commission_rd": commission, "status": "LIBERADO", "approved_by_admin": True, "warranty_days": 60}
