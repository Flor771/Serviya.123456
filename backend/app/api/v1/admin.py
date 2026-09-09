from typing import Optional
from datetime import datetime
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, require_admin
from app.models.models import User, Service, Escrow, BankAccount, UserRoleEnum

router = APIRouter(prefix="/admin", tags=["Administración SERVIYA"])

class BankAccountSchema(BaseModel):
    bank_name: str
    account_number: str
    account_type: Optional[str] = "AHORROS"
    account_holder: Optional[str] = None
    rnc_cedula: Optional[str] = None
    is_active: Optional[bool] = True
    is_primary: Optional[bool] = False

class UpdateBankAccountSchema(BaseModel):
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_type: Optional[str] = None
    account_holder: Optional[str] = None
    rnc_cedula: Optional[str] = None
    is_active: Optional[bool] = None
    is_primary: Optional[bool] = None

class ResolveDisputeSchema(BaseModel):
    resolution: str
    action: str

class UpdateSettingsSchema(BaseModel):
    commission_percent: Optional[float] = None
    platform_commission_percent: Optional[float] = None
    min_withdrawal_rd: Optional[float] = None
    min_service_price_rd: Optional[float] = None


def _audit(db: Session, admin_id: str, action: str, resource: str, target_id: int, details: str):
    db.execute(text("""
        INSERT INTO admin_audit_logs (admin_id, action, resource, target_id, details, timestamp)
        VALUES (:admin_id, :action, :resource, :target_id, :details, :timestamp)
    """), {
        "admin_id": admin_id, "action": action, "resource": resource,
        "target_id": target_id, "details": details, "timestamp": datetime.utcnow(),
    })


def _record_transaction(db: Session, user_id: str, amount: float, tx_type: str, status: str, reference: str):
    db.execute(text("""
        INSERT INTO transactions (user_id, amount, type, status, reference_code, created_at)
        VALUES (:uid, :amount, :type, :status, :reference, :created_at)
    """), {
        "uid": user_id, "amount": amount, "type": tx_type,
        "status": status, "reference": reference, "created_at": datetime.utcnow()
    })


def _record_movement(db: Session, wallet_id: int, amount: float, movement_type: str, description: str):
    db.execute(text("""
        INSERT INTO financial_movements
            (wallet_id, contract_id, movement_type, amount_dop, description, created_at)
        VALUES (:wallet_id, NULL, :movement_type, :amount, :description, :created_at)
    """), {
        "wallet_id": wallet_id, "movement_type": movement_type,
        "amount": amount, "description": description, "created_at": datetime.utcnow(),
    })


@router.get("/kpis")
@router.get("/stats")
def get_kpis(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    active_workers = db.query(User).filter(User.role == UserRoleEnum.TRABAJADOR, User.is_active.is_(True)).count()
    total_services = db.query(Service).count()
    escrow_held_rd = db.execute(text("SELECT COALESCE(SUM(total_amount_rd),0) FROM escrows WHERE status = 'RETENIDO'" )).scalar() or 0
    commission_earned_rd = db.execute(text("SELECT COALESCE(SUM(commission_amount_rd),0) FROM escrows WHERE status = 'LIBERADO'" )).scalar() or 0
    pending_verifications = db.execute(text("SELECT COUNT(*) FROM verifications WHERE status = 'PENDIENTE'" )).scalar() or 0
    open_disputes = db.execute(text("SELECT COUNT(*) FROM disputes WHERE status IN ('ABIERTA','EN_REVISION') AND service_id IS NOT NULL" )).scalar() or 0
    pending_withdrawals = db.execute(text("SELECT COUNT(*) FROM withdrawals WHERE status = 'PENDIENTE'" )).scalar() or 0
    return {"stats": {
        "total_users": total_users, "active_workers": active_workers,
        "total_services": total_services, "escrow_held_rd": float(escrow_held_rd),
        "commission_earned_rd": float(commission_earned_rd),
        "pending_verifications": int(pending_verifications), "open_disputes": int(open_disputes),
        "pending_withdrawals": int(pending_withdrawals)
    }, "commission_rate": settings.PLATFORM_COMMISSION_PERCENT}


@router.get("/users")
def get_admin_users(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return {"users": [{
        "id": u.id, "first_name": u.first_name, "last_name": u.last_name,
        "email": u.email, "phone": u.phone,
        "role": u.role.value if hasattr(u.role, "value") else str(u.role),
        "is_verified": u.is_verified, "is_active": bool(u.is_active) if u.is_active is not None else True,
        "status": "ACTIVO" if u.is_active is not False else "SUSPENDIDO",
        "province": u.province, "created_at": str(u.created_at)
    } for u in users]}


@router.patch("/users/{id}/status")
def update_user_status(id: str, status: str = Body(..., embed=True), admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    normalized = str(status).strip().upper()
    if normalized in {"SUSPENDIDO", "SUSPENDED", "INACTIVO", "INACTIVE", "BLOQUEADO", "BLOCKED"}:
        new_active = False
        canonical = "SUSPENDIDO"
    elif normalized in {"ACTIVO", "ACTIVE", "REACTIVADO", "REACTIVATE"}:
        new_active = True
        canonical = "ACTIVO"
    else:
        raise HTTPException(status_code=400, detail="Estado no válido. Use ACTIVO o SUSPENDIDO.")
    if user.id == admin_user.id and new_active is False:
        raise HTTPException(status_code=400, detail="Un administrador no puede suspenderse a sí mismo.")
    if user.role == UserRoleEnum.ADMIN and user.id != admin_user.id:
        raise HTTPException(status_code=403, detail="No se permite suspender o reactivar otra cuenta de administrador desde este panel.")
    user.is_active = new_active
    _audit(db, admin_user.id, "USER_SUSPENDED" if not new_active else "USER_REACTIVATED", "users", 0, f"Usuario {id}: {canonical}")
    db.commit()
    return {"message": f"Usuario {canonical.lower()} correctamente.", "user_id": id, "status": canonical, "is_active": new_active}


@router.get("/verifications")
def get_admin_verifications(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, worker_id, document_type, document_url, status, admin_feedback, created_at
        FROM verifications ORDER BY created_at DESC
    """)).mappings().all()
    return {"verifications": [{
        "id": r["id"], "user_id": r["worker_id"], "document_type": r["document_type"],
        "document_url": r["document_url"], "status": r["status"],
        "notes": r["admin_feedback"], "submitted_at": str(r["created_at"])
    } for r in rows]}


@router.post("/verifications/{id}/approve")
def approve_verification(id: int, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT worker_id, status FROM verifications WHERE id = :id"), {"id": id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Documento de verificación no encontrado")
    db.execute(text("UPDATE verifications SET status = 'VERIFICADO', admin_feedback = NULL WHERE id = :id"), {"id": id})
    db.execute(text("UPDATE users SET is_verified = true WHERE id = :uid"), {"uid": row["worker_id"]})
    _audit(db, admin_user.id, "VERIFICATION_APPROVED", "verifications", id, f"Documento aprobado para usuario {row['worker_id']}")
    db.commit()
    return {"message": "Cédula verificada. Distintivo otorgado exitosamente."}


@router.get("/withdrawals")
def get_admin_withdrawals(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, worker_id, amount, method, account_number, account_type, status, created_at
        FROM withdrawals ORDER BY created_at DESC
    """)).mappings().all()
    return {"withdrawals": [{
        "id": r["id"], "user_id": r["worker_id"], "worker_id": r["worker_id"],
        "amount_rd": float(r["amount"]), "amount": float(r["amount"]),
        "bank_name": r["method"], "method": r["method"],
        "account_type": r["account_type"], "account_number": r["account_number"],
        "account_holder_name": None, "account_holder_cedula": None,
        "status": r["status"], "requested_at": str(r["created_at"]), "created_at": str(r["created_at"])
    } for r in rows]}


@router.post("/withdrawals/{id}/process")
def process_withdrawal(id: int, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT id, worker_id, amount, status FROM withdrawals WHERE id = :id FOR UPDATE"), {"id": id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Solicitud de retiro no encontrada")
    if row["status"] != "PENDIENTE":
        raise HTTPException(status_code=409, detail="El retiro ya fue procesado o no está pendiente")
    wallet = db.execute(text("SELECT id, pending_custody_balance, total_withdrawn FROM wallets WHERE worker_id = :uid FOR UPDATE"), {"uid": row["worker_id"]}).mappings().first()
    if not wallet:
        raise HTTPException(status_code=400, detail="El trabajador no tiene billetera")
    amount = float(row["amount"])
    db.execute(text("UPDATE withdrawals SET status = 'COMPLETADO' WHERE id = :id"), {"id": id})
    db.execute(text("UPDATE wallets SET pending_custody_balance = GREATEST(0, pending_custody_balance - :amount), total_withdrawn = COALESCE(total_withdrawn, 0) + :amount WHERE id = :wallet_id"), {"amount": amount, "wallet_id": wallet["id"]})
    _record_transaction(db, row["worker_id"], amount, "RETIRO_PROCESADO", "COMPLETADO", f"WITHDRAWAL-{id}")
    _record_movement(db, wallet["id"], -amount, "RETIRO_PROCESADO", f"Retiro {id} procesado por administración")
    _audit(db, admin_user.id, "WITHDRAWAL_PROCESSED", "withdrawals", id, f"Retiro procesado por RD$ {amount:,.2f}")
    db.execute(text("INSERT INTO notifications (id, user_id, title, message, type, read, related_entity_id, created_at) VALUES (:nid, :uid, 'Retiro procesado', 'Tu retiro fue marcado como completado.', 'RETIRO', false, :related, :created_at)"), {"nid": uuid4().hex, "uid": row["worker_id"], "related": str(id), "created_at": datetime.utcnow()})
    db.commit()
    return {"message": "Retiro marcado como COMPLETADO y registrado financieramente."}


@router.post("/disputes/{id}/resolve")
def resolve_dispute(id: int, data: ResolveDisputeSchema, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if data.action not in {"REFUND_TO_CLIENT", "RELEASE_TO_WORKER"}:
        raise HTTPException(status_code=400, detail="Acción de resolución no válida")
    disp = db.execute(text("SELECT id, service_id, opened_by_user_id, against_user_id, status FROM disputes WHERE id = :id FOR UPDATE"), {"id": id}).mappings().first()
    if not disp:
        raise HTTPException(status_code=404, detail="Disputa no encontrada")
    if not disp["service_id"]:
        raise HTTPException(status_code=400, detail="La disputa histórica no pertenece al flujo actual de servicios")
    if disp["status"] in {"RESUELTA", "CERRADA"}:
        raise HTTPException(status_code=409, detail="La disputa ya fue resuelta")
    escrow = db.execute(text("SELECT id, client_id, worker_id, total_amount_rd, commission_amount_rd, worker_payout_rd, status FROM escrows WHERE service_id = :sid AND status IN ('RETENIDO','EN_DISPUTA') ORDER BY created_at DESC LIMIT 1 FOR UPDATE"), {"sid": disp["service_id"]}).mappings().first()
    if not escrow:
        raise HTTPException(status_code=400, detail="No existe custodia activa para esta disputa")
    amount = float(escrow["total_amount_rd"])
    if data.action == "REFUND_TO_CLIENT":
        db.execute(text("UPDATE escrows SET status = 'REEMBOLSADO' WHERE id = :eid"), {"eid": escrow["id"]})
        db.execute(text("UPDATE services SET status = 'CANCELADA' WHERE id = :sid"), {"sid": disp["service_id"]})
        _record_transaction(db, escrow["client_id"], amount, "REEMBOLSO_CUSTODIA", "COMPLETADO", f"DISPUTE-REFUND-{id}")
        message = "Disputa resuelta a favor del cliente. El pago fue marcado como reembolsado."
    else:
        worker_wallet = db.execute(text("SELECT id FROM wallets WHERE worker_id = :uid FOR UPDATE"), {"uid": escrow["worker_id"]}).mappings().first()
        if not worker_wallet:
            raise HTTPException(status_code=400, detail="El trabajador no tiene billetera")
        db.execute(text("UPDATE escrows SET status = 'LIBERADO', released_at = :now WHERE id = :eid"), {"eid": escrow["id"], "now": datetime.utcnow()})
        db.execute(text("UPDATE wallets SET available_balance = COALESCE(available_balance,0) + :payout, total_earnings = COALESCE(total_earnings,0) + :payout, total_commissions = COALESCE(total_commissions,0) + :commission WHERE id = :wid"), {"wid": worker_wallet["id"], "payout": float(escrow["worker_payout_rd"]), "commission": float(escrow["commission_amount_rd"])})
        _record_movement(db, worker_wallet["id"], float(escrow["worker_payout_rd"]), "LIBERACION_DISPUTA", f"Liberación de disputa {id}")
        _record_transaction(db, escrow["worker_id"], float(escrow["worker_payout_rd"]), "LIBERACION_CUSTODIA", "COMPLETADO", f"DISPUTE-RELEASE-{id}")
        db.execute(text("UPDATE services SET status = 'COMPLETADA' WHERE id = :sid"), {"sid": disp["service_id"]})
        message = "Disputa resuelta a favor del trabajador. El pago fue liberado."
    db.execute(text("UPDATE disputes SET status = 'RESUELTA', admin_notes = :notes, resolution_notes = :notes WHERE id = :id"), {"id": id, "notes": data.resolution})
    _audit(db, admin_user.id, "DISPUTE_RESOLVED", "disputes", id, f"Acción {data.action}: {data.resolution}")
    for uid in {disp["opened_by_user_id"], disp["against_user_id"]}:
        if uid:
            db.execute(text("INSERT INTO notifications (id, user_id, title, message, type, read, related_entity_id, created_at) VALUES (:nid, :uid, 'Disputa resuelta', :message, 'DISPUTA', false, :related, :created_at)"), {"nid": uuid4().hex, "uid": uid, "message": message, "related": str(id), "created_at": datetime.utcnow()})
    db.commit()
    return {"message": message}


@router.put("/settings")
def update_settings(data: UpdateSettingsSchema, admin_user: User = Depends(require_admin)):
    new_rate = data.platform_commission_percent if data.platform_commission_percent is not None else data.commission_percent
    if new_rate is not None:
        settings.PLATFORM_COMMISSION_PERCENT = new_rate
    if data.min_withdrawal_rd is not None:
        settings.MIN_WITHDRAWAL_RD = data.min_withdrawal_rd
    if data.min_service_price_rd is not None:
        settings.MIN_SERVICE_PRICE_RD = data.min_service_price_rd
    return {"message": "Configuración de plataforma actualizada exitosamente.", "settings": {"platform_commission_percent": settings.PLATFORM_COMMISSION_PERCENT, "min_withdrawal_rd": settings.MIN_WITHDRAWAL_RD, "min_service_price_rd": settings.MIN_SERVICE_PRICE_RD}}


@router.get("/audit-logs")
def get_audit_logs(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT id, admin_id, action, resource, target_id, details, timestamp FROM admin_audit_logs ORDER BY timestamp DESC NULLS LAST, id DESC")).mappings().all()
    return {"audit_logs": [{"id": r["id"], "user_id": r["admin_id"], "admin_id": r["admin_id"], "action": r["action"], "resource": r["resource"], "target_id": r["target_id"], "details": r["details"], "created_at": str(r["timestamp"])} for r in rows]}


@router.get("/bank-accounts")
def get_admin_bank_accounts(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    accounts = db.query(BankAccount).order_by(BankAccount.is_primary.desc(), BankAccount.id.asc()).all()
    return {"bank_accounts": [{"id": a.id, "bank_name": a.bank_name, "account_number": a.account_number, "account_type": a.account_type, "account_holder": a.account_holder, "rnc_cedula": a.rnc_cedula, "is_active": a.is_active if a.is_active is not None else True, "is_primary": a.is_primary if a.is_primary is not None else False} for a in accounts]}


@router.post("/bank-accounts")
def create_admin_bank_account(data: BankAccountSchema, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if data.is_primary:
        db.query(BankAccount).update({BankAccount.is_primary: False})
    account = BankAccount(bank_name=data.bank_name, account_number=data.account_number, account_type=data.account_type, account_holder=data.account_holder, rnc_cedula=data.rnc_cedula, is_active=data.is_active if data.is_active is not None else True, is_primary=data.is_primary if data.is_primary is not None else False)
    db.add(account); db.commit(); db.refresh(account)
    return {"message": "Cuenta bancaria agregada exitosamente.", "bank_account": {"id": account.id, "bank_name": account.bank_name, "account_number": account.account_number, "account_type": account.account_type, "account_holder": account.account_holder, "rnc_cedula": account.rnc_cedula, "is_active": account.is_active, "is_primary": account.is_primary}}


@router.put("/bank-accounts/{account_id}")
def update_admin_bank_account(account_id: int, data: UpdateBankAccountSchema, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada.")
    if data.is_primary:
        db.query(BankAccount).filter(BankAccount.id != account_id).update({BankAccount.is_primary: False})
    for field in ("bank_name", "account_number", "account_type", "account_holder", "rnc_cedula", "is_active", "is_primary"):
        value = getattr(data, field)
        if value is not None:
            setattr(account, field, value)
    db.commit(); db.refresh(account)
    return {"message": "Cuenta bancaria actualizada exitosamente.", "bank_account": {"id": account.id, "bank_name": account.bank_name, "account_number": account.account_number, "account_type": account.account_type, "account_holder": account.account_holder, "rnc_cedula": account.rnc_cedula, "is_active": account.is_active, "is_primary": account.is_primary}}


@router.delete("/bank-accounts/{account_id}")
def delete_admin_bank_account(account_id: int, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada.")
    db.delete(account); db.commit()
    return {"message": "Cuenta bancaria eliminada exitosamente."}
