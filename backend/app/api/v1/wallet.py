import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, get_current_active_user
from app.models.models import Wallet, User, BankAccount

router = APIRouter(prefix="/wallet", tags=["Billetera SERVIYA"])

@router.get("/bank-accounts")
def get_active_serviya_bank_accounts(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    accounts = db.query(BankAccount).filter(BankAccount.is_active == True).order_by(BankAccount.is_primary.desc(), BankAccount.id.asc()).all()
    return {"bank_accounts": [{"id": a.id, "bank_name": a.bank_name, "account_number": a.account_number, "account_type": a.account_type, "account_holder": a.account_holder, "rnc_cedula": a.rnc_cedula, "is_primary": bool(a.is_primary)} for a in accounts]}

class DepositSchema(BaseModel):
    amount_rd: float
    payment_method: Optional[str] = "TARJETA_SIMULACION"

class WithdrawSchema(BaseModel):
    amount_rd: float


def _record_transaction(db: Session, user_id: str, amount: float, tx_type: str, status_value: str, description: str, reference: str):
    db.execute(text("INSERT INTO transactions (user_id, amount, type, status, reference_code, created_at) VALUES (:user_id, :amount, :type, :status, :reference, CURRENT_TIMESTAMP)"), {"user_id": user_id, "amount": amount, "type": tx_type, "status": status_value, "reference": reference})


def _role(user):
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _get_or_create_client_wallet(db: Session, client_id: str):
    row = db.execute(text("SELECT id, available_balance, total_deposited, total_spent, total_refunded FROM client_wallets WHERE client_id=:client_id FOR UPDATE"), {"client_id": client_id}).mappings().first()
    if row:
        return row
    db.execute(text("INSERT INTO client_wallets (client_id) VALUES (:client_id) ON CONFLICT (client_id) DO NOTHING"), {"client_id": client_id})
    return db.execute(text("SELECT id, available_balance, total_deposited, total_spent, total_refunded FROM client_wallets WHERE client_id=:client_id FOR UPDATE"), {"client_id": client_id}).mappings().one()


@router.get("")
def get_wallet(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    role_str = _role(current_user)
    tx_rows = db.execute(text("SELECT id, amount, type, status, reference_code, created_at FROM transactions WHERE user_id=:user_id ORDER BY created_at DESC"), {"user_id": current_user.id}).mappings().all()
    transactions = [{"id": r["id"], "type": r["type"], "amount_rd": float(r["amount"]), "description": r["type"], "reference": r["reference_code"], "status": r["status"], "created_at": str(r["created_at"])} for r in tx_rows]

    if role_str == "CLIENTE":
        wallet = db.execute(text("SELECT id, available_balance, total_deposited, total_spent, total_refunded FROM client_wallets WHERE client_id=:client_id"), {"client_id": current_user.id}).mappings().first()
        if not wallet:
            wallet = {"id": None, "available_balance": 0, "total_deposited": 0, "total_spent": 0, "total_refunded": 0}
        return {"wallet": {"id": wallet["id"], "user_id": current_user.id, "client_id": current_user.id, "available_rd": float(wallet["available_balance"] or 0), "escrow_rd": 0.0, "pending_rd": 0.0, "total_deposited_rd": float(wallet["total_deposited"] or 0), "total_spent_rd": float(wallet["total_spent"] or 0), "total_refunded_rd": float(wallet["total_refunded"] or 0), "can_withdraw": False}, "transactions": transactions, "withdrawals": []}

    wallet = db.query(Wallet).filter(Wallet.worker_id == current_user.id).first()
    if role_str == "TRABAJADOR" and not wallet:
        wallet = Wallet(worker_id=current_user.id, available_balance=0.0, pending_custody_balance=0.0, total_earnings=0.0, total_commissions=0.0, total_withdrawn=0.0)
        db.add(wallet); db.commit(); db.refresh(wallet)

    withdrawal_rows = db.execute(text("SELECT id, amount, method, account_number, account_type, account_holder_name, status, reference_code, created_at FROM withdrawals WHERE worker_id=:worker_id ORDER BY created_at DESC"), {"worker_id": current_user.id}).mappings().all() if role_str == "TRABAJADOR" else []
    withdrawals = [{"id": r["id"], "amount_rd": float(r["amount"]), "bank_name": r["method"], "account_type": r["account_type"], "account_number": r["account_number"], "account_holder_name": r["account_holder_name"], "status": r["status"], "reference": r["reference_code"], "requested_at": str(r["created_at"])} for r in withdrawal_rows]

    saved_account = None
    custody_jobs = []
    custody_total = 0.0
    if role_str == "TRABAJADOR":
        saved_account = db.execute(text("SELECT id,bank_name,account_type,account_number,account_holder_name,account_holder_cedula,is_active FROM worker_bank_accounts WHERE worker_id=:worker_id AND is_active=true ORDER BY id DESC LIMIT 1"), {"worker_id": current_user.id}).mappings().first()
        custody_rows = db.execute(text("SELECT e.id AS escrow_id,e.service_id,e.total_amount_rd,e.worker_payout_rd,e.status,e.created_at,s.title,s.status AS service_status FROM escrows e JOIN services s ON s.id=e.service_id WHERE e.worker_id=:worker_id AND e.status IN ('RETENIDO','PENDIENTE_APROBACION') ORDER BY e.created_at DESC"), {"worker_id": current_user.id}).mappings().all()
        for r in custody_rows:
            amount = float(r["worker_payout_rd"] or r["total_amount_rd"] or 0)
            custody_total += amount
            custody_jobs.append({"escrow_id": r["escrow_id"], "service_id": r["service_id"], "title": r["title"], "amount_rd": amount, "escrow_amount_rd": float(r["total_amount_rd"] or 0), "status": r["status"], "service_status": r["service_status"], "created_at": str(r["created_at"])})

    if not wallet:
        return {"wallet": {"id": None, "user_id": current_user.id, "worker_id": None, "available_rd": 0.0, "escrow_rd": custody_total, "pending_rd": 0.0, "total_received_rd": 0.0, "total_spent_rd": 0.0, "can_withdraw": False}, "transactions": transactions, "withdrawals": withdrawals, "worker_bank_account": dict(saved_account) if saved_account else None, "custody_jobs": custody_jobs}

    pending_withdrawal = sum(float(r["amount"] or 0) for r in withdrawal_rows if str(r["status"]).upper() == "PENDIENTE") if role_str == "TRABAJADOR" else 0.0
    return {"wallet": {"id": wallet.id, "user_id": wallet.worker_id, "worker_id": wallet.worker_id, "available_rd": float(wallet.available_balance or 0), "escrow_rd": custody_total, "pending_rd": pending_withdrawal, "total_received_rd": float(wallet.total_earnings or 0), "total_spent_rd": float(wallet.total_withdrawn or 0), "can_withdraw": role_str == "TRABAJADOR"}, "transactions": transactions, "withdrawals": withdrawals, "worker_bank_account": dict(saved_account) if saved_account else None, "custody_jobs": custody_jobs}


@router.post("/deposit")
def deposit(data: DepositSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if data.amount_rd <= 0:
        raise HTTPException(status_code=400, detail="El monto a depositar debe ser mayor que RD$ 0.")
    role_str = _role(current_user)
    ref = f"DEP-{uuid.uuid4().hex[:8].upper()}"
    if role_str == "CLIENTE":
        wallet = _get_or_create_client_wallet(db, current_user.id)
        db.execute(text("UPDATE client_wallets SET available_balance=available_balance+:amount, total_deposited=total_deposited+:amount, updated_at=CURRENT_TIMESTAMP WHERE id=:id"), {"amount": data.amount_rd, "id": wallet["id"]})
        _record_transaction(db, current_user.id, data.amount_rd, "DEPOSITO_CLIENTE", "EXITOSO", f"Depósito de cliente via {data.payment_method}", ref)
        db.commit()
        balance = db.execute(text("SELECT available_balance FROM client_wallets WHERE id=:id"), {"id": wallet["id"]}).scalar_one()
        return {"message": f"Depósito de RD$ {data.amount_rd:,.2f} acreditado a tu Billetera SERVIYA.", "reference": ref, "available_rd": float(balance)}
    if role_str != "TRABAJADOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Este tipo de depósito no está disponible para este usuario.")
    wallet = db.query(Wallet).filter(Wallet.worker_id == current_user.id).first()
    if not wallet:
        wallet = Wallet(worker_id=current_user.id, available_balance=0.0, pending_custody_balance=0.0, total_earnings=0.0, total_commissions=0.0, total_withdrawn=0.0); db.add(wallet); db.flush()
    wallet.available_balance += data.amount_rd
    _record_transaction(db, current_user.id, data.amount_rd, "DEPOSITO", "EXITOSO", f"Depósito via {data.payment_method}", ref)
    db.commit()
    return {"message": f"Depósito de RD$ {data.amount_rd:,.2f} procesado exitosamente.", "reference": ref, "available_rd": wallet.available_balance}


@router.post("/withdraw")
def withdraw(data: WithdrawSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if _role(current_user) != "TRABAJADOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado. Solamente los usuarios con rol TRABAJADOR pueden solicitar retiros de fondos.")
    account = db.execute(text("SELECT id,bank_name,account_type,account_number,account_holder_name,account_holder_cedula FROM worker_bank_accounts WHERE worker_id=:worker_id AND is_active=true ORDER BY id DESC LIMIT 1 FOR UPDATE"), {"worker_id": current_user.id}).mappings().first()
    if not account:
        raise HTTPException(status_code=400, detail="Primero debes registrar tu cuenta bancaria en SERVIYA.")
    if data.amount_rd <= 0:
        raise HTTPException(status_code=400, detail="El monto del retiro debe ser mayor que RD$ 0.")
    if data.amount_rd < settings.MIN_WITHDRAWAL_RD:
        raise HTTPException(status_code=400, detail=f"El monto mínimo de retiro es RD$ {settings.MIN_WITHDRAWAL_RD:,.2f}")
    wallet = db.query(Wallet).filter(Wallet.worker_id == current_user.id).with_for_update().first()
    if not wallet or float(wallet.available_balance or 0) < data.amount_rd:
        raise HTTPException(status_code=400, detail="Saldo insuficiente en Billetera disponible.")
    ref = f"WITH-{uuid.uuid4().hex[:8].upper()}"
    withdrawal = db.execute(text("INSERT INTO withdrawals (worker_id, amount, method, account_number, account_type, bank_account_id, account_holder_name, account_holder_cedula, reference_code, status, created_at) VALUES (:worker_id,:amount,:method,:account_number,:account_type,:bank_account_id,:holder,:cedula,:reference,'PENDIENTE',CURRENT_TIMESTAMP) RETURNING id"), {"worker_id": current_user.id, "amount": data.amount_rd, "method": account["bank_name"], "account_number": account["account_number"], "account_type": account["account_type"], "bank_account_id": account["id"], "holder": account["account_holder_name"], "cedula": account["account_holder_cedula"], "reference": ref}).scalar_one()
    wallet.available_balance -= data.amount_rd
    _record_transaction(db, current_user.id, data.amount_rd, "RETIRO", "PENDIENTE", f"Solicitud de retiro {ref} a {account['bank_name']} terminada en {str(account['account_number'])[-4:]}", ref)
    db.commit()
    return {"message": f"Solicitud de retiro por RD$ {data.amount_rd:,.2f} enviada a revisión administrativa.", "withdrawal_id": withdrawal, "reference": ref, "bank_name": account["bank_name"], "account_number": account["account_number"], "available_rd": wallet.available_balance, "pending_rd": data.amount_rd}
