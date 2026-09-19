from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import User

router = APIRouter(prefix="/disputes", tags=["Disputas y Reclamos"])

class CreateDisputeSchema(BaseModel):
    service_id: str
    reason: str
    description: str


def _role(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


@router.get("")
def list_disputes(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if _role(current_user) == "ADMIN":
        rows = db.execute(text("""
            SELECT id, service_id, reason, description, status, created_at,
                   opened_by_user_id, against_user_id, resolution_notes
            FROM disputes
            WHERE service_id IS NOT NULL
            ORDER BY created_at DESC
        """)).mappings().all()
    else:
        rows = db.execute(text("""
            SELECT id, service_id, reason, description, status, created_at,
                   opened_by_user_id, against_user_id, resolution_notes
            FROM disputes
            WHERE service_id IS NOT NULL
              AND (opened_by_user_id = :uid OR against_user_id = :uid)
            ORDER BY created_at DESC
        """), {"uid": current_user.id}).mappings().all()

    results = []
    for row in rows:
        title = db.execute(text("SELECT title FROM services WHERE id = :sid"), {"sid": row["service_id"]}).scalar()
        results.append({
            "id": row["id"],
            "service_id": row["service_id"],
            "service_title": title or "Servicio SERVIYA",
            "reason": row["reason"],
            "description": row["description"],
            "status": row["status"],
            "resolution_notes": row["resolution_notes"],
            "created_at": str(row["created_at"]),
        })
    return {"disputes": results}


@router.post("")
def create_dispute(
    data: CreateDisputeSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    service = db.execute(text("""
        SELECT id, client_id, worker_id, status
        FROM services WHERE id = :sid
    """), {"sid": data.service_id}).mappings().first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    if current_user.id not in {service["client_id"], service["worker_id"]}:
        raise HTTPException(status_code=403, detail="Solo el cliente o trabajador asignado puede abrir una disputa")
    if not service["worker_id"]:
        raise HTTPException(status_code=400, detail="El servicio todavía no tiene trabajador asignado")

    existing = db.execute(text("""
        SELECT id FROM disputes
        WHERE service_id = :sid AND status IN ('ABIERTA','EN_REVISION')
        LIMIT 1
    """), {"sid": data.service_id}).scalar()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe una disputa activa para este servicio")

    against_user_id = service["worker_id"] if current_user.id == service["client_id"] else service["client_id"]

    dispute_id = db.execute(text("""
        INSERT INTO disputes
            (service_id, opened_by_user_id, against_user_id, reason, description, status, created_at)
        VALUES (:sid, :opened, :against, :reason, :description, 'ABIERTA', :created_at)
        RETURNING id
    """), {
        "sid": data.service_id,
        "opened": current_user.id,
        "against": against_user_id,
        "reason": data.reason,
        "description": data.description,
        "created_at": datetime.utcnow(),
    }).scalar_one()

    escrow = db.execute(text("""
        UPDATE escrows
        SET status = 'EN_DISPUTA'
        WHERE service_id = :sid AND status = 'RETENIDO'
        RETURNING id
    """), {"sid": data.service_id}).first()
    if not escrow:
        db.rollback()
        raise HTTPException(status_code=400, detail="No existe un pago en custodia activo para este servicio")

    db.execute(text("UPDATE services SET status = 'EN_DISPUTA' WHERE id = :sid"), {"sid": data.service_id})
    db.execute(text("""
        INSERT INTO notifications (id, user_id, title, message, type, read, related_entity_id, created_at)
        VALUES (:id, :uid, :title, :message, :type, false, :related, :created_at)
    """), {
        "id": __import__("uuid").uuid4().hex,
        "uid": against_user_id,
        "title": "Disputa abierta",
        "message": "Se abrió una disputa sobre un servicio. El pago en custodia fue congelado.",
        "type": "DISPUTA",
        "related": str(dispute_id),
        "created_at": datetime.utcnow(),
    })
    db.commit()

    return {
        "message": "Disputa abierta exitosamente. El pago en custodia ha sido congelado y enviado a mediación.",
        "dispute": {"id": dispute_id, "service_id": data.service_id, "status": "ABIERTA"}
    }
