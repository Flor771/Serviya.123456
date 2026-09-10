from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_active_user, require_admin
from app.models.models import User

router = APIRouter(prefix="/worker/bank-account", tags=["Cuenta bancaria del trabajador"])

ALLOWED_BANKS = {"BANRESERVAS", "BANCO POPULAR", "BHD"}

class BankAccountBody(BaseModel):
    bank_name: str = Field(min_length=2, max_length=100)
    account_type: str = Field(min_length=2, max_length=50)
    account_number: str = Field(min_length=4, max_length=100)
    confirm_account_number: str | None = None
    account_holder_name: str = Field(min_length=2, max_length=200)
    account_holder_cedula: str = Field(min_length=5, max_length=50)


def _normalize_bank(value: str) -> str:
    raw = " ".join((value or "").strip().upper().split())
    if raw == "BANCO DE RESERVAS":
        return "BANRESERVAS"
    return raw


def _serialize(row):
    return {"id": row["id"], "worker_id": row["worker_id"], "bank_name": row["bank_name"], "account_type": row["account_type"], "account_number": row["account_number"], "account_holder_name": row["account_holder_name"], "account_holder_cedula": row["account_holder_cedula"], "is_active": bool(row["is_active"]), "created_at": str(row["created_at"]), "updated_at": str(row["updated_at"])}

@router.get("")
def get_worker_bank_account(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if str(getattr(current_user.role, "value", current_user.role)) != "TRABAJADOR":
        raise HTTPException(status_code=403, detail="Solo un trabajador puede administrar su cuenta bancaria.")
    row = db.execute(text("SELECT id,worker_id,bank_name,account_type,account_number,account_holder_name,account_holder_cedula,is_active,created_at,updated_at FROM worker_bank_accounts WHERE worker_id=:worker_id"), {"worker_id": current_user.id}).mappings().first()
    return {"bank_account": _serialize(row) if row else None}

@router.put("")
def save_worker_bank_account(data: BankAccountBody, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if str(getattr(current_user.role, "value", current_user.role)) != "TRABAJADOR":
        raise HTTPException(status_code=403, detail="Solo un trabajador puede guardar una cuenta bancaria.")
    bank = _normalize_bank(data.bank_name)
    if bank not in ALLOWED_BANKS:
        raise HTTPException(status_code=400, detail="El banco debe ser Banreservas, Banco Popular o BHD.")
    number = data.account_number.strip()
    if data.confirm_account_number is not None and data.confirm_account_number.strip() != number:
        raise HTTPException(status_code=400, detail="Los números de cuenta no coinciden.")
    holder = data.account_holder_name.strip()
    cedula = data.account_holder_cedula.strip()
    existing = db.execute(text("SELECT id FROM worker_bank_accounts WHERE worker_id=:worker_id FOR UPDATE"), {"worker_id": current_user.id}).scalar()
    if existing:
        db.execute(text("UPDATE worker_bank_accounts SET bank_name=:bank,account_type=:type,account_number=:number,account_holder_name=:holder,account_holder_cedula=:cedula,is_active=true,updated_at=CURRENT_TIMESTAMP WHERE worker_id=:worker_id"), {"bank": bank, "type": data.account_type.strip(), "number": number, "holder": holder, "cedula": cedula, "worker_id": current_user.id})
    else:
        db.execute(text("INSERT INTO worker_bank_accounts (worker_id,bank_name,account_type,account_number,account_holder_name,account_holder_cedula,is_active,created_at,updated_at) VALUES (:worker_id,:bank,:type,:number,:holder,:cedula,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"), {"worker_id": current_user.id, "bank": bank, "type": data.account_type.strip(), "number": number, "holder": holder, "cedula": cedula})
    db.commit()
    row = db.execute(text("SELECT id,worker_id,bank_name,account_type,account_number,account_holder_name,account_holder_cedula,is_active,created_at,updated_at FROM worker_bank_accounts WHERE worker_id=:worker_id"), {"worker_id": current_user.id}).mappings().one()
    return {"message": "Cuenta bancaria guardada correctamente. Esta cuenta quedará asociada a tus retiros hasta que la actualices.", "bank_account": _serialize(row)}

@router.get("/admin/all")
def list_worker_bank_accounts_admin(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT b.id,b.worker_id,b.bank_name,b.account_type,b.account_number,b.account_holder_name,b.account_holder_cedula,b.is_active,b.created_at,b.updated_at,u.first_name,u.last_name,u.email FROM worker_bank_accounts b LEFT JOIN users u ON u.id=b.worker_id ORDER BY b.updated_at DESC" )).mappings().all()
    accounts = []
    for row in rows:
        item = _serialize(row)
        item.update({"worker_name": " ".join(x for x in [row.get("first_name"), row.get("last_name")] if x), "worker_email": row.get("email")})
        accounts.append(item)
    return {"bank_accounts": accounts}

@router.get("/by-worker/{worker_id}")
def get_worker_bank_account_admin(worker_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT id,worker_id,bank_name,account_type,account_number,account_holder_name,account_holder_cedula,is_active,created_at,updated_at FROM worker_bank_accounts WHERE worker_id=:worker_id"), {"worker_id": worker_id}).mappings().first()
    return {"bank_account": _serialize(row) if row else None}
