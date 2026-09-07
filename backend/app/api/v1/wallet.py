import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, get_current_active_user
from app.models.models import Wallet, WalletTransaction, Withdrawal, WithdrawalStatusEnum, User, UserRoleEnum

router = APIRouter(prefix="/wallet", tags=["Billetera SERVIYA"])

class DepositSchema(BaseModel):
    amount_rd: float
    payment_method: Optional[str] = "TARJETA_SIMULACION"

class WithdrawSchema(BaseModel):
    amount_rd: float
    bank_name: str
    account_type: str
    account_number: str
    account_holder_name: str
    account_holder_cedula: str

@router.get("")
def get_wallet(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        wallet = Wallet(user_id=current_user.id, available_rd=0.0, escrow_rd=0.0, pending_rd=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

    txs = db.query(WalletTransaction).filter(WalletTransaction.user_id == current_user.id).order_by(WalletTransaction.created_at.desc()).all()
    withdrawals = db.query(Withdrawal).filter(Withdrawal.user_id == current_user.id).order_by(Withdrawal.requested_at.desc()).all()

    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    return {
        "wallet": {
            "id": wallet.id,
            "user_id": wallet.user_id,
            "available_rd": wallet.available_rd,
            "escrow_rd": wallet.escrow_rd,
            "pending_rd": wallet.pending_rd,
            "total_received_rd": wallet.total_received_rd,
            "total_spent_rd": wallet.total_spent_rd,
            "can_withdraw": (role_str == "TRABAJADOR")
        },
        "transactions": [
            {
                "id": t.id,
                "type": t.type,
                "amount_rd": t.amount_rd,
                "description": t.description,
                "reference": t.reference,
                "status": t.status,
                "created_at": str(t.created_at)
            } for t in txs
        ],
        "withdrawals": [
            {
                "id": w.id,
                "amount_rd": w.amount_rd,
                "bank_name": w.bank_name,
                "account_type": w.account_type,
                "account_number": w.account_number,
                "status": w.status.value if hasattr(w.status, "value") else str(w.status),
                "requested_at": str(w.requested_at)
            } for w in withdrawals
        ]
    }

@router.post("/deposit")
def deposit(data: DepositSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if data.amount_rd <= 0:
        raise HTTPException(status_code=400, detail="El monto a depositar debe ser mayor que RD$ 0.")

    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        wallet = Wallet(user_id=current_user.id, available_rd=0.0, escrow_rd=0.0, pending_rd=0.0)
        db.add(wallet)

    wallet.available_rd += data.amount_rd
    ref = f"DEP-{uuid.uuid4().hex[:8].upper()}"

    tx = WalletTransaction(
        wallet_id=wallet.id,
        user_id=current_user.id,
        type="depósito",
        amount_rd=data.amount_rd,
        description=f"Depósito simulado via {data.payment_method}",
        reference=ref,
        status="EXITOSO"
    )
    db.add(tx)
    db.commit()

    return {
        "message": f"Depósito de RD$ {data.amount_rd:,.2f} procesado exitosamente.",
        "reference": ref,
        "available_rd": wallet.available_rd
    }

@router.post("/withdraw")
def withdraw(data: WithdrawSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # CRITICAL SECURITY RULE: Only TRABAJADOR role can request bank withdrawals
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != "TRABAJADOR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Solamente los usuarios con rol TRABAJADOR pueden solicitar retiros de fondos."
        )

    if data.amount_rd < settings.MIN_WITHDRAWAL_RD:
        raise HTTPException(
            status_code=400,
            detail=f"El monto mínimo de retiro es RD$ {settings.MIN_WITHDRAWAL_RD:,.2f}"
        )

    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet or wallet.available_rd < data.amount_rd:
        raise HTTPException(status_code=400, detail="Saldo insuficiente en Billetera disponible.")

    wallet.available_rd -= data.amount_rd
    wallet.pending_rd += data.amount_rd

    withdrawal = Withdrawal(
        user_id=current_user.id,
        amount_rd=data.amount_rd,
        bank_name=data.bank_name,
        account_type=data.account_type,
        account_number=data.account_number,
        account_holder_name=data.account_holder_name,
        account_holder_cedula=data.account_holder_cedula,
        status=WithdrawalStatusEnum.PENDIENTE
    )
    db.add(withdrawal)

    tx = WalletTransaction(
        wallet_id=wallet.id,
        user_id=current_user.id,
        type="retiro",
        amount_rd=data.amount_rd,
        description=f"Solicitud de retiro bancario a {data.bank_name}",
        reference=f"WITH-{uuid.uuid4().hex[:8].upper()}",
        status="PENDIENTE"
    )
    db.add(tx)
    db.commit()

    return {
        "message": f"Solicitud de retiro por RD$ {data.amount_rd:,.2f} enviada a revisión administrativa.",
        "withdrawal_id": withdrawal.id,
        "available_rd": wallet.available_rd,
        "pending_rd": wallet.pending_rd
    }
