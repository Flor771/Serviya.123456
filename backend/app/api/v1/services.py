from typing import Optional
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.deps import get_db, get_current_active_user
from app.models.models import Service, User, Application, ServiceStatusEnum, UserRoleEnum

router = APIRouter(prefix="/services", tags=["Servicios"])

class ServiceCreate(BaseModel):
    title: str
    description: str
    category_name: str
    subcategory: Optional[str] = None
    price_rd: float
    province: Optional[str] = None
    municipality: Optional[str] = None
    address_approx: Optional[str] = None
    service_date: Optional[str] = None
    service_time: Optional[str] = None
    estimated_duration: Optional[str] = None
    images: Optional[list] = None
    requirements: Optional[list] = None

class CompletionPhotosPayload(BaseModel):
    photos: list[str] = Field(min_length=1, max_length=10)
    summary: Optional[str] = Field(default=None, max_length=1000)

@router.get("")
def list_services(province: Optional[str] = None, category_name: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Service)
    if province: q = q.filter(Service.province == province)
    if category_name: q = q.filter(Service.category_name == category_name)
    if status: q = q.filter(Service.status == status)
    out = []
    for s in q.order_by(Service.created_at.desc()).all():
        c = db.query(User).filter(User.id == s.client_id).first()
        w = db.query(User).filter(User.id == s.worker_id).first() if s.worker_id else None
        applications_count = db.query(Application).filter(Application.service_id == s.id).count()
        st = s.status.value if hasattr(s.status, "value") else str(s.status)
        out.append({
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "category_name": s.category_name,
            "subcategory": s.subcategory,
            "price_rd": s.price_rd,
            "negotiated_price_rd": getattr(s, "negotiated_price_rd", None),
            "negotiation_status": getattr(s, "negotiation_status", None),
            "province": s.province,
            "municipality": s.municipality,
            "address_approx": s.address_approx,
            "service_date": s.service_date,
            "service_time": s.service_time,
            "estimated_duration": s.estimated_duration,
            "images": s.images or [],
            "requirements": s.requirements or [],
            "status": st,
            "client_id": s.client_id,
            "client_name": f"{c.first_name} {c.last_name}" if c else "Cliente SERVIYA",
            "worker_id": s.worker_id,
            "worker_name": f"{w.first_name} {w.last_name}" if w else None,
            "worker_verified": bool(getattr(w, "is_verified", False)) if w else False,
            "applications_count": applications_count,
            "created_at": str(s.created_at),
        })
    return {"services": out}

@router.post("")
def create_service(data: ServiceCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != UserRoleEnum.CLIENTE.value:
        raise HTTPException(status_code=403, detail="Solo los clientes pueden publicar servicios")
    if data.price_rd <= 0:
        raise HTTPException(status_code=400, detail="El precio debe ser mayor que RD$0")
    s = Service(
        client_id=current_user.id, title=data.title, description=data.description, category_name=data.category_name,
        subcategory=data.subcategory, price_rd=data.price_rd, province=data.province, municipality=data.municipality,
        address_approx=data.address_approx, service_date=data.service_date, service_time=data.service_time,
        estimated_duration=data.estimated_duration, images=data.images or [], requirements=data.requirements or [],
        status=ServiceStatusEnum.PUBLICADA,
    )
    db.add(s); db.commit(); db.refresh(s)
    return {"message": "Servicio publicado", "service": {"id": s.id, "title": s.title, "status": s.status.value if hasattr(s.status, "value") else str(s.status)}}

@router.get("/{service_id}/applications")
def get_service_applications(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Return the applications for the owner of a service.

    This endpoint powers the Client's "Postulaciones recibidas" window. It is
    intentionally restricted to the service owner so proposal and worker data
    cannot be exposed to unrelated users.
    """
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if service.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo el cliente creador puede ver las postulaciones")

    applications = db.query(Application).filter(Application.service_id == service_id).order_by(Application.created_at.desc()).all()
    out = []
    for app in applications:
        worker = db.query(User).filter(User.id == app.worker_id).first()
        if not worker:
            continue
        worker_profile = getattr(worker, "worker_profile", None)
        status = app.status.value if hasattr(app.status, "value") else str(app.status)
        out.append({
            "id": str(app.id),
            "service_id": str(app.service_id),
            "worker_id": str(app.worker_id),
            "worker_name": f"{worker.first_name} {worker.last_name}",
            "worker_profession": getattr(worker_profile, "specialties", None) or "Trabajador / Técnico",
            "worker_rating": float(getattr(worker, "rating", 5.0) or 5.0),
            "worker_is_verified": bool(getattr(worker, "is_verified", False)),
            "message": app.message,
            "offered_price_rd": app.offered_price_rd,
            "availability_note": app.availability_note,
            "status": status,
            "created_at": str(app.created_at),
        })
    return {
        "service_id": str(service_id),
        "count": len(out),
        "applications": out,
        "negotiation_status": getattr(service, "negotiation_status", None),
        "negotiated_price_rd": getattr(service, "negotiated_price_rd", None),
    }

@router.get("/{service_id}")
def get_service(service_id: str, db: Session = Depends(get_db)):
    s = db.query(Service).filter(Service.id == service_id).first()
    if not s: raise HTTPException(status_code=404, detail="Servicio no encontrado")
    c = db.query(User).filter(User.id == s.client_id).first()
    w = db.query(User).filter(User.id == s.worker_id).first() if s.worker_id else None
    return {"service": {
        "id": s.id, "title": s.title, "description": s.description, "category_name": s.category_name, "subcategory": s.subcategory,
        "price_rd": s.price_rd, "negotiated_price_rd": getattr(s, "negotiated_price_rd", None), "negotiation_status": getattr(s, "negotiation_status", None),
        "province": s.province, "municipality": s.municipality, "address_approx": s.address_approx, "service_date": s.service_date,
        "service_time": s.service_time, "estimated_duration": s.estimated_duration, "images": s.images or [], "requirements": s.requirements or [],
        "status": s.status.value if hasattr(s.status, "value") else str(s.status), "client_id": s.client_id,
        "client_name": f"{c.first_name} {c.last_name}" if c else "Cliente SERVIYA", "worker_id": s.worker_id,
        "worker_name": f"{w.first_name} {w.last_name}" if w else None, "worker_verified": bool(getattr(w, "is_verified", False)) if w else False,
        "applications_count": db.query(Application).filter(Application.service_id == s.id).count(), "created_at": str(s.created_at)
    }}

@router.get("/{service_id}/completion-photos")
def get_completion_photos(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT id, client_id, worker_id, status, completion_photos, completion_summary FROM services WHERE id=:id"), {"id": service_id}).mappings().first()
    if not row:
        raise HTTPException(404, "Servicio no encontrado")
    if current_user.id not in {row["client_id"], row["worker_id"]}:
        raise HTTPException(403, "No tienes acceso a la evidencia de este trabajo")
    photos = row["completion_photos"] or []
    if isinstance(photos, str):
        try: photos = json.loads(photos)
        except Exception: photos = []
    return {"service_id": service_id, "photos": photos, "summary": row["completion_summary"]}

@router.post("/{service_id}/completion-photos")
def save_completion_photos(service_id: str, data: CompletionPhotosPayload, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT id, client_id, worker_id, status, completion_photos, completion_submitted FROM services WHERE id=:id FOR UPDATE"), {"id": service_id}).mappings().first()
    if not row:
        raise HTTPException(404, "Servicio no encontrado")
    if row["worker_id"] != current_user.id:
        raise HTTPException(403, "Solo el técnico asignado puede subir evidencia")
    status = str(row["status"])
    if status not in {"EN_PROGRESO", "TRABAJADOR_SELECCIONADO"}:
        raise HTTPException(400, "La evidencia solo puede subirse mientras el trabajo está activo")
    photos = row["completion_photos"] or []
    if isinstance(photos, str):
        try: photos = json.loads(photos)
        except Exception: photos = []
    if not isinstance(photos, list): photos = []
    clean_new = []
    for photo in data.photos:
        value = str(photo).strip()
        if not value.startswith("data:image/"):
            raise HTTPException(400, "Cada evidencia debe ser una imagen válida")
        if len(value) > 700_000:
            raise HTTPException(400, "Una de las fotos supera el tamaño permitido")
        clean_new.append(value)
    combined = (photos + clean_new)[-10:]
    summary = data.summary.strip() if data.summary else None
    db.execute(text("UPDATE services SET completion_photos=CAST(:photos AS JSON), completion_summary=COALESCE(:summary, completion_summary) WHERE id=:id"), {"photos": json.dumps(combined), "summary": summary, "id": service_id})
    db.execute(text("INSERT INTO notifications (user_id,title,message,type,is_read,created_at,related_entity_id) VALUES (:uid,:title,:message,:typ,false,CURRENT_TIMESTAMP,:related)"), {"uid": row["client_id"], "title": "Nueva evidencia del trabajo", "message": "El técnico subió fotos del trabajo para tu revisión.", "typ": "COMPLETION_PHOTOS", "related": service_id})
    db.commit()
    return {"message": "Evidencia guardada correctamente", "service_id": service_id, "photos": combined}
