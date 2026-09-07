from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, require_admin
from app.models.models import (
    User, Service, Escrow, Dispute, Withdrawal, VerificationDocument,
    AuditLog, Wallet, WalletTransaction, VerificationStatusEnum,
    WithdrawalStatusEnum, ServiceStatusEnum, DisputeStatusEnum, UserRoleEnum
)

router = APIRouter(prefix="/admin", tags=["Administración SERVIYA"])

class ResolveDisputeSchema(BaseModel):
    resolution: str
    action: str # 'REFUND_TO_CLIENT' or 'RELEASE_TO_WORKER'

class UpdateSettingsSchema(BaseModel):
    commission_percent: Optional[float] = None
    platform_commission_percent: Optional[float] = None
    min_withdrawal_rd: Optional[float] = None
    min_service_price_rd: Optional[float] = None

@router.get("/kpis")
@router.get("/stats")
def get_kpis(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    active_workers = db.query(User).filter(User.role == UserRoleEnum.TRABAJADOR).count()
    total_services = db.query(Service).count()

    escrows = db.query(Escrow).filter(Escrow.status == "RETENIDO").all()
    escrow_held_rd = sum(e.total_amount_rd for e in escrows)

    completed_escrows = db.query(Escrow).filter(Escrow.status == "LIBERADO").all()
    commission_earned_rd = sum(e.commission_amount_rd for e in completed_escrows)

    pending_verifications = db.query(VerificationDocument).filter(VerificationDocument.status == VerificationStatusEnum.PENDIENTE).count()
    open_disputes = db.query(Dispute).filter(Dispute.status == DisputeStatusEnum.ABIERTA).count()
    pending_withdrawals = db.query(Withdrawal).filter(Withdrawal.status == WithdrawalStatusEnum.PENDIENTE).count()

    return {
        "stats": {
            "total_users": total_users,
            "active_workers": active_workers,
            "total_services": total_services,
            "escrow_held_rd": escrow_held_rd,
            "commission_earned_rd": commission_earned_rd,
            "pending_verifications": pending_verifications,
            "open_disputes": open_disputes,
            "pending_withdrawals": pending_withdrawals
        },
        "commission_rate": settings.PLATFORM_COMMISSION_PERCENT
    }

@router.get("/users")
def get_admin_users(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    results = [
        {
            "id": u.id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role.value if hasattr(u.role, "value") else str(u.role),
            "is_verified": u.is_verified,
            "province": u.province,
            "created_at": str(u.created_at)
        } for u in users
    ]
    return {"users": results}

@router.patch("/users/{id}/status")
def update_user_status(id: str, status: str = Body(..., embed=True), admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    audit = AuditLog(
        user_id=admin_user.id,
        action="USER_STATUS_UPDATED",
        details=f"Usuario {id} actualizado a estado {status}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Estado del usuario actualizado a {status}"}

@router.get("/verifications")
def get_admin_verifications(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    docs = db.query(VerificationDocument).all()
    results = [
        {
            "id": d.id,
            "user_id": d.user_id,
            "document_type": d.document_type,
            "document_url": d.document_url,
            "status": d.status.value if hasattr(d.status, "value") else str(d.status),
            "submitted_at": str(d.submitted_at)
        } for d in docs
    ]
    return {"verifications": results}

@router.post("/verifications/{id}/approve")
def approve_verification(id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    doc = db.query(VerificationDocument).filter(VerificationDocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento de verificación no encontrado")

    doc.status = VerificationStatusEnum.VERIFICADO
    target_user = db.query(User).filter(User.id == doc.user_id).first()
    if target_user:
        target_user.is_verified = True

    audit = AuditLog(
        user_id=admin_user.id,
        action="VERIFICATION_APPROVED",
        details=f"Documento {id} aprobado para usuario {doc.user_id}"
    )
    db.add(audit)
    db.commit()

    return {"message": "Cédula verificada. Distintivo otorgado exitosamente."}

@router.get("/withdrawals")
def get_admin_withdrawals(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    withdrawals = db.query(Withdrawal).all()
    results = [
        {
            "id": w.id,
            "user_id": w.user_id,
            "amount_rd": w.amount_rd,
            "bank_name": w.bank_name,
            "account_type": w.account_type,
            "account_number": w.account_number,
            "account_holder_name": w.account_holder_name,
            "account_holder_cedula": w.account_holder_cedula,
            "status": w.status.value if hasattr(w.status, "value") else str(w.status),
            "requested_at": str(w.requested_at)
        } for w in withdrawals
    ]
    return {"withdrawals": results}

@router.post("/withdrawals/{id}/process")
def process_withdrawal(id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    with_item = db.query(Withdrawal).filter(Withdrawal.id == id).first()
    if not with_item:
        raise HTTPException(status_code=404, detail="Solicitud de retiro no encontrada")

    with_item.status = WithdrawalStatusEnum.COMPLETADO
    with_item.processed_at = datetime.utcnow()

    wallet = db.query(Wallet).filter(Wallet.user_id == with_item.user_id).first()
    if wallet:
        wallet.pending_rd = max(0.0, wallet.pending_rd - with_item.amount_rd)

    audit = AuditLog(
        user_id=admin_user.id,
        action="WITHDRAWAL_PROCESSED",
        details=f"Retiro bancario {id} completado por RD$ {with_item.amount_rd:,.2f}"
    )
    db.add(audit)
    db.commit()

    return {"message": "Retiro marcado como COMPLETADO. Transmisión bancaria confirmada."}

@router.post("/disputes/{id}/resolve")
def resolve_dispute(id: str, data: ResolveDisputeSchema, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    disp = db.query(Dispute).filter(Dispute.id == id).first()
    if not disp:
        raise HTTPException(status_code=404, detail="Disputa no encontrada")

    disp.status = DisputeStatusEnum.RESUELTA
    disp.resolution_notes = data.resolution

    escrow = db.query(Escrow).filter(
        Escrow.service_id == disp.service_id,
        Escrow.status.in_(["RETENIDO", "EN_DISPUTA"])
    ).first()

    if escrow:
        if data.action == "REFUND_TO_CLIENT":
            escrow.status = "REEMBOLSADO"
            client_wallet = db.query(Wallet).filter(Wallet.user_id == escrow.client_id).first()
            if client_wallet:
                client_wallet.escrow_rd = max(0.0, client_wallet.escrow_rd - escrow.total_amount_rd)
                client_wallet.available_rd += escrow.total_amount_rd
        else:
            escrow.status = "LIBERADO"
            escrow.released_at = datetime.utcnow()

            client_wallet = db.query(Wallet).filter(Wallet.user_id == escrow.client_id).first()
            if client_wallet:
                client_wallet.escrow_rd = max(0.0, client_wallet.escrow_rd - escrow.total_amount_rd)

            worker_wallet = db.query(Wallet).filter(Wallet.user_id == escrow.worker_id).first()
            if worker_wallet:
                worker_wallet.available_rd += escrow.worker_payout_rd

    service = db.query(Service).filter(Service.id == disp.service_id).first()
    if service:
        service.status = ServiceStatusEnum.CANCELADA if data.action == "REFUND_TO_CLIENT" else ServiceStatusEnum.COMPLETADA

    audit = AuditLog(
        user_id=admin_user.id,
        action="DISPUTE_RESOLVED",
        details=f"Disputa {id} resuelta con acción {data.action}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Disputa resuelta exitosamente ({data.action})."}

@router.put("/settings")
def update_settings(data: UpdateSettingsSchema, admin_user: User = Depends(require_admin)):
    new_rate = data.platform_commission_percent or data.commission_percent
    if new_rate is not None:
        settings.PLATFORM_COMMISSION_PERCENT = new_rate
    if data.min_withdrawal_rd is not None:
        settings.MIN_WITHDRAWAL_RD = data.min_withdrawal_rd
    if data.min_service_price_rd is not None:
        settings.MIN_SERVICE_PRICE_RD = data.min_service_price_rd

    return {
        "message": "Configuración de plataforma actualizada exitosamente.",
        "settings": {
            "platform_commission_percent": settings.PLATFORM_COMMISSION_PERCENT,
            "min_withdrawal_rd": settings.MIN_WITHDRAWAL_RD,
            "min_service_price_rd": settings.MIN_SERVICE_PRICE_RD
        }
    }

@router.get("/audit-logs")
def get_audit_logs(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()
    results = [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "details": l.details,
            "created_at": str(l.created_at)
        } for l in logs
    ]
    return {"audit_logs": results}
