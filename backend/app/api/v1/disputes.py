from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import Dispute, Service, Escrow, ServiceStatusEnum, DisputeStatusEnum, User

router = APIRouter(prefix="/disputes", tags=["Disputas y Reclamos"])

class CreateDisputeSchema(BaseModel):
    service_id: str
    reason: str
    description: str

@router.get("")
def list_disputes(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str == "ADMIN":
        disputes = db.query(Dispute).order_by(Dispute.created_at.desc()).all()
    else:
        disputes = db.query(Dispute).filter(
            (Dispute.opened_by_user_id == current_user.id) | (Dispute.against_user_id == current_user.id)
        ).order_by(Dispute.created_at.desc()).all()

    results = []
    for d in disputes:
        service = db.query(Service).filter(Service.id == d.service_id).first()
        status_str = d.status.value if hasattr(d.status, "value") else str(d.status)
        results.append({
            "id": d.id,
            "service_id": d.service_id,
            "service_title": service.title if service else "Servicio SERVIYA",
            "reason": d.reason,
            "description": d.description,
            "status": status_str,
            "created_at": str(d.created_at)
        })
    return {"disputes": results}

@router.post("")
def create_dispute(
    data: CreateDisputeSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    service = db.query(Service).filter(Service.id == data.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    against_user_id = service.worker_id if current_user.id == service.client_id else service.client_id
    if not against_user_id:
        against_user_id = "sistema"

    dispute = Dispute(
        service_id=data.service_id,
        opened_by_user_id=current_user.id,
        against_user_id=against_user_id,
        reason=data.reason,
        description=data.description,
        status=DisputeStatusEnum.ABIERTA
    )
    db.add(dispute)

    # Protect Escrow
    escrow = db.query(Escrow).filter(
        Escrow.service_id == service.id,
        Escrow.status == "RETENIDO"
    ).first()
    if escrow:
        escrow.status = "EN_DISPUTA"

    service.status = ServiceStatusEnum.EN_DISPUTA

    db.commit()
    db.refresh(dispute)

    return {
        "message": "Disputa abierta exitosamente. El pago en custodia ha sido congelado y enviado a mediación.",
        "dispute": {
            "id": dispute.id,
            "service_id": dispute.service_id,
            "status": dispute.status.value if hasattr(dispute.status, "value") else str(dispute.status)
        }
    }
