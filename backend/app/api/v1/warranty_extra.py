from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_active_user
from app.models.models import User

router = APIRouter(prefix="/completion", tags=["Garantía SERVIYA"])

@router.get("/{service_id}/warranty")
def get_warranty(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT w.id,w.service_id,w.client_id,w.worker_id,w.coverage_days,w.status,w.activated_at,w.expires_at,w.certificate_ref,
               s.title,s.negotiated_price_rd,s.status AS service_status,
               COALESCE(NULLIF(TRIM(CONCAT(COALESCE(c.first_name,''),' ',COALESCE(c.last_name,''))),''),c.email) AS client_name,
               COALESCE(NULLIF(TRIM(CONCAT(COALESCE(wu.first_name,''),' ',COALESCE(wu.last_name,''))),''),wu.email) AS worker_name
        FROM service_warranties w
        JOIN services s ON s.id=w.service_id
        LEFT JOIN users c ON c.id=w.client_id
        LEFT JOIN users wu ON wu.id=w.worker_id
        WHERE w.service_id=:sid
        ORDER BY w.activated_at DESC NULLS LAST LIMIT 1
    """), {"sid": service_id}).mappings().first()
    if not row:
        raise HTTPException(404, "Este servicio todavía no tiene una garantía registrada.")
    if current_user.id not in {row["client_id"], row["worker_id"]}:
        raise HTTPException(403, "No tienes acceso a esta garantía.")

    expires_at = row["expires_at"]
    expired = bool(expires_at and expires_at < datetime.utcnow())
    status = "VENCIDA" if expired else str(row["status"] or "ACTIVA")
    revisits = []
    try:
        revisits = [dict(r) for r in db.execute(text("""
            SELECT id,issue,description,status,scheduled_at,resolution_notes,created_at,updated_at,resolved_at
            FROM warranty_revisits WHERE service_id=:sid ORDER BY created_at DESC
        """), {"sid": service_id}).mappings().all()]
    except Exception:
        revisits = []

    return {
        "warranty": {
            "id": row["id"], "service_id": row["service_id"], "certificate_ref": row["certificate_ref"],
            "coverage_days": 15 if not expired else row["coverage_days"], "status": status,
            "activated_at": row["activated_at"], "expires_at": row["expires_at"],
            "client_name": row["client_name"], "worker_name": row["worker_name"],
            "service_title": row["title"], "service_status": row["service_status"],
            "amount_rd": float(row["negotiated_price_rd"] or 0), "expired": expired,
        },
        "revisits": revisits,
    }
