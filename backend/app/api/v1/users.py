from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import User, WorkerProfile, UserRoleEnum

router = APIRouter(prefix="/users", tags=["Usuarios y Técnicos"])

class UpdateProfileSchema(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    province: Optional[str] = None
    municipality: Optional[str] = None
    profession: Optional[str] = None
    hourly_rate_rd: Optional[float] = None
    avatar_url: Optional[str] = None


def _verification_summary(db: Session, worker_id: str):
    rows = db.execute(text("""
        SELECT verification_category, document_type, document_name, status
        FROM verifications WHERE worker_id=:uid ORDER BY created_at DESC
    """), {"uid": worker_id}).mappings().all()
    categories = {"CEDULA": "Cédula / identidad", "CERTIFICACION_TECNICA": "Certificación técnica", "DIPLOMADO": "Diplomado / formación profesional", "EXPERIENCIA_ACREDITADA": "Experiencia o acreditación profesional", "LICENCIA_ESPECIALIDAD": "Licencia / especialidad"}
    approved = {}
    for r in rows:
        category = r["verification_category"]
        if not category:
            dtype = str(r["document_type"] or "").upper()
            category = "CEDULA" if dtype in {"CEDULA_RD","CEDULA_FRONT","CEDULA_BACK"} else ("CERTIFICACION_TECNICA" if dtype in {"INFOTEP","INFOTEP_CERTIFICATE"} else dtype)
        if category in categories and category not in approved and r["status"] == "VERIFICADO":
            approved[category] = r
    stars = (1 if "CEDULA" in approved else 0) + sum(1 for k in categories if k != "CEDULA" and k in approved)
    return {
        "stars": stars,
        "max_stars": 5,
        "level": "VERIFICACIÓN COMPLETA" if stars == 5 else ("VERIFICADO" if stars == 1 else "VERIFICACIÓN EN PROGRESO" if stars > 1 else "SIN VERIFICAR"),
        "base_verified": "CEDULA" in approved,
        "verified_certifications": [{"category": k, "label": categories[k], "document_name": approved[k]["document_name"]} for k in categories if k != "CEDULA" and k in approved],
    }


@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    worker_prof = db.query(WorkerProfile).filter(WorkerProfile.user_id == current_user.id).first()
    profile_data = {
        "id": current_user.id, "first_name": current_user.first_name, "last_name": current_user.last_name,
        "email": current_user.email, "phone": current_user.phone, "cedula": current_user.cedula,
        "role": role_str, "active_role": current_user.active_role, "province": current_user.province,
        "municipality": current_user.municipality, "bio": current_user.bio, "avatar_url": current_user.avatar_url,
        "is_verified": current_user.is_verified, "rating": current_user.rating, "jobs_completed": current_user.jobs_completed
    }
    if worker_prof:
        profile_data["worker_profile"] = {
            "profession": worker_prof.specialties or "Técnico Especializado", "specialties": worker_prof.specialties,
            "hourly_rate_rd": worker_prof.hourly_rate, "availability": worker_prof.availability,
            "is_approved": worker_prof.is_approved, "has_infotep": worker_prof.has_infotep,
        }
        profile_data["verification"] = _verification_summary(db, current_user.id)
    return {"user": profile_data}

@router.put("/profile")
def update_profile(data: UpdateProfileSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if data.first_name is not None: current_user.first_name = data.first_name
    if data.last_name is not None: current_user.last_name = data.last_name
    if data.phone is not None: current_user.phone = data.phone
    if data.bio is not None: current_user.bio = data.bio
    if data.province is not None: current_user.province = data.province
    if data.municipality is not None: current_user.municipality = data.municipality
    if data.avatar_url is not None:
        if not data.avatar_url.startswith("data:image/"):
            raise HTTPException(400, "La foto de perfil debe ser una imagen válida.")
        if len(data.avatar_url) > 700_000:
            raise HTTPException(400, "La foto de perfil es demasiado grande. Elige una imagen más pequeña.")
        current_user.avatar_url = data.avatar_url

    if data.profession is not None or data.hourly_rate_rd is not None:
        worker_prof = db.query(WorkerProfile).filter(WorkerProfile.user_id == current_user.id).first()
        if not worker_prof:
            worker_prof = WorkerProfile(user_id=current_user.id, specialties=data.profession or "Técnico General", hourly_rate=data.hourly_rate_rd or 500.0)
            db.add(worker_prof)
        else:
            if data.profession is not None: worker_prof.specialties = data.profession
            if data.hourly_rate_rd is not None: worker_prof.hourly_rate = data.hourly_rate_rd
    db.commit(); db.refresh(current_user)
    return {"message": "Perfil actualizado exitosamente", "user": {
        "id": current_user.id, "first_name": current_user.first_name, "last_name": current_user.last_name,
        "email": current_user.email, "phone": current_user.phone, "province": current_user.province,
        "municipality": current_user.municipality, "bio": current_user.bio, "avatar_url": current_user.avatar_url,
        "is_verified": current_user.is_verified, "rating": current_user.rating, "jobs_completed": current_user.jobs_completed,
        "role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role), "active_role": current_user.active_role,
        "verification": _verification_summary(db, current_user.id) if current_user.role == UserRoleEnum.TRABAJADOR else None
    }}

@router.get("/workers")
def get_workers(province: Optional[str] = None, category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(User).filter(User.role == UserRoleEnum.TRABAJADOR, User.is_active.is_(True))
    if province: query = query.filter(User.province == province)
    workers = query.all()
    results = []
    for w in workers:
        wp = db.query(WorkerProfile).filter(WorkerProfile.user_id == w.id).first()
        results.append({
            "id": w.id, "first_name": w.first_name, "last_name": w.last_name, "province": w.province,
            "municipality": w.municipality, "rating": w.rating, "jobs_completed": w.jobs_completed,
            "is_verified": w.is_verified, "avatar_url": w.avatar_url,
            "profession": wp.specialties if wp and wp.specialties else "Técnico Especializado",
            "hourly_rate_rd": wp.hourly_rate if wp and wp.hourly_rate is not None else 500.0,
            "bio": w.bio, "availability": wp.availability if wp else None,
            "verification": _verification_summary(db, w.id)
        })
    return {"workers": results}
