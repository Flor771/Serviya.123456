from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.deps import get_db, get_current_active_user
from app.models.models import User, UserRoleEnum, Wallet, WorkerProfile

router = APIRouter(prefix="/auth", tags=["Autenticación"])

class RegisterSchema(BaseModel):
    first_name: str; last_name: str; email: EmailStr; phone: str; password: str
    confirm_password: Optional[str] = None; role: Optional[str] = "CLIENTE"; cedula: Optional[str] = None
    province: Optional[str] = "Distrito Nacional"; municipality: Optional[str] = "Santo Domingo de Guzmán (DN)"
    profession: Optional[str] = None; accept_policies: Optional[bool] = False; bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None; confirm_bank_account_number: Optional[str] = None
    account_number: Optional[str] = None; confirm_account_number: Optional[str] = None
class LoginSchema(BaseModel): email: EmailStr; password: str
class RecoverPasswordSchema(BaseModel): email: EmailStr
class ResetPasswordSchema(BaseModel): token: str; new_password: str; confirm_password: Optional[str] = None
class RoleToggleSchema(BaseModel): active_role: str

@router.post("/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    if not data.accept_policies: raise HTTPException(400, "Debe aceptar las políticas y condiciones para registrarse.")
    if data.confirm_password is not None and data.confirm_password != data.password: raise HTTPException(400, "Las contraseñas no coinciden.")
    role_str=(data.role or "CLIENTE").upper()
    if role_str == "TRABAJADOR" and not data.cedula: raise HTTPException(400, "La cédula es obligatoria para registrarse como trabajador.")
    if db.query(User).filter(User.email == data.email).first(): raise HTTPException(400, "Ya existe una cuenta registrada con este correo electrónico.")
    role_enum=UserRoleEnum.TRABAJADOR if role_str == "TRABAJADOR" else UserRoleEnum.CLIENTE
    user=User(first_name=data.first_name,last_name=data.last_name,email=data.email,phone=data.phone,cedula=data.cedula,password_hash=get_password_hash(data.password),role=role_enum,active_role=role_str,province=data.province or "Distrito Nacional",municipality=data.municipality or "Santo Domingo de Guzmán (DN)",is_verified=False)
    db.add(user); db.flush()
    if role_str == "TRABAJADOR":
        db.add(WorkerProfile(user_id=user.id,cedula=data.cedula,specialties=data.profession or "Servicios Generales",hourly_rate=600.0,availability="TIEMPO_COMPLETO",has_infotep=False,rating=5.0,review_count=0,is_approved=False))
        db.add(Wallet(worker_id=user.id,available_balance=0.0,pending_custody_balance=0.0,total_earnings=0.0,total_commissions=0.0,total_withdrawn=0.0))
    db.commit(); db.refresh(user); token=create_access_token(user.id)
    return {"message":"Usuario registrado exitosamente en SERVIYA.do","token":token,"access_token":token,"token_type":"bearer","user":{"id":user.id,"first_name":user.first_name,"last_name":user.last_name,"email":user.email,"phone":user.phone,"role":user.role.value if hasattr(user.role,"value") else str(user.role),"active_role":user.active_role,"is_verified":user.is_verified,"avatar_url":user.avatar_url}}

@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user=db.query(User).filter(User.email == data.email).first(); pwd_hash=getattr(user,"password_hash",None) or getattr(user,"hashed_password",None)
    if not user or not verify_password(data.password,pwd_hash): raise HTTPException(401,"Credenciales incorrectas. Verifique su correo y contraseña.")
    if user.is_active is False: raise HTTPException(403,"Esta cuenta está suspendida. Contacte con soporte de SERVIYA.do.")
    token=create_access_token(user.id)
    return {"message":"Inicio de sesión exitoso","token":token,"access_token":token,"token_type":"bearer","user":{"id":user.id,"first_name":user.first_name,"last_name":user.last_name,"email":user.email,"phone":user.phone,"role":user.role.value if hasattr(user.role,"value") else str(user.role),"active_role":user.active_role,"is_verified":user.is_verified,"avatar_url":user.avatar_url}}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_active_user)):
    return {"user":{"id":current_user.id,"first_name":current_user.first_name,"last_name":current_user.last_name,"email":current_user.email,"phone":current_user.phone,"cedula":current_user.cedula,"role":current_user.role.value if hasattr(current_user.role,"value") else str(current_user.role),"active_role":current_user.active_role,"province":current_user.province,"municipality":current_user.municipality,"bio":current_user.bio,"avatar_url":current_user.avatar_url,"is_verified":current_user.is_verified,"rating":current_user.rating,"jobs_completed":current_user.jobs_completed}}

@router.post("/recover-password")
def recover_password(data: RecoverPasswordSchema, db: Session = Depends(get_db)):
    user=db.query(User).filter(User.email == data.email).first()
    if user:
        raw=secrets.token_urlsafe(48); token_hash=hashlib.sha256(raw.encode()).hexdigest(); now=datetime.now(timezone.utc)
        db.execute(text("UPDATE password_reset_tokens SET used_at=:now WHERE user_id=:uid AND used_at IS NULL"),{"now":now,"uid":user.id})
        db.execute(text("INSERT INTO password_reset_tokens (user_id,token_hash,expires_at,created_at) VALUES (:uid,:hash,:exp,:now)"),{"uid":user.id,"hash":token_hash,"exp":now+timedelta(minutes=30),"now":now}); db.commit()
        return {"message":"Solicitud de recuperación creada. El token de recuperación es válido durante 30 minutos.","reset_token":raw}
    return {"message":"Si el correo está registrado, se enviaron instrucciones de recuperación."}

@router.post("/reset-password")
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    if len(data.new_password)<8: raise HTTPException(400,"La nueva contraseña debe tener al menos 8 caracteres.")
    if data.confirm_password is not None and data.confirm_password != data.new_password: raise HTTPException(400,"Las contraseñas no coinciden.")
    h=hashlib.sha256(data.token.encode()).hexdigest(); row=db.execute(text("SELECT id,user_id,expires_at,used_at FROM password_reset_tokens WHERE token_hash=:hash"),{"hash":h}).mappings().first()
    if not row or row["used_at"] is not None or row["expires_at"] <= datetime.now(timezone.utc): raise HTTPException(400,"El token de recuperación no es válido o ya expiró.")
    db.execute(text("UPDATE users SET password_hash=:pwd, hashed_password=:pwd, updated_at=:now WHERE id=:uid"),{"pwd":get_password_hash(data.new_password),"now":datetime.now(timezone.utc),"uid":row["user_id"]}); db.execute(text("UPDATE password_reset_tokens SET used_at=:now WHERE id=:id"),{"now":datetime.now(timezone.utc),"id":row["id"]}); db.commit()
    return {"message":"Contraseña restablecida exitosamente. Ya puede iniciar sesión."}

@router.post("/role-toggle")
def role_toggle(data: RoleToggleSchema,current_user: User=Depends(get_current_active_user),db: Session=Depends(get_db)):
    current_user.active_role=data.active_role; db.commit(); db.refresh(current_user); return {"message":f"Modo actualizado a {data.active_role}","active_role":current_user.active_role}
