from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, get_current_active_user
from app.models.models import Service, Escrow, Wallet, WalletTransaction, ServiceStatusEnum, User

router = APIRouter(prefix="/contracts", tags=["Contratos"])

@router.get("")
def list_contracts(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    services = db.query(Service).filter(
        (Service.client_id == current_user.id) | (Service.worker_id == current_user.id)
    ).all()
    
    contracts = []
    for s in services:
        status_str = s.status.value if hasattr(s.status, "value") else str(s.status)
        escrow = db.query(Escrow).filter(Escrow.service_id == s.id).first()
        contracts.append({
            "id": f"contract-{s.id}",
            "service_id": s.id,
            "title": s.title,
            "price_rd": s.price_rd,
            "status": status_str,
            "client_id": s.client_id,
            "worker_id": s.worker_id,
            "escrow_status": escrow.status if escrow else "NO_FINANCIADO",
            "created_at": str(s.created_at)
        })
    return {"contracts": contracts}

@router.get("/{id}")
def get_contract(id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service_id = id.replace("contract-", "")
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Contrato o servicio no encontrado")

    escrow = db.query(Escrow).filter(Escrow.service_id == service.id).first()
    status_str = service.status.value if hasattr(service.status, "value") else str(service.status)
    
    return {
        "contract": {
            "id": f"contract-{service.id}",
            "service_id": service.id,
            "title": service.title,
            "price_rd": service.price_rd,
            "status": status_str,
            "client_id": service.client_id,
            "worker_id": service.worker_id,
            "escrow": {
                "total_amount_rd": escrow.total_amount_rd,
                "commission_amount_rd": escrow.commission_amount_rd,
                "worker_payout_rd": escrow.worker_payout_rd,
                "status": escrow.status
            } if escrow else None
        }
    }

@router.post("/{id}/confirm-completion")
def confirm_completion(id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service_id = id.replace("contract-", "")
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    if service.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solamente el cliente del servicio puede confirmar la finalización.")

    escrow = db.query(Escrow).filter(
        Escrow.service_id == service.id,
        Escrow.status == "RETENIDO"
    ).first()

    if not escrow:
        raise HTTPException(status_code=400, detail="No se encontró pago en custodia retenido para este servicio.")

    # Atomic Escrow Release
    escrow.status = "LIBERADO"
    escrow.released_at = datetime.utcnow()

    service.status = ServiceStatusEnum.COMPLETADA

    # Client Wallet (if any exists)
    client_wallet = db.query(Wallet).filter(Wallet.worker_id == service.client_id).first()
    if client_wallet:
        client_wallet.pending_custody_balance = max(0.0, client_wallet.pending_custody_balance - escrow.total_amount_rd)

    # Worker Wallet: add worker_payout_rd
    worker_wallet = db.query(Wallet).filter(Wallet.worker_id == service.worker_id).first()
    if worker_wallet:
        worker_wallet.available_balance += escrow.worker_payout_rd
        worker_wallet.total_earnings += escrow.worker_payout_rd
        worker_wallet.total_commissions += escrow.commission_amount_rd

        tx = WalletTransaction(
            wallet_id=worker_wallet.id,
            user_id=service.worker_id,
            type="liberacion",
            amount_rd=escrow.worker_payout_rd,
            description=f"Pago por servicio completado #{service.id[:8]}",
            reference=f"RELEASE-{escrow.id[:8]}",
            status="EXITOSO"
        )
        db.add(tx)

    # Increment worker completed jobs
    worker_user = db.query(User).filter(User.id == service.worker_id).first()
    if worker_user:
        worker_user.jobs_completed += 1

    db.commit()

    return {
        "message": "Trabajo confirmado exitosamente. Fondos liberados en Billetera de Técnico.",
        "escrow_released": True,
        "worker_payout_rd": escrow.worker_payout_rd,
        "commission_amount_rd": escrow.commission_amount_rd
    }
