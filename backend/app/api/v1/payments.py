import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, get_current_active_user
from app.models.models import Service, Escrow, Wallet, WalletTransaction, ServiceStatusEnum, User

router = APIRouter(prefix="/payments", tags=["Pagos y Custodia (Escrow)"])

class EscrowPaymentSchema(BaseModel):
    service_id: str

class EscrowReleaseSchema(BaseModel):
    escrow_id: str

class RefundSchema(BaseModel):
    service_id: str
    reason: Optional[str] = "Cancelación de servicio"

@router.post("/escrow")
def pay_escrow(data: EscrowPaymentSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == data.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    if service.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solamente el cliente puede pagar la custodia de este servicio")

    if not service.worker_id:
        raise HTTPException(status_code=400, detail="Debe seleccionar un técnico antes de realizar el pago.")

    # Check if already paid
    existing_escrow = db.query(Escrow).filter(
        Escrow.service_id == service.id,
        Escrow.status == "RETENIDO"
    ).first()
    if existing_escrow:
        raise HTTPException(status_code=400, detail="Este servicio ya tiene su pago retenido en Custodia SERVIYA.")

    amount = service.price_rd
    wallet = db.query(Wallet).filter(Wallet.worker_id == current_user.id).first()
    if wallet and wallet.available_balance < amount:
        raise HTTPException(
            status_code=400,
            detail=f"Saldo insuficiente en Billetera. Necesita RD$ {amount:,.2f} y dispone de RD$ {wallet.available_balance:,.2f}."
        )

    # Calculate Commission (8%)
    commission_rate = settings.PLATFORM_COMMISSION_PERCENT
    commission_amount = amount * (commission_rate / 100.0)
    worker_payout = amount - commission_amount

    if wallet:
        wallet.available_balance -= amount
        wallet.pending_custody_balance += amount

    escrow = Escrow(
        service_id=service.id,
        client_id=current_user.id,
        worker_id=service.worker_id,
        total_amount_rd=amount,
        commission_rate_percent=commission_rate,
        commission_amount_rd=commission_amount,
        worker_payout_rd=worker_payout,
        status="RETENIDO"
    )
    db.add(escrow)

    service.status = ServiceStatusEnum.EN_PROGRESO

    ref = f"ESCROW-{uuid.uuid4().hex[:8].upper()}"
    if wallet:
        tx = WalletTransaction(
            wallet_id=wallet.id,
            user_id=current_user.id,
            type="pago",
            amount_rd=amount,
            description=f"Pago en Custodia SERVIYA para servicio #{service.id[:8]}",
            reference=ref,
            status="EXITOSO"
        )
        db.add(tx)

    db.commit()

    return {
        "message": f"Pago de RD$ {amount:,.2f} protegido exitosamente en Custodia SERVIYA.do",
        "escrow_id": escrow.id,
        "reference": ref,
        "status": "RETENIDO"
    }

@router.post("/release")
def release_escrow(data: EscrowReleaseSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    escrow = db.query(Escrow).filter(Escrow.id == data.escrow_id).first()
    if not escrow:
        raise HTTPException(status_code=404, detail="Registro de Custodia no encontrado")

    if escrow.status != "RETENIDO":
        raise HTTPException(status_code=400, detail=f"El escrow ya se encuentra en estado {escrow.status}")

    if escrow.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solamente el cliente creador puede autorizar la liberación.")

    escrow.status = "LIBERADO"
    escrow.released_at = datetime.utcnow()

    # Update Client Wallet (if any exists)
    client_wallet = db.query(Wallet).filter(Wallet.worker_id == escrow.client_id).first()
    if client_wallet:
        client_wallet.pending_custody_balance = max(0.0, client_wallet.pending_custody_balance - escrow.total_amount_rd)

    # Update Worker Wallet
    worker_wallet = db.query(Wallet).filter(Wallet.worker_id == escrow.worker_id).first()
    if worker_wallet:
        worker_wallet.available_balance += escrow.worker_payout_rd
        worker_wallet.total_earnings += escrow.worker_payout_rd
        worker_wallet.total_commissions += escrow.commission_amount_rd

        tx = WalletTransaction(
            wallet_id=worker_wallet.id,
            user_id=escrow.worker_id,
            type="liberacion",
            amount_rd=escrow.worker_payout_rd,
            description=f"Liberación de fondos de servicio #{escrow.service_id[:8]}",
            reference=f"RELEASE-{escrow.id[:8]}",
            status="EXITOSO"
        )
        db.add(tx)

    service = db.query(Service).filter(Service.id == escrow.service_id).first()
    if service:
        service.status = ServiceStatusEnum.COMPLETADA

    db.commit()
    return {
        "message": "Fondos liberados exitosamente al técnico.",
        "worker_payout_rd": escrow.worker_payout_rd
    }

@router.post("/refund")
def refund_escrow(data: RefundSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    escrow = db.query(Escrow).filter(
        Escrow.service_id == data.service_id,
        Escrow.status.in_(["RETENIDO", "EN_DISPUTA"])
    ).first()

    if not escrow:
        raise HTTPException(status_code=404, detail="No se encontró un pago retenido activo para este servicio.")

    escrow.status = "REEMBOLSADO"

    client_wallet = db.query(Wallet).filter(Wallet.worker_id == escrow.client_id).first()
    if client_wallet:
        client_wallet.pending_custody_balance = max(0.0, client_wallet.pending_custody_balance - escrow.total_amount_rd)
        client_wallet.available_balance += escrow.total_amount_rd

        tx = WalletTransaction(
            wallet_id=client_wallet.id,
            user_id=escrow.client_id,
            type="reembolso",
            amount_rd=escrow.total_amount_rd,
            description=f"Reembolso por resolución de servicio #{data.service_id[:8]}",
            reference=f"REFUND-{uuid.uuid4().hex[:8].upper()}",
            status="EXITOSO"
        )
        db.add(tx)

    service = db.query(Service).filter(Service.id == data.service_id).first()
    if service:
        service.status = ServiceStatusEnum.CANCELADA

    db.commit()

    return {
        "message": f"Reembolso de RD$ {escrow.total_amount_rd:,.2f} acreditado exitosamente al saldo del cliente.",
        "refund_amount_rd": escrow.total_amount_rd
    }
