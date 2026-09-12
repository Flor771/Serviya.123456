from datetime import datetime, timedelta
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.models.models import User

router = APIRouter(prefix="/admin-panel", tags=["Liberación administrativa segura"])

class ReleaseApproval(BaseModel):
    notes: str = Field(default="", max_length=1000)


def _notify(db, user_id, title, message, kind, related_entity_id=None):
    if user_id:
        db.execute(text("INSERT INTO notifications (id,user_id,title,message,type,related_entity_id,read,created_at) VALUES (gen_random_uuid()::text,:u,:t,:m,:k,:rid,false,CURRENT_TIMESTAMP)"), {"u": user_id, "t": title, "m": message, "k": kind, "rid": related_entity_id})


def _audit(db, admin_id, escrow_id, details):
    db.execute(text("INSERT INTO admin_audit_logs (admin_id,action,resource,target_id,details,timestamp) VALUES (:a,'ADMIN_APPROVE_RELEASE','escrows',:id,:details,CURRENT_TIMESTAMP)"), {"a": admin_id, "id": str(escrow_id), "details": details})


@router.post("/escrows/{service_id}/approve-release")
def approve_release_snapshot(service_id: str, data: ReleaseApproval, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    escrow = db.execute(text("""
        SELECT id,client_id,worker_id,total_amount_rd,commission_amount_rd,worker_payout_rd,
               gross_service_amount_rd,platform_commission_rd,isr_withheld_rd,itbis_withheld_rd,
               net_worker_payout_rd,fiscal_rule_code,tax_mode,status
        FROM escrows
        WHERE service_id=:sid AND status='PENDIENTE_APROBACION'
        ORDER BY created_at DESC LIMIT 1 FOR UPDATE
    """), {"sid": service_id}).mappings().first()
    if not escrow:
        raise HTTPException(404, "No existe una custodia pendiente de aprobación para este servicio.")

    service = db.execute(text("SELECT id,completion_submitted FROM services WHERE id=:sid FOR UPDATE"), {"sid": service_id}).mappings().first()
    if not service:
        raise HTTPException(404, "Servicio no encontrado")
    if not service["completion_submitted"]:
        raise HTTPException(400, "El trabajador todavía no ha enviado el trabajo a revisión.")

    wallet = db.execute(text("SELECT id,available_balance,pending_custody_balance FROM wallets WHERE worker_id=:w FOR UPDATE"), {"w": escrow["worker_id"]}).mappings().first()
    if not wallet:
        db.execute(text("INSERT INTO wallets (worker_id,available_balance,pending_custody_balance,total_earnings,total_commissions,total_withdrawn) VALUES (:w,0,0,0,0,0)"), {"w": escrow["worker_id"]})
        wallet = db.execute(text("SELECT id,available_balance,pending_custody_balance FROM wallets WHERE worker_id=:w FOR UPDATE"), {"w": escrow["worker_id"]}).mappings().one()

    has_snapshot = escrow["gross_service_amount_rd"] is not None or escrow["platform_commission_rd"] is not None or escrow["net_worker_payout_rd"] is not None
    gross = float(escrow["gross_service_amount_rd"] if escrow["gross_service_amount_rd"] is not None else (escrow["total_amount_rd"] or 0))
    commission = float(escrow["platform_commission_rd"] if escrow["platform_commission_rd"] is not None else (escrow["commission_amount_rd"] or 0))
    isr = float(escrow["isr_withheld_rd"] or 0)
    itbis = float(escrow["itbis_withheld_rd"] or 0)
    net = float(escrow["net_worker_payout_rd"] if escrow["net_worker_payout_rd"] is not None else (escrow["worker_payout_rd"] or 0))

    values = (gross, commission, isr, itbis, net)
    if any(v < 0 for v in values):
        raise HTTPException(409, "El snapshot financiero contiene valores negativos y no puede liquidarse.")
    if commission > gross:
        raise HTTPException(409, "La comisión histórica supera el monto bruto de la custodia.")
    if float(wallet["pending_custody_balance"] or 0) + 0.01 < gross:
        raise HTTPException(409, "El saldo de Custodia del trabajador no cubre el monto histórico de esta liberación.")

    if has_snapshot:
        if abs((commission + isr + itbis + net) - gross) > 0.01:
            raise HTTPException(409, "El snapshot fiscal no cuadra: bruto, comisión, retenciones y neto no coinciden.")
    elif abs((commission + net) - gross) > 0.01:
        raise HTTPException(409, "La liquidación histórica no cuadra: comisión y payout no coinciden con el bruto.")

    now = datetime.utcnow()
    release_ref = f"ADMIN-RELEASE-{service_id[:8].upper()}"

    result = db.execute(text("""
        UPDATE escrows
        SET status='LIBERADO', released_at=:now,
            commission_amount_rd=:commission,
            worker_payout_rd=:net
        WHERE id=:id AND status='PENDIENTE_APROBACION'
    """), {"id": escrow["id"], "now": now, "commission": commission, "net": net})
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(409, "La liberación cambió de estado antes de completarse; no se aplicaron fondos.")

    db.execute(text("""
        UPDATE wallets
        SET available_balance=COALESCE(available_balance,0)+:net,
            pending_custody_balance=COALESCE(pending_custody_balance,0)-:gross,
            total_earnings=COALESCE(total_earnings,0)+:net,
            total_commissions=COALESCE(total_commissions,0)+:commission
        WHERE id=:id
    """), {"id": wallet["id"], "net": net, "gross": gross, "commission": commission})

    db.execute(text("""
        INSERT INTO wallet_transactions (id,wallet_id,user_id,type,amount_rd,description,reference,status,created_at)
        SELECT :id,:wid,:u,'LIBERACION_ADMIN',:net,:description,:ref,'EXITOSO',CURRENT_TIMESTAMP
        WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE reference=:ref)
    """), {"id": str(uuid.uuid4()), "wid": wallet["id"], "u": escrow["worker_id"], "net": net, "description": f"Liberación administrativa del servicio {service_id}", "ref": release_ref})

    db.execute(text("""
        INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at)
        SELECT :u,:net,'LIBERACION_ADMIN','COMPLETADO',:ref,CURRENT_TIMESTAMP
        WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE user_id=:u AND reference_code=:ref)
    """), {"u": escrow["worker_id"], "net": net, "ref": release_ref})

    db.execute(text("UPDATE services SET status='COMPLETADA' WHERE id=:sid"), {"sid": service_id})

    warranty = db.execute(text("SELECT id FROM service_warranties WHERE service_id=:sid LIMIT 1"), {"sid": service_id}).scalar()
    if not warranty:
        expires = now + timedelta(days=60)
        db.execute(text("""
            INSERT INTO service_warranties (id,service_id,client_id,worker_id,coverage_days,status,activated_at,expires_at,certificate_ref)
            VALUES (:id,:sid,:c,:w,60,'ACTIVA',:now,:exp,:ref)
        """), {"id": str(uuid.uuid4()), "sid": service_id, "c": escrow["client_id"], "w": escrow["worker_id"], "now": now, "exp": expires, "ref": f"GAR-SRV-{service_id[:8].upper()}"})

    fiscal_rule = escrow["fiscal_rule_code"] or "PENDIENTE_CLASIFICACION"
    tax_mode = escrow["tax_mode"] or "CONFIGURACION"
    _notify(db, escrow["worker_id"], "Pago liberado por Administración", f"Administración aprobó la liberación del neto histórico de RD$ {net:,.2f}.", "PAYMENT_RELEASED", service_id)
    _notify(db, escrow["client_id"], "Pago aprobado y garantía activa", "Administración aprobó la liquidación y activó la garantía SERVIYA por 60 días.", "PAYMENT_ADMIN_APPROVED", service_id)
    _audit(db, admin_user.id, escrow["id"], f"service_id={service_id}; gross={gross}; commission={commission}; isr={isr}; itbis={itbis}; net_worker={net}; fiscal_rule={fiscal_rule}; tax_mode={tax_mode}; {data.notes or 'Liberación aprobada por Administración.'}")

    db.commit()
    return {
        "message": "Fondos liberados correctamente usando el snapshot histórico de Custodia.",
        "status": "LIBERADO",
        "worker_payout_rd": net,
        "commission_rd": commission,
        "isr_withheld_rd": isr,
        "itbis_withheld_rd": itbis,
        "fiscal_rule_code": fiscal_rule,
        "tax_mode": tax_mode,
        "service_status": "COMPLETADA",
        "reference": release_ref,
    }
