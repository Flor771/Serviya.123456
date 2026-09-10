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
    "SUPER_ADMIN": {"label": "Super Administrador", "description": "Control total de SERVIYA. Gestiona administradores, configuración y seguridad.", "permissions": ["ALL"]},
    "ADMINISTRADOR_GENERAL": {"label": "Administrador General", "description": "Supervisa la operación general y puede gestionar las áreas administrativas.", "permissions": ["USERS", "SERVICES", "VERIFICATION", "FINANCE", "DISPUTES", "SETTINGS"]},
    "ADMIN_FINANCIERO": {"label": "Administrador Financiero", "description": "Depósitos, Custodia, comisiones, cuentas bancarias y retiros.", "permissions": ["FINANCE"]},
    "ADMIN_OPERACIONES": {"label": "Administrador de Operaciones", "description": "Servicios, postulaciones, contratos y flujo operativo.", "permissions": ["SERVICES", "OPERATIONS"]},
    "ADMIN_VERIFICACION": {"label": "Administrador de Verificación", "description": "Cédula, documentos y validación de trabajadores.", "permissions": ["VERIFICATION"]},
    "ADMIN_SOPORTE": {"label": "Administrador de Soporte", "description": "Atención de usuarios, tickets y seguimiento de incidencias.", "permissions": ["SUPPORT", "USERS"]},
    "ADMIN_MODERACION": {"label": "Administrador de Moderación", "description": "Moderación de perfiles, servicios, portafolios y reseñas.", "permissions": ["MODERATION"]},
    "AUDITOR": {"label": "Auditor", "description": "Consulta y auditoría de actividad sin ejecutar pagos ni cambios críticos.", "permissions": ["AUDIT", "READ_ONLY"]},
}

class CreateAdminBody(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str = ""
    password: str
    admin_role: str = "ADMINISTRADOR_GENERAL"

class UpdateAdminBody(BaseModel):
    admin_role: Optional[str] = None
    is_active: Optional[bool] = None


def require_super_admin(current_user: User = Depends(require_admin)) -> User:
    role = getattr(current_user, "admin_role", None) or "SUPER_ADMIN"
    if role not in {"SUPER_ADMIN", "ADMINISTRADOR_GENERAL"}:
        raise HTTPException(status_code=403, detail="Solo un Super Administrador o Administrador General puede gestionar administradores.")
    return current_user


def admin_payload(u: User):
    role = getattr(u, "admin_role", None) or "SUPER_ADMIN"
    meta = ADMIN_ROLES.get(role, ADMIN_ROLES["ADMINISTRADOR_GENERAL"])
    return {
        "id": u.id,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": u.email,
        "phone": u.phone,
        "admin_role": role,
        "role_label": meta["label"],
        "description": meta["description"],
        "permissions": meta["permissions"],
        "is_active": bool(u.is_active) if u.is_active is not None else True,
        "is_verified": bool(u.is_verified),
        "created_at": str(u.created_at),
    }


@router.get("/administrator-roles")
def list_admin_roles(admin_user: User = Depends(require_admin)):
    return {"roles": [{"key": key, **value} for key, value in ADMIN_ROLES.items()]}


@router.get("/administrators")
def list_administrators(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role == UserRoleEnum.ADMIN).order_by(User.created_at.desc()).all()
    return {"administrators": [admin_payload(u) for u in users]}


@router.post("/administrators")
def create_administrator(data: CreateAdminBody, admin_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    role = data.admin_role.strip().upper()
    if role not in ADMIN_ROLES:
        raise HTTPException(status_code=400, detail="Rol administrativo no válido.")
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
        admin_role=role,
        province="Distrito Nacional",
        municipality="Santo Domingo de Guzmán (DN)",
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()
    db.execute(text("INSERT INTO admin_audit_logs (admin_id, action, resource, target_id, details, timestamp) VALUES (:aid, 'ADMIN_CREATED', 'administrators', 0, :details, CURRENT_TIMESTAMP)"), {"aid": admin_user.id, "details": f"Creado administrador {user.email} con rol {role}"})
    db.commit()
    db.refresh(user)
    return {"message": "Administrador creado correctamente.", "administrator": admin_payload(user)}


@router.patch("/administrators/{user_id}")
def update_administrator(user_id: str, data: UpdateAdminBody, admin_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.role == UserRoleEnum.ADMIN).first()
    if not user:
        raise HTTPException(status_code=404, detail="Administrador no encontrado.")
    new_role = (data.admin_role or getattr(user, "admin_role", None) or "SUPER_ADMIN").strip().upper()
    if new_role not in ADMIN_ROLES:
        raise HTTPException(status_code=400, detail="Rol administrativo no válido.")
    if user.id == admin_user.id and data.is_active is False:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta administrativa.")
    if user.id == admin_user.id and new_role != "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="No puedes quitarte a ti mismo el rol de Super Administrador.")
    if new_role != "SUPER_ADMIN" and getattr(user, "admin_role", None) == "SUPER_ADMIN":
        super_count = db.query(User).filter(User.role == UserRoleEnum.ADMIN, User.admin_role == "SUPER_ADMIN", User.is_active.is_(True)).count()
        if super_count <= 1:
            raise HTTPException(status_code=400, detail="SERVIYA debe conservar al menos un Super Administrador activo.")
    if data.admin_role is not None:
        user.admin_role = new_role
    if data.is_active is not None:
        user.is_active = data.is_active
    db.execute(text("INSERT INTO admin_audit_logs (admin_id, action, resource, target_id, details, timestamp) VALUES (:aid, 'ADMIN_UPDATED', 'administrators', 0, :details, CURRENT_TIMESTAMP)"), {"aid": admin_user.id, "details": f"Administrador {user_id}: rol={new_role}, activo={user.is_active}"})
    db.commit()
    db.refresh(user)
    return {"message": "Administrador actualizado.", "administrator": admin_payload(user)}


@router.delete("/administrators/{user_id}")
def deactivate_administrator(user_id: str, admin_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.role == UserRoleEnum.ADMIN).first()
    if not user:
        raise HTTPException(status_code=404, detail="Administrador no encontrado.")
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta administrativa.")
    if getattr(user, "admin_role", None) == "SUPER_ADMIN":
        super_count = db.query(User).filter(User.role == UserRoleEnum.ADMIN, User.admin_role == "SUPER_ADMIN", User.is_active.is_(True)).count()
        if super_count <= 1:
            raise HTTPException(status_code=400, detail="SERVIYA debe conservar al menos un Super Administrador activo.")
    user.is_active = False
    db.execute(text("INSERT INTO admin_audit_logs (admin_id, action, resource, target_id, details, timestamp) VALUES (:aid, 'ADMIN_DEACTIVATED', 'administrators', 0, :details, CURRENT_TIMESTAMP)"), {"aid": admin_user.id, "details": f"Administrador {user_id} desactivado"})
    db.commit()
    return {"message": "Administrador desactivado.", "user_id": user_id}
