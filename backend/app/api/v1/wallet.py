import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, get_current_active_user
from app.models.models import Wallet, User, UserRoleEnum, BankAccount

router = APIRouter(prefix="/wallet", tags=["Billetera SERVIYA"])

@router.get("/bank-accounts")
def get_active_serviya_bank_accounts(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    accounts = db.query(BankAccount).filter(BankAccount.is_active == True).order_by(BankAccount.is_primary.desc(), BankAccount.id.asc()).all()
    return {"bank_accounts": [{
        "id": a.id, "bank_name": a.bank_name, "account_number": a.account_number,
        "account_type": a.account_type, "account_holder": a.account_holder,
        "rnc_cedula": a.rnc_cedula, "is_primary": bool(a.is_primary)
    } for a in accounts]}

class DepositSchema(BaseModel):
    amount_rd: float
    payment_method: Optional[str] = "TARJETA_SIMULACION"

class WithdrawSchema(BaseModel):
    amount_rd: float
    bank_name: str
    account_type: str
    account_number: str
    confirm_account_number: Optional[str] = None
    account_holder_name: str
    account_holder_cedula: str


def _record_transaction(db: Session, user_id: str, amount: float, tx_type: str, status_value: str, description: str, reference: str):
    db.execute(text("""
        INSERT INTO transactions (user_id, amount, type, status, reference_code, created_at)
        VALUES (:user_id, :amount, :type, :status, :reference, CURRENT_TIMESTAMP)
    """), {"user_id": user_id, "amount": amount, "type": tx_type, "status": status_value, "reference": reference})


def _record_financial_movement(db: Session, wallet_id: int, amount: float, movement_type: str, description: str):
    db.execute(text("""
        INSERT INTO financial_movements (wallet_id, contract_id, movement_type, amount_dop, description, created_at)
        VALUES (:wallet_id, NULL, :movement_type, :amount, :description, CURRENT_TIMESTAMP)
    """), {"wallet_id": wallet_id, "movement_type": movement_type, "amount": amount, "description": description})


@router.get("")
def get_wallet(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    is_worker = role_str == "TRABAJADOR"
    wallet = db.query(Wallet).filter(Wallet.worker_id == current_user.id).first()

    if is_worker and not wallet:
        wallet = Wallet(worker_id=current_user.id, available_balance=0.0, pending_custody_balance=0.0,
                        total_earnings=0.0, total_commissions=0.0, total_withdrawn=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

    tx_rows = db.execute(text("""
        SELECT id, amount, type, status, reference_code, created_at
        FROM transactions WHERE user_id = :user_id ORDER BY created_at DESC
    """), {"user_id": current_user.id}).mappings().all()

    withdrawal_rows = db.execute(text("""
        SELECT id, amount, method, account_number, account_type, status, created_at
        FROM withdrawals WHERE worker_id = :worker_id ORDER BY created_at DESC
    """), {"worker_id": current_user.id}).mappings().all() if is_worker else []

    transactions = [{
        "id": r["id"], "type": r["type"], "amount_rd": float(r["amount"]),
        "description": r["type"], "reference": r["reference_code"],
        "status": r["status"], "created_at": str(r["created_at"])
    } for r in tx_rows]

    withdrawals = [{
        "id": r["id"], "amount_rd": float(r["amount"]), "bank_name": r["method"],
        "account_type": r["account_type"], "account_number": r["account_number"],
        "status": r["status"], "requested_at": str(r["created_at"])
    } for r in withdrawal_rows]

    if not wallet:
        return {"wallet": {"id": None, "user_id": current_user.id, "worker_id": None,
                            "available_rd": 0.0, "escrow_rd": 0.0, "pending_rd": 0.0,
                            "total_received_rd": 0.0, "total_spent_rd": 0.0, "can_withdraw": False},
                "transactions": transactions, "withdrawals": withdrawals}

    return {"wallet": {"id": wallet.id, "user_id": wallet.worker_id, "worker_id": wallet.worker_id,
                        "available_rd": float(wallet.available_balance or 0),
                        "escrow_rd": float(wallet.pending_custody_balance or 0),
                        "pending_rd": float(wallet.pending_custody_balance or 0),
                        "total_received_rd": float(wallet.total_earnings or 0),
                        "total_spent_rd": float(wallet.total_withdrawn or 0), "can_withdraw": is_worker},
            "transactions": transactions, "withdrawals": withdrawals}


@router.post("/deposit")
def deposit(data: DepositSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != "TRABAJADOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Los clientes no pueden depositar fondos en la Billetera de trabajador.")
    if data.amount_rd <= 0:
        raise HTTPException(status_code=400, detail="El monto a depositar debe ser mayor que RD$ 0.")

    wallet = db.query(Wallet).filter(Wallet.worker_id == current_user.id).first()
    if not wallet:
        wallet = Wallet(worker_id=current_user.id, available_balance=0.0, pending_custody_balance=0.0,
                        total_earnings=0.0, total_commissions=0.0, total_withdrawn=0.0)
        db.add(wallet)
        db.flush()
    wallet.available_balance += data.amount_rd
    ref = f"DEP-{uuid.uuid4().hex[:8].upper()}"
    _record_transaction(db, current_user.id, data.amount_rd, "DEPOSITO", "EXITOSO",
                        f"Depósito simulado via {data.payment_method}", ref)
    _record_financial_movement(db, wallet.id, data.amount_rd, "DEPOSITO", "Depósito a billetera del trabajador")
    db.commit()
    return {"message": f"Depósito de RD$ {data.amount_rd:,.2f} procesado exitosamente.", "reference": ref,
            "available_rd": wallet.available_balance}


@router.post("/withdraw")
def withdraw(data: WithdrawSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != "TRABAJADOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Acceso denegado. Solamente los usuarios con rol TRABAJADOR pueden solicitar retiros de fondos.")

    allowed_banks = ["banco popular", "bhd", "banreservas", "banco de reservas"]
    b_name_lower = (data.bank_name or "").strip().lower()
    if not any(b in b_name_lower for b in allowed_banks):
        raise HTTPException(status_code=400, detail="El banco debe ser Banco Popular, BHD o Banreservas.")
    if data.confirm_account_number is not None and data.confirm_account_number.strip() != data.account_number.strip():
        raise HTTPException(status_code=400, detail="Los números de cuenta bancaria no coinciden.")
    if data.amount_rd < settings.MIN_WITHDRAWAL_RD:
        raise HTTPException(status_code=400, detail=f"El monto mínimo de retiro es RD$ {settings.MIN_WITHDRAWAL_RD:,.2f}")

    wallet = db.query(Wallet).filter(Wallet.worker_id == current_user.id).first()
    if not wallet or float(wallet.available_balance or 0) < data.amount_rd:
        raise HTTPException(status_code=400, detail="Saldo insuficiente en Billetera disponible.")

    wallet.available_balance -= data.amount_rd
    wallet.pending_custody_balance += data.amount_rd
    withdrawal = db.execute(text("""
        INSERT INTO withdrawals (worker_id, amount, method, account_number, account_type, status, created_at)
        VALUES (:worker_id, :amount, :method, :account_number, :account_type, :status, CURRENT_TIMESTAMP)
        RETURNING id
    """), {"worker_id": current_user.id, "amount": data.amount_rd, "method": data.bank_name,
           "account_number": data.account_number, "account_type": data.account_type, "status": "PENDIENTE"}).scalar_one()
    ref = f"WITH-{uuid.uuid4().hex[:8].upper()}"
    _record_transaction(db, current_user.id, data.amount_rd, "RETIRO", "PENDIENTE",
                        f"Solicitud de retiro bancario a {data.bank_name}", ref)
    _record_financial_movement(db, wallet.id, -data.amount_rd, "RETIRO_SOLICITADO",
                               f"Retiro solicitado a {data.bank_name}")
    db.commit()
    return {"message": f"Solicitud de retiro por RD$ {data.amount_rd:,.2f} enviada a revisión administrativa.",
            "withdrawal_id": withdrawal, "available_rd": wallet.available_balance,
            "pending_rd": wallet.pending_custody_balance}
