from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.deps import get_db, get_current_active_user
from app.models.models import User, UserRoleEnum, Wallet, WorkerProfile

router = APIRouter(prefix="/auth", tags=["Autenticación"])

class RegisterSchema(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    password: str
    confirm_password: Optional[str] = None
    role: Optional[str] = "CLIENTE"
    cedula: Optional[str] = None
    province: Optional[str] = "Distrito Nacional"
    municipality: Optional[str] = "Santo Domingo de Guzmán (DN)"
    profession: Optional[str] = None
    accept_policies: Optional[bool] = False
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    confirm_bank_account_number: Optional[str] = None
    account_number: Optional[str] = None
    confirm_account_number: Optional[str] = None

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class RecoverPasswordSchema(BaseModel):
    email: EmailStr

class RoleToggleSchema(BaseModel):
    active_role: str

@router.post("/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    if not data.accept_policies:
        raise HTTPException(
            status_code=400,
            detail="Debe aceptar las políticas y condiciones para registrarse."
        )

    if data.confirm_password is not None and data.confirm_password != data.password:
        raise HTTPException(
            status_code=400,
            detail="Las contraseñas no coinciden."
        )

    role_str = (data.role or "CLIENTE").upper()

    if role_str == "TRABAJADOR":
        if not data.cedula:
            raise HTTPException(
                status_code=400,
                detail="La cédula es obligatoria para registrarse como trabajador."
            )

        allowed_banks = ["banco popular", "bhd", "banreservas"]
        if not data.bank_name or data.bank_name.strip().lower() not in allowed_banks:
            raise HTTPException(
                status_code=400,
                detail="El banco debe ser Banco Popular, BHD o Banreservas."
            )

        acc_num = data.bank_account_number or data.account_number
        conf_acc_num = data.confirm_bank_account_number or data.confirm_account_number

        if not acc_num or not acc_num.strip():
            raise HTTPException(
                status_code=400,
                detail="El número de cuenta bancaria es obligatorio para el trabajador."
            )

        if not conf_acc_num or conf_acc_num.strip() != acc_num.strip():
            raise HTTPException(
                status_code=400,
                detail="Los números de cuenta bancaria no coinciden."
            )

    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una cuenta registrada con este correo electrónico."
        )
    
    role_enum = UserRoleEnum.TRABAJADOR if role_str == "TRABAJADOR" else UserRoleEnum.CLIENTE
    hashed_pwd = get_password_hash(data.password)
    
    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        cedula=data.cedula,
        password_hash=hashed_pwd,
        role=role_enum,
        active_role=role_str,
        province=data.province or "Distrito Nacional",
        municipality=data.municipality or "Santo Domingo de Guzmán (DN)",
        is_verified=False
    )
    db.add(user)
    db.flush()

    if role_str == "TRABAJADOR":
        acc_num = (data.bank_account_number or data.account_number or "").strip()
        # Create WorkerProfile with bank details
        profile = WorkerProfile(
            user_id=user.id,
            profession=data.profession or "Técnico General",
            specialties=["Servicios Generales"],
            experience_years=2,
            hourly_rate_rd=600.0,
            availability="TIEMPO_COMPLETO",
            bank_name=data.bank_name.strip() if data.bank_name else None,
            account_number=acc_num
        )
        db.add(profile)

        # Create Worker Wallet with worker_id
        wallet = Wallet(
            worker_id=user.id,
            available_balance=0.0,
            pending_custody_balance=0.0,
            total_earnings=0.0,
            total_commissions=0.0,
            total_withdrawn=0.0
        )
        db.add(wallet)

    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return {
        "message": "Usuario registrado exitosamente en SERVIYA.do",
        "token": token,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "active_role": user.active_role,
            "is_verified": user.is_verified
        }
    }

@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    pwd_hash = getattr(user, "password_hash", None) or getattr(user, "hashed_password", None)
    if not user or not verify_password(data.password, pwd_hash):
        raise HTTPException(
            status_code=401,
            detail="Credenciales incorrectas. Verifique su correo y contraseña."
        )
    
    token = create_access_token(user.id)
    return {
        "message": "Inicio de sesión exitoso",
        "token": token,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "active_role": user.active_role,
            "is_verified": user.is_verified
        }
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_active_user)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    return {
        "user": {
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
    }

@router.post("/recover-password")
def recover_password(data: RecoverPasswordSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return {"message": "Si el correo está registrado, se enviaron instrucciones de recuperación."}
    return {"message": "Instrucciones de recuperación de contraseña enviadas exitosamente a su correo."}

@router.post("/role-toggle")
def role_toggle(data: RoleToggleSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    current_user.active_role = data.active_role
    db.commit()
    db.refresh(current_user)
    return {
        "message": f"Modo actualizado a {data.active_role}",
        "active_role": current_user.active_role
    }
