from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.models.models import User
import uuid

router = APIRouter(prefix="/admin", tags=["Disputas administrativas seguras"])

class DisputeResolution(BaseModel):
    resolution: str = Field(default="", max_length=100)
    notes: str = Field(default="", max_length=1500)
    action: str | None = None


def _notify(db, user_id, title, message, kind, related):
    if user_id:
        db.execute(text("INSERT INTO notifications (id,user_id,title,message,type,read,related_entity_id,created_at) VALUES (:id,:u,:t,:m,:k,false,:r,CURRENT_TIMESTAMP)"), {"id": uuid.uuid4().hex, "u": user_id, "t": title, "m": message, "k": kind, "r": related})


def _audit(db, admin_id, action, target_id, details):
    db.execute(text("INSERT INTO admin_audit_logs (admin_id,action,resource,target_id,details,timestamp) VALUES (:a,:action,'disputes',:id,:details,CURRENT_TIMESTAMP)"), {"a": admin_id, "action": action, "id": str(target_id), "details": details})


def _normalize_resolution(data: DisputeResolution) -> str:
    action = (data.action or "").strip().upper()
    resolution = (data.resolution or "").strip().upper()
    if action == "REFUND_TO_CLIENT" or resolution in {"CLIENTE", "REEMBOLSO AL CLIENTE", "FAVOR DEL CLIENTE"}:
        return "CLIENTE"
    if action == "RELEASE_TO_WORKER" or resolution in {"TRABAJADOR", "LIBERACIÓN AL TRABAJADOR", "FAVOR DEL TRABAJADOR"}:
        return "TRABAJADOR"
    if resolution == "MANTENER":
        return "MANTENER"
    raise HTTPException(400, "Resolución no válida. Usa CLIENTE, TRABAJADOR o MANTENER.")


@router.post("/disputes/{dispute_id}/resolve")
def resolve_dispute_snapshot(dispute_id: str, data: DisputeResolution, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    resolution = _normalize_resolution(data)
    notes = (data.notes or "").strip() or "Resolución administrativa de la disputa."
    dispute = db.execute(text("""
        SELECT d.id,d.service_id,d.opened_by_user_id,d.against_user_id,d.status,
               s.client_id,s.worker_id,
               e.id AS escrow_id,e.total_amount_rd,e.commission_amount_rd,e.worker_payout_rd,
               e.gross_service_amount_rd,e.platform_commission_rd,e.isr_withheld_rd,e.itbis_withheld_rd,
               e.net_worker_payout_rd,e.fiscal_rule_code,e.tax_mode,e.status AS escrow_status
        FROM disputes d
        JOIN services s ON s.id=d.service_id
        LEFT JOIN escrows e ON e.service_id=d.service_id
        WHERE d.id=:id AND d.status IN ('ABIERTA','EN_REVISION')
        ORDER BY e.created_at DESC LIMIT 1 FOR UPDATE
    """), {"id": dispute_id}).mappings().first()
    if not dispute:
        raise HTTPException(404, "Disputa activa no encontrada")
    if not dispute["escrow_id"] or dispute["escrow_status"] not in ("EN_DISPUTA", "RETENIDO"):
        raise HTTPException(409, "La disputa no tiene una Custodia activa que pueda resolverse")

    if resolution == "MANTENER":
        db.execute(text("UPDATE disputes SET status='EN_REVISION',resolution_notes=:notes WHERE id=:id"), {"id": dispute_id, "notes": notes})
        db.execute(text("UPDATE escrows SET status='EN_DISPUTA' WHERE id=:id"), {"id": dispute["escrow_id"]})
        db.execute(text("UPDATE services SET status='EN_DISPUTA' WHERE id=:id"), {"id": dispute["service_id"]})
        _notify(db, dispute["opened_by_user_id"], "Disputa en revisión", f"Administración mantiene la disputa en revisión. Motivo: {notes}", "DISPUTA", dispute_id)
        _notify(db, dispute["against_user_id"], "Disputa en revisión", f"Administración mantiene la disputa en revisión. Motivo: {notes}", "DISPUTA", dispute_id)
        _audit(db, admin_user.id, "ADMIN_DISPUTE_REVIEW", dispute_id, notes)
        db.commit()
        return {"message": "La disputa quedó en revisión y el dinero permanece congelado en Custodia.", "status": "EN_REVISION", "resolution": "MANTENER"}

    gross = float(dispute["gross_service_amount_rd"] if dispute["gross_service_amount_rd"] is not None else (dispute["total_amount_rd"] or 0))
    commission = float(dispute["platform_commission_rd"] if dispute["platform_commission_rd"] is not None else (dispute["commission_amount_rd"] or 0))
    isr = float(dispute["isr_withheld_rd"] or 0)
    itbis = float(dispute["itbis_withheld_rd"] or 0)
    net = float(dispute["net_worker_payout_rd"] if dispute["net_worker_payout_rd"] is not None else (dispute["worker_payout_rd"] or 0))
    if any(v < 0 for v in (gross, commission, isr, itbis, net)):
        raise HTTPException(409, "El snapshot financiero contiene valores negativos.")
    if commission > gross:
        raise HTTPException(409, "La comisión histórica supera el monto bruto.")
    has_snapshot = dispute["gross_service_amount_rd"] is not None or dispute["platform_commission_rd"] is not None or dispute["net_worker_payout_rd"] is not None
    if has_snapshot:
        if abs((commission + isr + itbis + net) - gross) > 0.01:
            raise HTTPException(409, "El snapshot fiscal no cuadra y la disputa no puede liquidarse automáticamente.")
    elif abs((commission + net) - gross) > 0.01:
        raise HTTPException(409, "La liquidación histórica no cuadra con el bruto.")

    if resolution == "TRABAJADOR":
        wallet = db.execute(text("SELECT id,pending_custody_balance FROM wallets WHERE worker_id=:w FOR UPDATE"), {"w": dispute["worker_id"]}).mappings().first()
        if not wallet:
            db.execute(text("INSERT INTO wallets (worker_id,available_balance,pending_custody_balance,total_earnings,total_commissions,total_withdrawn) VALUES (:w,0,0,0,0,0)"), {"w": dispute["worker_id"]})
            wallet = db.execute(text("SELECT id,pending_custody_balance FROM wallets WHERE worker_id=:w FOR UPDATE"), {"w": dispute["worker_id"]}).mappings().one()
        if float(wallet["pending_custody_balance"] or 0) + 0.01 < gross:
            raise HTTPException(409, "El saldo de Custodia del trabajador no cubre el monto histórico de la disputa.")
        db.execute(text("UPDATE escrows SET status='LIBERADO',released_at=CURRENT_TIMESTAMP,commission_amount_rd=:c,worker_payout_rd=:p WHERE id=:id AND status IN ('EN_DISPUTA','RETENIDO')"), {"id": dispute["escrow_id"], "c": commission, "p": net})
        db.execute(text("UPDATE wallets SET available_balance=COALESCE(available_balance,0)+:p,pending_custody_balance=COALESCE(pending_custody_balance,0)-:g,total_earnings=COALESCE(total_earnings,0)+:p,total_commissions=COALESCE(total_commissions,0)+:c WHERE id=:id"), {"id": wallet["id"], "p": net, "g": gross, "c": commission})
        ref = f"DISPUTE-RELEASE-{str(dispute_id)[:8].upper()}"
        db.execute(text("INSERT INTO wallet_transactions (id,wallet_id,user_id,type,amount_rd,description,reference,status,created_at) SELECT :id,:wid,:u,'LIBERACION_DISPUTA',:p,:d,:ref,'EXITOSO',CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE reference=:ref)"), {"id": str(uuid.uuid4()), "wid": wallet["id"], "u": dispute["worker_id"], "p": net, "d": f"Resolución administrativa de disputa {dispute_id}", "ref": ref})
        db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) SELECT :u,:p,'LIBERACION_DISPUTA','COMPLETADO',:ref,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE user_id=:u AND reference_code=:ref)"), {"u": dispute["worker_id"], "p": net, "ref": ref})
        db.execute(text("UPDATE services SET status='COMPLETADA' WHERE id=:id"), {"id": dispute["service_id"]})
        message = f"Administración resolvió la disputa a favor del trabajador. Se liberaron RD$ {net:,.2f} usando el snapshot histórico."
        _notify(db, dispute["worker_id"], "Disputa resuelta a tu favor", message, "DISPUTA_RESUELTA", dispute_id)
        _notify(db, dispute["client_id"], "Disputa resuelta", f"Administración resolvió la disputa a favor del trabajador. Motivo: {notes}", "DISPUTA_RESUELTA", dispute_id)
    else:
        client_wallet = db.execute(text("SELECT id FROM client_wallets WHERE client_id=:c FOR UPDATE"), {"c": dispute["client_id"]}).mappings().first()
        if not client_wallet:
            db.execute(text("INSERT INTO client_wallets (client_id) VALUES (:c) ON CONFLICT (client_id) DO NOTHING"), {"c": dispute["client_id"]})
            client_wallet = db.execute(text("SELECT id FROM client_wallets WHERE client_id=:c FOR UPDATE"), {"c": dispute["client_id"]}).mappings().one()
        ref = f"DISPUTE-REFUND-{str(dispute_id)[:8].upper()}"
        db.execute(text("UPDATE escrows SET status='REEMBOLSADO',released_at=CURRENT_TIMESTAMP WHERE id=:id AND status IN ('EN_DISPUTA','RETENIDO')"), {"id": dispute["escrow_id"]})
        db.execute(text("UPDATE client_wallets SET available_balance=COALESCE(available_balance,0)+:a,total_refunded=COALESCE(total_refunded,0)+:a,updated_at=CURRENT_TIMESTAMP WHERE id=:id"), {"a": gross, "id": client_wallet["id"]})
        db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) SELECT :u,:a,'REEMBOLSO_ADMIN','EXITOSO',:ref,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE user_id=:u AND reference_code=:ref)"), {"u": dispute["client_id"], "a": gross, "ref": ref})
        db.execute(text("UPDATE services SET status='CANCELADA' WHERE id=:id"), {"id": dispute["service_id"]})
        message = f"Administración resolvió la disputa a favor del cliente. RD$ {gross:,.2f} fue acreditado como reembolso administrativo."
        _notify(db, dispute["client_id"], "Disputa resuelta a tu favor", message, "DISPUTA_RESUELTA", dispute_id)
        _notify(db, dispute["worker_id"], "Disputa resuelta", f"Administración resolvió la disputa a favor del cliente. Motivo: {notes}", "DISPUTA_RESUELTA", dispute_id)

    db.execute(text("UPDATE disputes SET status='RESUELTA',resolution_notes=:notes WHERE id=:id"), {"id": dispute_id, "notes": notes})
    _audit(db, admin_user.id, f"ADMIN_DISPUTE_RESOLVE_{resolution}", dispute_id, f"{notes} | gross={gross}; commission={commission}; isr={isr}; itbis={itbis}; net={net}; fiscal_rule={dispute['fiscal_rule_code'] or 'PENDIENTE_CLASIFICACION'}; tax_mode={dispute['tax_mode'] or 'CONFIGURACION'}")
    db.commit()
    return {"message": message, "status": "RESUELTA", "resolution": resolution, "gross_rd": gross, "net_worker_payout_rd": net, "commission_rd": commission, "isr_withheld_rd": isr, "itbis_withheld_rd": itbis}
