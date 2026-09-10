from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_active_user
from app.models.models import Service, User, UserRoleEnum

router = APIRouter(prefix="/work-status", tags=["Estado del trabajo"])

ALLOWED = {
    "EN_CAMINO": "En camino",
    "TRABAJANDO": "Trabajando",
    "PAUSADO": "Trabajo pausado",
    "FINALIZANDO": "Finalizando trabajo",
}

class WorkStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = Field(default=None, max_length=500)

def role(u):
    return u.role.value if hasattr(u.role, "value") else str(u.role)

def ensure_access(service: Service, user: User):
    if user.id not in {service.client_id, service.worker_id}:
        raise HTTPException(403, "No tienes acceso al estado de este trabajo")

@router.get("/{service_id}")
def get_work_status(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(404, "Servicio no encontrado")
    ensure_access(service, current_user)
    rows = db.execute(text("SELECT status, note, changed_by_user_id, created_at FROM service_work_status_history WHERE service_id=:sid ORDER BY created_at DESC, id DESC LIMIT 20"), {"sid": service_id}).mappings().all()
    history = [dict(r) for r in rows]
    if not history:
        base = "TRABAJANDO" if str(getattr(service.status, "value", service.status)) == "EN_PROGRESO" else "EN_CAMINO"
        return {"current_status": base, "label": ALLOWED[base], "note": None, "history": []}
    current = history[0]
    return {"current_status": current["status"], "label": ALLOWED.get(current["status"], current["status"]), "note": current["note"], "changed_at": str(current["created_at"]), "history": history}

@router.post("/{service_id}")
def update_work_status(service_id: str, data: WorkStatusUpdate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).with_for_update().first()
    if not service:
        raise HTTPException(404, "Servicio no encontrado")
    if service.worker_id != current_user.id:
        raise HTTPException(403, "Solo el trabajador/técnico asignado puede actualizar el estado del trabajo")
    status = data.status.strip().upper()
    if status not in ALLOWED:
        raise HTTPException(400, "Estado de trabajo no válido")
    service_status = str(getattr(service.status, "value", service.status))
    if service_status not in {"TRABAJADOR_SELECCIONADO", "EN_PROGRESO"}:
        raise HTTPException(400, "El estado solo puede actualizarse mientras el trabajo está asignado o en progreso")
    db.execute(text("INSERT INTO service_work_status_history (service_id, changed_by_user_id, status, note, created_at) VALUES (:sid,:uid,:status,:note,CURRENT_TIMESTAMP)"), {"sid": service_id, "uid": current_user.id, "status": status, "note": data.note.strip() if data.note else None})
    # The official completion flow remains authoritative: status updates never release or move funds.
    db.execute(text("INSERT INTO notifications (user_id,title,message,type,is_read,created_at) VALUES (:uid,:title,:msg,:typ,false,CURRENT_TIMESTAMP)"), {"uid": service.client_id, "title": "Actualización del trabajo", "message": f"El técnico actualizó el trabajo a: {ALLOWED[status]}." + (f" Nota: {data.note.strip()}" if data.note else ""), "typ": "WORK_STATUS"})
    db.commit()
    return {"message": "Estado del trabajo actualizado", "status": status, "label": ALLOWED[status]}
