from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
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
