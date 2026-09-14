from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.models import Service, Application, User

router = APIRouter(prefix="/services", tags=["Servicios"])

@router.get("")
def list_services_for_ui(province: Optional[str] = None, category_name: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user)):
    q = db.query(Service)
    if province:
        q = q.filter(Service.province == province)
    if category_name:
        q = q.filter(Service.category_name == category_name)
    if status:
        q = q.filter(Service.status == status)
    out = []
    for s in q.order_by(Service.created_at.desc()).all():
        applications_count = db.query(Application).filter(Application.service_id == s.id).count()
        st = s.status.value if hasattr(s.status, "value") else str(s.status)
        item = {
            "id": s.id, "title": s.title, "description": s.description,
            "category_name": s.category_name, "subcategory": s.subcategory,
            "price_rd": s.price_rd, "negotiated_price_rd": getattr(s, "negotiated_price_rd", None),
            "negotiation_status": getattr(s, "negotiation_status", None),
            "province": s.province, "municipality": s.municipality,
            "service_date": s.service_date, "service_time": s.service_time,
            "estimated_duration": s.estimated_duration, "images": s.images or [],
            "requirements": s.requirements or [], "status": st,
            "applications_count": applications_count, "created_at": str(s.created_at),
        }
        if current_user and (str(current_user.id) == str(s.client_id) or str(current_user.id) == str(s.worker_id)):
            item["client_id"] = s.client_id
            item["worker_id"] = s.worker_id
        out.append(item)
    return {"services": out}
