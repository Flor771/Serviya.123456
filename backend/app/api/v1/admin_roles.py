import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.deps import get_db, require_admin
from app.core.security import get_password_hash
from app.models.models import User, UserRoleEnum

router = APIRouter(prefix="/admin", tags=["Roles de Administración SERVIYA"])

ADMIN_ROLES = {
    "SUPER_ADMIN": {"label": "Super Administrador", "description": "Control total de SERVIYA. Acceso directo a todos los paneles, configuración y seguridad.", "permissions": ["ALL"]},
    "ADMINISTRADOR_GENERAL": {"label": "Administrador General", "description": "Supervisa la operación general y puede gestionar las áreas administrativas.", "permissions": ["USERS", "SERVICES", "VERIFICATION", "FINANCE", "DISPUTES", "SETTINGS"]},
    "ADMIN_FINANCIERO": {"label": "Administrador Financiero", "description": "Depósitos, Custodia, comisiones, cuentas bancarias y retiros.", "permissions": ["FINANCE"]},
    "ADMIN_OPERACIONES": {"label": "Administrador de Operaciones", "description": "Servicios, postulaciones, contratos y flujo operativo.", "permissions": ["SERVICES", "OPERATIONS"]},
    "ADMIN_CUSTODIA": {"label": "Administrador de Custodia", "description": "Verificación de depósitos, Custodia y liberación de fondos.", "permissions": ["DEPOSITS", "ESCROW", "RELEASES"]},
    "ADMIN_VERIFICACION": {"label": "Administrador de Verificación", "description": "Cédula, documentos y validación de trabajadores.", "permissions": ["VERIFICATION"]},
    "ADMIN_SOPORTE": {"label": "Administrador de Soporte", "description": "Atención de usuarios, tickets y seguimiento de incidencias.", "permissions": ["SUPPORT", "USERS"]},
    "ADMIN_MODERACION": {"label": "Administrador de Moderación", "description": "Moderación de perfiles, servicios, portafolios y reseñas.", "permissions": ["MODERATION"]},
    "ADMIN_DISPUTAS": {"label": "Administrador de Disputas", "description": "Revisión y resolución de conflictos y evidencias.", "permissions": ["DISPUTES", "EVIDENCE"]},
    "AUDITOR": {"label": "Auditor", "description": "Consulta y auditoría de actividad sin ejecutar pagos ni cambios críticos.", "permissions": ["AUDIT", "READ_ONLY"]},
}

class CreateAdminBody(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str = ""
    password: str
    admin_role: str = "ADMIN_OPERACIONES"

class UpdateAdminBody(BaseModel):
    admin_role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


def _is_super_admin(user: User) -> bool:
    role = (getattr(user, "admin_role", None) or "").strip().upper()
    configured = (os.getenv("SUPERADMIN_EMAIL") or os.getenv("ADMIN_EMAIL") or "admin@serviya.do").strip().lower()
    return role == "SUPER_ADMIN" or str(getattr(user, "email", "")).strip().lower() == configured

def require_super_admin(current_user: User = Depends(require_admin)) -> User:
    if not _is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo el Super Administrador puede administrar cuentas y roles de administradores.")
    return current_user

def admin_payload(u: User):
    role = "SUPER_ADMIN" if _is_super_admin(u) else ((getattr(u, "admin_role", None) or "ADMIN_OPERACIONES").strip().upper())
    meta = ADMIN_ROLES.get(role, ADMIN_ROLES["ADMIN_OPERACIONES"])
    return {"id": u.id, "first_name": u.first_name, "last_name": u.last_name, "email": u.email, "phone": u.phone, "admin_role": role, "role_label": meta["label"], "description": meta["description"], "permissions": meta["permissions"], "is_active": bool(u.is_active) if u.is_active is not None else True, "is_verified": bool(u.is_verified), "created_at": str(u.created_at)}

@router.get("/administrator-roles")
def list_admin_roles(admin_user: User = Depends(require_admin)):
    return {"roles": [{"key": key, **value} for key, value in ADMIN_ROLES.items()]}

@router.get("/super-admin/administrators")
def list_administrators(admin_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role == UserRoleEnum.ADMIN).order_by(User.created_at.desc()).all()
    return {"administrators": [admin_payload(u) for u in users]}

@router.post("/super-admin/administrators")
def create_administrator(data: CreateAdminBody, admin_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    role = data.admin_role.strip().upper()
    if role not in ADMIN_ROLES or role == "SUPER_ADMIN": raise HTTPException(status_code=400, detail="Rol administrativo no válido para un nuevo administrador.")
    if len(data.password) < 10: raise HTTPException(status_code=400, detail="La contraseña del administrador debe tener al menos 10 caracteres.")
    if not data.phone.strip(): raise HTTPException(status_code=400, detail="El teléfono es obligatorio para una cuenta administrativa.")
    if db.query(User).filter(User.email == data.email).first(): raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo electrónico.")
    user = User(first_name=data.first_name.strip(), last_name=data.last_name.strip(), email=str(data.email).lower(), phone=data.phone.strip(), password_hash=get_password_hash(data.password), role=UserRoleEnum.ADMIN, active_role="ADMIN", admin_role=role, province="Distrito Nacional", municipality="Santo Domingo de Guzmán (DN)", is_active=True, is_verified=True)
    db.add(user); db.flush()
    db.execute(text("INSERT INTO admin_audit_logs (admin_id, action, resource, target_id, details, timestamp) VALUES (:aid, 'ADMIN_CREATED', 'administrators', 0, :details, CURRENT_TIMESTAMP)"), {"aid": admin_user.id, "details": f"Creado administrador {user.email} con rol {role}"})
    db.commit(); db.refresh(user)
    return {"message": "Administrador creado correctamente.", "administrator": admin_payload(user)}

@router.patch("/super-admin/administrators/{user_id}")
def update_administrator(user_id: str, data: UpdateAdminBody, admin_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.role == UserRoleEnum.ADMIN).first()
    if not user: raise HTTPException(status_code=404, detail="Administrador no encontrado.")
    current_role = "SUPER_ADMIN" if _is_super_admin(user) else ((getattr(user, "admin_role", None) or "ADMIN_OPERACIONES").strip().upper())
    new_role = (data.admin_role or current_role).strip().upper()
    if new_role not in ADMIN_ROLES: raise HTTPException(status_code=400, detail="Rol administrativo no válido.")
    if user.id == admin_user.id and new_role != "SUPER_ADMIN": raise HTTPException(status_code=400, detail="El Super Administrador no puede quitarse su propio acceso total.")
    if user.id == admin_user.id and data.is_active is False: raise HTTPException(status_code=400, detail="El Super Administrador no puede desactivar su propio acceso.")
    if current_role == "SUPER_ADMIN" and new_role != "SUPER_ADMIN":
        active_superadmins = sum(1 for x in db.query(User).filter(User.role == UserRoleEnum.ADMIN, User.is_active.is_(True)).all() if _is_super_admin(x))
        if active_superadmins <= 1: raise HTTPException(status_code=400, detail="SERVIYA debe conservar al menos un Super Administrador activo.")
    if new_role == "SUPER_ADMIN" and current_role != "SUPER_ADMIN": raise HTTPException(status_code=403, detail="No se puede crear otro Super Administrador desde la configuración.")
    if data.admin_role is not None: user.admin_role = new_role
    if data.is_active is not None: user.is_active = data.is_active
    if data.password is not None:
        if len(data.password) < 10: raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 10 caracteres.")
        user.password_hash = get_password_hash(data.password)
    db.execute(text("INSERT INTO admin_audit_logs (admin_id, action, resource, target_id, details, timestamp) VALUES (:aid, 'ADMIN_UPDATED', 'administrators', 0, :details, CURRENT_TIMESTAMP)"), {"aid": admin_user.id, "details": f"Administrador {user_id}: rol={new_role}, activo={user.is_active}"})
    db.commit(); db.refresh(user)
    return {"message": "Administrador actualizado.", "administrator": admin_payload(user)}

@router.delete("/super-admin/administrators/{user_id}")
def deactivate_administrator(user_id: str, admin_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.role == UserRoleEnum.ADMIN).first()
    if not user: raise HTTPException(status_code=404, detail="Administrador no encontrado.")
    if user.id == admin_user.id: raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta administrativa.")
    if _is_super_admin(user):
        active_superadmins = sum(1 for x in db.query(User).filter(User.role == UserRoleEnum.ADMIN, User.is_active.is_(True)).all() if _is_super_admin(x))
        if active_superadmins <= 1: raise HTTPException(status_code=400, detail="SERVIYA debe conservar al menos un Super Administrador activo.")
    user.is_active = False
    db.execute(text("INSERT INTO admin_audit_logs (admin_id, action, resource, target_id, details, timestamp) VALUES (:aid, 'ADMIN_DEACTIVATED', 'administrators', 0, :details, CURRENT_TIMESTAMP)"), {"aid": admin_user.id, "details": f"Administrador {user_id} desactivado"})
    db.commit()
    return {"message": "Administrador desactivado.", "user_id": user_id}

@router.get("/super-admin/access")
def my_admin_access(admin_user: User = Depends(require_admin)):
    role = "SUPER_ADMIN" if _is_super_admin(admin_user) else ((getattr(admin_user, "admin_role", None) or "ADMIN_OPERACIONES").strip().upper())
    info = ADMIN_ROLES.get(role, ADMIN_ROLES["ADMIN_OPERACIONES"])
    return {"is_super_admin": role == "SUPER_ADMIN", "admin_role": role, "role_label": info["label"], "permissions": info["permissions"], "direct_panel_access": True}
