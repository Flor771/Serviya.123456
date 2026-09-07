from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
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

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    worker_prof = db.query(WorkerProfile).filter(WorkerProfile.user_id == current_user.id).first()
    
    profile_data = {
        "id": current_user.id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "cedula": current_user.cedula,
        "role": role_str,
        "active_role": current_user.active_role,
        "province": current_user.province,
        "municipality": current_user.municipality,
        "bio": current_user.bio,
        "is_verified": current_user.is_verified,
        "rating": current_user.rating,
        "jobs_completed": current_user.jobs_completed
    }

    if worker_prof:
        profile_data["worker_profile"] = {
            "profession": worker_prof.profession,
            "specialties": worker_prof.specialties,
            "experience_years": worker_prof.experience_years,
            "hourly_rate_rd": worker_prof.hourly_rate_rd,
            "availability": worker_prof.availability,
            "verification_status": worker_prof.verification_status.value if hasattr(worker_prof.verification_status, "value") else str(worker_prof.verification_status)
        }

    return {"user": profile_data}

@router.put("/profile")
def update_profile(data: UpdateProfileSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if data.first_name: current_user.first_name = data.first_name
    if data.last_name: current_user.last_name = data.last_name
    if data.phone: current_user.phone = data.phone
    if data.bio: current_user.bio = data.bio
    if data.province: current_user.province = data.province
    if data.municipality: current_user.municipality = data.municipality

    if data.profession or data.hourly_rate_rd is not None:
        worker_prof = db.query(WorkerProfile).filter(WorkerProfile.user_id == current_user.id).first()
        if not worker_prof:
            worker_prof = WorkerProfile(
                user_id=current_user.id,
                profession=data.profession or "Técnico General",
                hourly_rate_rd=data.hourly_rate_rd or 500.0
            )
            db.add(worker_prof)
        else:
            if data.profession: worker_prof.profession = data.profession
            if data.hourly_rate_rd is not None: worker_prof.hourly_rate_rd = data.hourly_rate_rd

    db.commit()
    db.refresh(current_user)
    return {"message": "Perfil actualizado exitosamente", "user": {"id": current_user.id, "first_name": current_user.first_name, "last_name": current_user.last_name}}

@router.get("/workers")
def get_workers(province: Optional[str] = Query(None), category: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(User).filter(User.role == UserRoleEnum.TRABAJADOR)
    if province:
        query = query.filter(User.province == province)
    
    workers = query.all()
    results = []
    for w in workers:
        wp = db.query(WorkerProfile).filter(WorkerProfile.user_id == w.id).first()
        results.append({
            "id": w.id,
            "first_name": w.first_name,
            "last_name": w.last_name,
            "province": w.province,
            "municipality": w.municipality,
            "rating": w.rating,
            "jobs_completed": w.jobs_completed,
            "is_verified": w.is_verified,
            "profession": wp.profession if wp else "Técnico Especializado",
            "hourly_rate_rd": wp.hourly_rate_rd if wp else 500.0
        })
    return {"workers": results}
