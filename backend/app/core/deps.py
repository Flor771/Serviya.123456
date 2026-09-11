import os
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.database import get_db
from app.models.models import User

security = HTTPBearer(auto_error=False)

def get_current_user(db: Session = Depends(get_db), credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None
    return db.query(User).filter(User.id == user_id).first()

def get_current_active_user(current_user: Optional[User] = Depends(get_current_user)) -> User:
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado. Por favor inicie sesión.", headers={"WWW-Authenticate": "Bearer"})
    if getattr(current_user, "is_active", True) is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Esta cuenta está suspendida. Contacte con soporte de SERVIYA.")
    return current_user

def _is_primary_admin(current_user: User) -> bool:
    configured = (os.getenv("SUPERADMIN_EMAIL") or os.getenv("ADMIN_EMAIL") or "admin@serviya.do").strip().lower()
    return str(getattr(current_user, "email", "")).strip().lower() == configured

def require_admin(request: Request, current_user: User = Depends(get_current_active_user)) -> User:
    role_str = str(current_user.role.value) if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado. Se requieren permisos de administrador.")
    # All ADMIN accounts have full operational access. Only the primary account
    # may create/disable other administrator accounts.
    path = request.url.path.rstrip("/")
    if "/administrators" in path and not _is_primary_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el administrador principal puede administrar cuentas administrativas.")
    return current_user

def require_super_admin(current_user: User = Depends(get_current_active_user)) -> User:
    role_str = str(current_user.role.value) if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != "ADMIN" or not _is_primary_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requieren permisos del administrador principal.")
    return current_user
