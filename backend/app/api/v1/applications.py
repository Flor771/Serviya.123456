from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import Application, Service, ServiceStatusEnum, ApplicationStatusEnum, Notification, User, UserRoleEnum

router = APIRouter(prefix="/applications", tags=["Postulaciones"])

class CreateApplicationSchema(BaseModel):
    service_id: str
    message: str
    offered_price_rd: float
    availability_note: Optional[str] = None

class StartServiceSchema(BaseModel):
    note: Optional[str] = None

@router.post("")
def apply_to_service(data: CreateApplicationSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != UserRoleEnum.TRABAJADOR.value:
        raise HTTPException(status_code=403, detail="Solo los trabajadores pueden postularse a servicios")
    service = db.query(Service).filter(Service.id == data.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if service.client_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes postularte a tu propio servicio")
    if service.status not in (ServiceStatusEnum.PUBLICADA, ServiceStatusEnum.RECIBIENDO_POSTULACIONES):
        raise HTTPException(status_code=400, detail="Este servicio ya no está recibiendo postulaciones")
    if data.offered_price_rd <= 0:
        raise HTTPException(status_code=400, detail="El precio ofrecido debe ser mayor que RD$0")
    existing = db.query(Application).filter(Application.service_id == data.service_id, Application.worker_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya se ha postulado previamente a este servicio.")
    application = Application(service_id=data.service_id, worker_id=current_user.id, message=data.message, offered_price_rd=data.offered_price_rd, availability_note=data.availability_note, status=ApplicationStatusEnum.PENDIENTE)
    db.add(application)
    if service.status == ServiceStatusEnum.PUBLICADA:
        service.status = ServiceStatusEnum.RECIBIENDO_POSTULACIONES
    db.add(Notification(
        user_id=service.client_id,
        title="Nueva postulación recibida",
        message=f"{current_user.first_name} {current_user.last_name} se postuló a tu servicio: {service.title}.",
        type="NUEVA_POSTULACION",
        related_entity_id=service.id,
    ))
    db.commit(); db.refresh(application)
    return {"message": "Postulación enviada exitosamente", "application": {"id": application.id, "service_id": application.service_id, "offered_price_rd": application.offered_price_rd, "status": application.status.value if hasattr(application.status, "value") else str(application.status)}}

@router.post("/{id}/select")
def select_application(id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    app_item = db.query(Application).filter(Application.id == id).first()
    if not app_item:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
    service = db.query(Service).filter(Service.id == app_item.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if service.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solamente el cliente creador puede seleccionar técnico")
    if service.worker_id:
        raise HTTPException(status_code=400, detail="Este servicio ya tiene un técnico seleccionado")
    if app_item.status != ApplicationStatusEnum.PENDIENTE:
        raise HTTPException(status_code=400, detail="Esta postulación ya no está disponible para selección")
    app_item.status = ApplicationStatusEnum.SELECCIONADO
    service.worker_id = app_item.worker_id
    service.status = ServiceStatusEnum.TRABAJADOR_SELECCIONADO
    db.add(Notification(
        user_id=app_item.worker_id,
        title="Has sido seleccionado",
        message=f"Fuiste seleccionado para el servicio: {service.title}. Cuando el depósito esté en Custodia SERVIYA podrás iniciar el trabajo.",
        type="TRABAJADOR_SELECCIONADO",
        related_entity_id=service.id,
    ))
    db.query(Application).filter(Application.service_id == service.id, Application.id != app_item.id, Application.status == ApplicationStatusEnum.PENDIENTE).update({Application.status: ApplicationStatusEnum.RECHAZADO}, synchronize_session=False)
    db.commit()
    return {"message": "Técnico seleccionado exitosamente para el servicio", "service_id": service.id, "worker_id": app_item.worker_id}

@router.post("/service/{service_id}/start")
def start_service(service_id: str, data: StartServiceSchema = StartServiceSchema(), current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).with_for_update().first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if service.worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo el técnico asignado puede iniciar este trabajo")
    st = service.status.value if hasattr(service.status, "value") else str(service.status)
    if st != "EN_PROGRESO":
        raise HTTPException(status_code=400, detail="El trabajo puede iniciarse cuando el cliente haya depositado el pago en Custodia SERVIYA")
    db.add(Notification(user_id=service.client_id, title="Trabajo iniciado", message=f"El técnico {current_user.first_name} {current_user.last_name} inició el trabajo: {service.title}.", type="SERVICE_STARTED", related_entity_id=service.id))
    db.commit()
    return {"message": "Trabajo iniciado. Ya puedes subir fotos de evidencia y coordinar por mensajes.", "service_id": service.id, "status": "EN_PROGRESO", "note": data.note}
