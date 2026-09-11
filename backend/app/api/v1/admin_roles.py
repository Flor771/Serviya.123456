import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.deps import get_db, require_admin
from app.core.security import get_password_hash
from app.models.models import User, UserRoleEnum

router = APIRouter(prefix="/admin", tags=["Administración SERVIYA"])

# SERVIYA intentionally has ONE administrative role. The database may still
# contain legacy admin_role values, but they are normalized at the API boundary.
ADMIN_ROLE = {
    "key": "ADMINISTRADOR",
    "label": "Administrador",
    "description": "Control integral de SERVIYA: usuarios, servicios, verificaciones, Custodia, liberaciones, retiros, bancos, soporte, disputas y auditoría.",
    "permissions": ["ALL"]
}

class CreateAdminBody(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str = ""
    password: str

class UpdateAdminBody(BaseModel):
    is_active: Optional[bool] = None
    password: Optional[str] = None


def _is_primary_admin(user: User) -> bool:
    configured = (os.getenv("SUPERADMIN_EMAIL") or os.getenv("ADMIN_EMAIL") or "admin@serviya.do").strip().lower()
    return str(getattr(user, "email", "")).strip().lower() == configured


def require_primary_admin(current_user: User = Depends(require_admin)) -> User:
    if not _is_primary_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo el administrador principal puede agregar o administrar cuentas administrativas.")
    return current_user


def admin_payload(u: User):
    return {
        "id": u.id,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": u.email,
        "phone": u.phone,
        "admin_role": "ADMINISTRADOR",
        "role_label": "Administrador",
        "description": ADMIN_ROLE["description"],
        "permissions": ADMIN_ROLE["permissions"],
        "is_active": bool(u.is_active) if u.is_active is not None else True,
        "is_verified": bool(u.is_verified),
        "is_primary": _is_primary_admin(u),
        "created_at": str(u.created_at)
    }


@router.get("/administrator-roles")
def list_admin_roles(admin_user: User = Depends(require_admin)):
    return {"roles": [ADMIN_ROLE]}


@router.get("/super-admin/administrators")
def list_administrators(admin_user: User = Depends(require_primary_admin), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role == UserRoleEnum.ADMIN).order_by(User.created_at.asc()).all()
    return {"administrators": [admin_payload(u) for u in users]}


@router.post("/super-admin/administrators")
def create_administrator(data: CreateAdminBody, admin_user: User = Depends(require_primary_admin), db: Session = Depends(get_db)):
    if len(data.password) < 10:
        raise HTTPException(status_code=400, detail="La contraseña del administrador debe tener al menos 10 caracteres.")
    if not data.phone.strip():
        raise HTTPException(status_code=400, detail="El teléfono es obligatorio para una cuenta administrativa.")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo electrónico.")
    user = User(
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        email=str(data.email).lower(),
        phone=data.phone.strip(),
        password_hash=get_password_hash(data.password),
        role=UserRoleEnum.ADMIN,
        active_role="ADMIN",
        admin_role="ADMINISTRADOR",
        province="Distrito Nacional",
        municipality="Santo Domingo de Guzmán (DN)",
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.flush()
    db.execute(text("INSERT INTO admin_audit_logs (admin_id, action, resource, target_id, details, timestamp) VALUES (:aid, 'ADMIN_CREATED', 'administrators', 0, :details, CURRENT_TIMESTAMP)"), {
        "aid": admin_user.id,
        "details": f"Creado administrador {user.email} con acceso integral"
    })
    db.commit()
    db.refresh(user)
    return {"message": "Administrador adicional creado correctamente.", "administrator": admin_payload(user)}


@router.patch("/super-admin/administrators/{user_id}")
def update_administrator(user_id: str, data: UpdateAdminBody, admin_user: User = Depends(require_primary_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.role == UserRoleEnum.ADMIN).first()
    if not user:
        raise HTTPException(status_code=404, detail="Administrador no encontrado.")
    if user.id == admin_user.id and data.is_active is False:
        raise HTTPException(status_code=400, detail="El administrador principal no puede desactivar su propia cuenta.")
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password is not None:
        if len(data.password) < 10:
            raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 10 caracteres.")
        user.password_hash = get_password_hash(data.password)
    user.admin_role = "ADMINISTRADOR"
    user.active_role = "ADMIN"
    db.execute(text("INSERT INTO admin_audit_logs (admin_id, action, resource, target_id, details, timestamp) VALUES (:aid, 'ADMIN_UPDATED', 'administrators', 0, :details, CURRENT_TIMESTAMP)"), {
        "aid": admin_user.id,
        "details": f"Administrador {user_id}: acceso integral, activo={user.is_active}"
    })
    db.commit()
    db.refresh(user)
    return {"message": "Cuenta administrativa actualizada.", "administrator": admin_payload(user)}


@router.delete("/super-admin/administrators/{user_id}")
def deactivate_administrator(user_id: str, admin_user: User = Depends(require_primary_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.role == UserRoleEnum.ADMIN).first()
    if not user:
        raise HTTPException(status_code=404, detail="Administrador no encontrado.")
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta administrativa.")
    user.is_active = False
    db.execute(text("INSERT INTO admin_audit_logs (admin_id, action, resource, target_id, details, timestamp) VALUES (:aid, 'ADMIN_DEACTIVATED', 'administrators', 0, :details, CURRENT_TIMESTAMP)"), {
        "aid": admin_user.id,
        "details": f"Administrador {user_id} desactivado"
    })
    db.commit()
    return {"message": "Administrador adicional desactivado.", "user_id": user_id}


@router.get("/super-admin/access")
def my_admin_access(admin_user: User = Depends(require_admin)):
    return {
        "is_super_admin": _is_primary_admin(admin_user),
        "admin_role": "ADMINISTRADOR",
        "role_label": "Administrador",
        "permissions": ["ALL"],
        "direct_panel_access": True
    }
