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
    location_lat: Optional[float] = Field(default=None, ge=-90, le=90)
    location_lng: Optional[float] = Field(default=None, ge=-180, le=180)
    location_address: Optional[str] = Field(default=None, max_length=500)
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
        applications_count = db.query(Application).filter(Application.service_id == s.id).count()
        st = s.status.value if hasattr(s.status, "value") else str(s.status)
        out.append({
            "id": s.id, "client_id": s.client_id, "worker_id": s.worker_id,
            "title": s.title, "description": s.description,
            "category_name": s.category_name, "subcategory": s.subcategory,
            "price_rd": s.price_rd, "negotiated_price_rd": getattr(s, "negotiated_price_rd", None),
            "negotiation_status": getattr(s, "negotiation_status", None),
            "province": s.province, "municipality": s.municipality,
            "address_approx": getattr(s, "address_approx", None),
            "service_date": s.service_date, "service_time": s.service_time,
            "estimated_duration": s.estimated_duration, "images": s.images or [],
            "requirements": s.requirements or [], "status": st,
            "applications_count": applications_count, "created_at": str(s.created_at),
        })
    return {"services": out}

@router.post("")
def create_service(data: ServiceCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != UserRoleEnum.CLIENTE.value:
        raise HTTPException(status_code=403, detail="Solo los clientes pueden publicar servicios")
    if data.price_rd <= 0:
        raise HTTPException(status_code=400, detail="El precio debe ser mayor que RD$0")
    if (data.location_lat is None) != (data.location_lng is None):
        raise HTTPException(status_code=400, detail="La ubicación del mapa debe tener latitud y longitud")
    s = Service(
        client_id=current_user.id, title=data.title, description=data.description, category_name=data.category_name,
        subcategory=data.subcategory, price_rd=data.price_rd, province=data.province, municipality=data.municipality,
        address_approx=data.address_approx, location_lat=data.location_lat, location_lng=data.location_lng,
        location_address=data.location_address, service_date=data.service_date, service_time=data.service_time,
        estimated_duration=data.estimated_duration, images=data.images or [], requirements=data.requirements or [],
        status=ServiceStatusEnum.PUBLICADA,
    )
    db.add(s); db.commit(); db.refresh(s)
    return {"message": "Servicio publicado", "service": {"id": s.id, "title": s.title, "status": s.status.value if hasattr(s.status, "value") else str(s.status)}}

@router.get("/{service_id}/applications")
def get_service_applications(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service: raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if service.client_id != current_user.id: raise HTTPException(status_code=403, detail="Solo el cliente creador puede ver las postulaciones")
    applications = db.query(Application).filter(Application.service_id == service_id).order_by(Application.created_at.desc()).all()
    out = []
    for app in applications:
        worker = db.query(User).filter(User.id == app.worker_id).first()
        if not worker: continue
        worker_profile = getattr(worker, "worker_profile", None)
        status = app.status.value if hasattr(app.status, "value") else str(app.status)
        out.append({"id": str(app.id), "service_id": str(app.service_id), "worker_id": str(app.worker_id), "worker_name": f"{worker.first_name} {worker.last_name}", "worker_profession": getattr(worker_profile, "specialties", None) or "Trabajador / Técnico", "worker_rating": float(getattr(worker, "rating", 5.0) or 5.0), "worker_is_verified": bool(getattr(worker, "is_verified", False)), "message": app.message, "offered_price_rd": app.offered_price_rd, "availability_note": app.availability_note, "status": status, "created_at": str(app.created_at)})
    return {"service_id": str(service_id), "count": len(out), "applications": out, "negotiation_status": getattr(service, "negotiation_status", None), "negotiated_price_rd": getattr(service, "negotiated_price_rd", None)}

@router.get("/{service_id}/location")
def get_service_location(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Return exact map coordinates only to the client owner or assigned worker."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service: raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if current_user.id != service.client_id and current_user.id != service.worker_id:
        raise HTTPException(status_code=403, detail="La ubicación exacta está protegida")
    if service.location_lat is None or service.location_lng is None:
        return {"service_id": service_id, "available": False, "latitude": None, "longitude": None, "address": service.location_address or service.address_approx}
    return {"service_id": service_id, "available": True, "latitude": service.location_lat, "longitude": service.location_lng, "address": service.location_address or service.address_approx, "municipality": service.municipality, "province": service.province}

@router.get("/{service_id}")
def get_service(service_id: str, db: Session = Depends(get_db)):
    s = db.query(Service).filter(Service.id == service_id).first()
    if not s: raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return {"service": {"id": s.id, "client_id": s.client_id, "worker_id": s.worker_id, "title": s.title, "description": s.description, "category_name": s.category_name, "subcategory": s.subcategory, "price_rd": s.price_rd, "negotiated_price_rd": getattr(s, "negotiated_price_rd", None), "negotiation_status": getattr(s, "negotiation_status", None), "province": s.province, "municipality": s.municipality, "address_approx": getattr(s, "address_approx", None), "service_date": s.service_date, "service_time": s.service_time, "estimated_duration": s.estimated_duration, "images": s.images or [], "requirements": s.requirements or [], "status": s.status.value if hasattr(s.status, "value") else str(s.status), "applications_count": db.query(Application).filter(Application.service_id == s.id).count(), "created_at": str(s.created_at)}}

@router.get("/{service_id}/completion-photos")
def get_completion_photos(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT id, client_id, worker_id, status, completion_photos, completion_summary, completion_submitted FROM services WHERE id=:id"), {"id": service_id}).mappings().first()
    if not row: raise HTTPException(404, "Servicio no encontrado")
    if current_user.id not in {row["client_id"], row["worker_id"]}: raise HTTPException(403, "No tienes acceso a la evidencia de este trabajo")
    photos = row["completion_photos"] or []
    if isinstance(photos, str):
        try: photos = json.loads(photos)
        except Exception: photos = []
    return {"service_id": service_id, "photos": photos, "summary": row["completion_summary"], "completion_submitted": bool(row["completion_submitted"])}

@router.post("/{service_id}/completion-photos")
def save_completion_photos(service_id: str, data: CompletionPhotosPayload, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT id, client_id, worker_id, status, completion_photos, completion_submitted FROM services WHERE id=:id FOR UPDATE"), {"id": service_id}).mappings().first()
    if not row: raise HTTPException(404, "Servicio no encontrado")
    if row["worker_id"] != current_user.id: raise HTTPException(403, "Solo el técnico asignado puede subir evidencia")
    raw_status = row["status"]
    status = raw_status.value if hasattr(raw_status, "value") else str(raw_status)
    if status.startswith("ServiceStatusEnum."): status = status.split(".", 1)[1]
    if status not in {"EN_PROGRESO", "TRABAJADOR_SELECCIONADO", "FINALIZANDO"}: raise HTTPException(400, "La evidencia solo puede subirse mientras el trabajo está activo o finalizando")
    if row["completion_submitted"]: raise HTTPException(400, "Este trabajo ya fue enviado a revisión")
    photos = row["completion_photos"] or []
    if isinstance(photos, str):
        try: photos = json.loads(photos)
        except Exception: photos = []
    if not isinstance(photos, list): photos = []
    clean_new = []
    total_chars = sum(len(str(x)) for x in photos if isinstance(x, str))
    for photo in data.photos:
        value = str(photo).strip()
        if not value.startswith("data:image/"): raise HTTPException(400, "Cada evidencia debe ser una imagen válida")
        if len(value) > 450_000: raise HTTPException(400, "Una de las fotos supera el tamaño permitido. Intenta con una foto más ligera.")
        if total_chars + len(value) > 2_500_000: raise HTTPException(400, "La evidencia completa es demasiado grande. Sube menos fotos o fotos más ligeras.")
        total_chars += len(value)
        clean_new.append(value)
    combined = (photos + clean_new)[-10:]
    summary = data.summary.strip() if data.summary else "Trabajo terminado y evidencia enviada para revisión del cliente."
    if len(summary) < 5: raise HTTPException(400, "Escribe un resumen de al menos 5 caracteres")
    otp=f"{__import__('random').randint(100000,999999)}"
    try:
        db.execute(text("UPDATE services SET completion_photos=CAST(:photos AS JSON), completion_summary=:summary, completion_submitted=true, completion_submitted_at=CURRENT_TIMESTAMP WHERE id=:id"), {"photos": json.dumps(combined, ensure_ascii=False), "summary": summary, "id": service_id})
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, f"No se pudo guardar la evidencia. Intenta con fotos más ligeras. Detalle: {str(exc)[:180]}")
    db.execute(text("UPDATE escrows SET release_otp=:otp WHERE service_id=:sid AND status='RETENIDO'"), {"otp": otp, "sid": service_id})
    db.execute(text("INSERT INTO notifications (user_id,title,message,type,read,created_at,related_entity_id) VALUES (:uid,:title,:message,'COMPLETION_SUBMITTED',false,CURRENT_TIMESTAMP,:related)"), {"uid": row["client_id"], "title": "Trabajo terminado: evidencia recibida", "message": "El técnico envió fotos y el resumen del trabajo terminado. Revisa la evidencia y acepta la finalización para enviar la solicitud a Administración.", "related": service_id})
    db.commit()
    return {"message": "Evidencia y trabajo terminado enviados correctamente al cliente", "service_id": service_id, "photos": combined, "completion_submitted": True}
