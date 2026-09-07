from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import Application, Service, ServiceStatusEnum, ApplicationStatusEnum, User

router = APIRouter(prefix="/applications", tags=["Postulaciones"])

class CreateApplicationSchema(BaseModel):
    service_id: str
    message: str
    offered_price_rd: float
    availability_note: Optional[str] = None

@router.post("")
def apply_to_service(
    data: CreateApplicationSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    service = db.query(Service).filter(Service.id == data.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    # Check for duplicate application
    existing = db.query(Application).filter(
        Application.service_id == data.service_id,
        Application.worker_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya se ha postulado previamente a este servicio.")

    application = Application(
        service_id=data.service_id,
        worker_id=current_user.id,
        message=data.message,
        offered_price_rd=data.offered_price_rd,
        availability_note=data.availability_note,
        status=ApplicationStatusEnum.PENDIENTE
    )
    db.add(application)
    
    if service.status == ServiceStatusEnum.PUBLICADA:
        service.status = ServiceStatusEnum.RECIBIENDO_POSTULACIONES

    db.commit()
    db.refresh(application)

    return {
        "message": "Postulación enviada exitosamente",
        "application": {
            "id": application.id,
            "service_id": application.service_id,
            "offered_price_rd": application.offered_price_rd,
            "status": application.status.value if hasattr(application.status, "value") else str(application.status)
        }
    }

@router.post("/{id}/select")
def select_application(
    id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    app_item = db.query(Application).filter(Application.id == id).first()
    if not app_item:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")

    service = db.query(Service).filter(Service.id == app_item.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    if service.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solamente el cliente creador puede seleccionar técnico")

    app_item.status = ApplicationStatusEnum.SELECCIONADO
    service.worker_id = app_item.worker_id
    service.status = ServiceStatusEnum.TRABAJADOR_SELECCIONADO

    db.commit()
    return {
        "message": "Técnico seleccionado exitosamente para el servicio",
        "service_id": service.id,
        "worker_id": app_item.worker_id
    }
