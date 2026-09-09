import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, get_current_active_user
from app.models.models import Service, Escrow, Wallet, ServiceStatusEnum, User

router = APIRouter(prefix="/payments", tags=["Pagos y Custodia (Escrow)"])

class EscrowPaymentSchema(BaseModel):
    service_id: str

class EscrowReleaseSchema(BaseModel):
    escrow_id: str

class RefundSchema(BaseModel):
    service_id: str
    reason: Optional[str] = "Cancelación de servicio"


def _record_transaction(db: Session, user_id: str, amount: float, tx_type: str, status_value: str, description: str, reference: str):
    db.execute(text("""
        INSERT INTO transactions (user_id, amount, type, status, reference_code, created_at)
        VALUES (:user_id, :amount, :type, :status, :reference, CURRENT_TIMESTAMP)
    """), {
        "user_id": user_id, "amount": amount, "type": tx_type,
        "status": status_value, "reference": reference
    })


def _record_financial_movement(db: Session, wallet_id: int, amount: float, movement_type: str, description: str):
    db.execute(text("""
        INSERT INTO financial_movements (wallet_id, contract_id, movement_type, amount_dop, description, created_at)
        VALUES (:wallet_id, NULL, :movement_type, :amount, :description, CURRENT_TIMESTAMP)
    """), {
        "wallet_id": wallet_id, "movement_type": movement_type,
        "amount": amount, "description": description
    })


@router.post("/escrow")
def pay_escrow(data: EscrowPaymentSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == data.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if service.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solamente el cliente puede pagar la custodia de este servicio")
    if not service.worker_id:
        raise HTTPException(status_code=400, detail="Debe seleccionar un técnico antes de realizar el pago.")

    existing_escrow = db.query(Escrow).filter(
        Escrow.service_id == service.id,
        Escrow.status == "RETENIDO"
    ).first()
    if existing_escrow:
        raise HTTPException(status_code=400, detail="Este servicio ya tiene su pago retenido en Custodia SERVIYA.")

    amount = float(service.price_rd)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="El monto del servicio debe ser mayor que RD$ 0.")

    commission_rate = float(settings.PLATFORM_COMMISSION_PERCENT)
    commission_amount = amount * (commission_rate / 100.0)
    worker_payout = amount - commission_amount

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
    _record_transaction(
        db, current_user.id, amount, "PAGO_CUSTODIA", "RETENIDO",
        f"Pago en Custodia SERVIYA para servicio #{service.id[:8]}", ref
    )
    db.commit()
    db.refresh(escrow)

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

    worker_wallet = db.query(Wallet).filter(Wallet.worker_id == escrow.worker_id).first()
    if not worker_wallet:
        worker_wallet = Wallet(worker_id=escrow.worker_id, available_balance=0.0, pending_custody_balance=0.0,
                               total_earnings=0.0, total_commissions=0.0, total_withdrawn=0.0)
        db.add(worker_wallet)
        db.flush()

    escrow.status = "LIBERADO"
    escrow.released_at = datetime.utcnow()
    worker_wallet.available_balance += escrow.worker_payout_rd
    worker_wallet.total_earnings += escrow.worker_payout_rd
    worker_wallet.total_commissions += escrow.commission_amount_rd

    _record_financial_movement(
        db, worker_wallet.id, escrow.worker_payout_rd, "LIBERACION_SERVICIO",
        f"Liberación de fondos del servicio #{escrow.service_id[:8]}"
    )
    _record_transaction(
        db, escrow.worker_id, escrow.worker_payout_rd, "LIBERACION", "EXITOSO",
        f"Fondos liberados del servicio #{escrow.service_id[:8]}", f"RELEASE-{escrow.id[:8]}"
    )

    service = db.query(Service).filter(Service.id == escrow.service_id).first()
    if service:
        service.status = ServiceStatusEnum.COMPLETADA
        worker = db.query(User).filter(User.id == escrow.worker_id).first()
        if worker:
            worker.jobs_completed = (worker.jobs_completed or 0) + 1

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
    if escrow.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solamente el cliente creador puede solicitar este reembolso.")

    escrow.status = "REEMBOLSADO"
    service = db.query(Service).filter(Service.id == data.service_id).first()
    if service:
        service.status = ServiceStatusEnum.CANCELADA

    ref = f"REFUND-{uuid.uuid4().hex[:8].upper()}"
    _record_transaction(
        db, escrow.client_id, escrow.total_amount_rd, "REEMBOLSO", "EXITOSO",
        f"Reembolso por cancelación del servicio #{data.service_id[:8]}", ref
    )
    db.commit()

    return {
        "message": f"Reembolso de RD$ {escrow.total_amount_rd:,.2f} registrado exitosamente para el cliente.",
        "refund_amount_rd": escrow.total_amount_rd,
        "reference": ref
    }
