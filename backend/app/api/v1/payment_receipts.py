from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_active_user
from app.models.models import User

router = APIRouter(prefix="/payment-receipts", tags=["Comprobantes de pago"])


def _elapsed_work_seconds(db, service_id, completed_at):
    rows = db.execute(text("SELECT status,created_at FROM service_work_status_history WHERE service_id=:sid AND status IN ('TRABAJANDO','FINALIZANDO') ORDER BY created_at ASC, id ASC"), {"sid": service_id}).mappings().all()
    started = next((r["created_at"] for r in rows if r["status"] == "TRABAJANDO"), None)
    finishing = next((r["created_at"] for r in reversed(rows) if r["status"] == "FINALIZANDO"), None)
    end = finishing or completed_at
    if not started or not end:
        return None, started, finishing
    seconds = max(0, int((end - started).total_seconds()))
    return seconds, started, finishing


def _build_receipt(db, service_id):
    row = db.execute(text("""
        SELECT s.id AS service_id,s.title,s.description,s.category_name,s.service_date,s.service_time,s.estimated_duration,
               s.price_agreed_at,s.created_at,s.completion_summary,s.completion_submitted_at,
               e.id AS escrow_id,e.total_amount_rd,e.commission_amount_rd,e.worker_payout_rd,
               e.commission_rate_percent,e.gross_service_amount_rd,e.platform_commission_rd,
               e.isr_withheld_rd,e.itbis_withheld_rd,e.net_worker_payout_rd,e.fiscal_rule_code,
               e.tax_mode,e.tax_calculated_at,e.payment_method,e.created_at AS custody_created_at,e.released_at,
               c.id AS client_id,COALESCE(NULLIF(TRIM(CONCAT(COALESCE(c.first_name,''),' ',COALESCE(c.last_name,''))),''),c.email) AS client_name,
               w.id AS worker_id,COALESCE(NULLIF(TRIM(CONCAT(COALESCE(w.first_name,''),' ',COALESCE(w.last_name,''))),''),w.email) AS worker_name,
               ba.bank_name AS worker_bank_name,ba.account_type AS worker_account_type,
               ba.account_number AS worker_account_number,ba.account_holder_name AS worker_account_holder
        FROM services s
        JOIN escrows e ON e.service_id=s.id
        LEFT JOIN users c ON c.id=s.client_id
        LEFT JOIN users w ON w.id=s.worker_id
        LEFT JOIN LATERAL (
          SELECT bank_name,account_type,account_number,account_holder_name
          FROM worker_bank_accounts
          WHERE worker_id=s.worker_id AND is_active=true
          ORDER BY updated_at DESC NULLS LAST,created_at DESC LIMIT 1
        ) ba ON true
        WHERE s.id=:sid AND e.status='LIBERADO'
        ORDER BY e.released_at DESC NULLS LAST,e.created_at DESC LIMIT 1
    """), {"sid": service_id}).mappings().first()
    if not row:
        return None
    elapsed, started_at, finishing_at = _elapsed_work_seconds(db, service_id, row["completion_submitted_at"])

    # Use the historical fiscal snapshot captured on the escrow. Legacy rows
    # fall back to the old 10%/90% fields only when the new snapshot is null.
    total = float(row["gross_service_amount_rd"] if row["gross_service_amount_rd"] is not None else (row["total_amount_rd"] or 0))
    commission = float(row["platform_commission_rd"] if row["platform_commission_rd"] is not None else (row["commission_amount_rd"] or 0))
    isr_withheld = float(row["isr_withheld_rd"] or 0)
    itbis_withheld = float(row["itbis_withheld_rd"] or 0)
    payout = float(row["net_worker_payout_rd"] if row["net_worker_payout_rd"] is not None else (row["worker_payout_rd"] or 0))
    commission_percent = float(row["commission_rate_percent"] if row["commission_rate_percent"] is not None else (round((commission / total) * 100, 4) if total else 0))

    return {
        "service_id": row["service_id"], "escrow_id": row["escrow_id"],
        "reference": f"ADMIN-RELEASE-{str(row['service_id'])[:8].upper()}", "status": "PAGO_LIBERADO",
        "service_title": row["title"], "service_description": row["description"], "category": row["category_name"],
        "client_id": row["client_id"], "client_name": row["client_name"],
        "worker_id": row["worker_id"], "worker_name": row["worker_name"],
        "worker_bank_name": row["worker_bank_name"], "worker_account_type": row["worker_account_type"],
        "worker_account_number": row["worker_account_number"], "worker_account_holder": row["worker_account_holder"],
        "scheduled_date": row["service_date"], "scheduled_time": row["service_time"], "estimated_duration": row["estimated_duration"],
        "agreement_date": str(row["price_agreed_at"]) if row["price_agreed_at"] else None,
        "service_created_at": str(row["created_at"]) if row["created_at"] else None,
        "custody_at": str(row["custody_created_at"]) if row["custody_created_at"] else None,
        "started_at": str(started_at) if started_at else None, "finishing_at": str(finishing_at) if finishing_at else None,
        "completed_at": str(row["completion_submitted_at"]) if row["completion_submitted_at"] else None,
        "released_at": str(row["released_at"]) if row["released_at"] else None,
        "work_duration_seconds": elapsed,
        "work_duration_label": (f"{elapsed // 3600} h {(elapsed % 3600) // 60} min" if elapsed is not None else None),
        "completion_summary": row["completion_summary"], "payment_method": row["payment_method"],
        "total_paid_by_client_rd": total,
        "gross_service_amount_rd": total,
        "commission_percent": commission_percent,
        "commission_rd": commission,
        "platform_commission_rd": commission,
        "isr_withheld_rd": isr_withheld,
        "itbis_withheld_rd": itbis_withheld,
        "worker_net_rd": payout,
        "net_worker_payout_rd": payout,
        "fiscal_rule_code": row["fiscal_rule_code"] or "PENDIENTE_CLASIFICACION",
        "tax_mode": row["tax_mode"] or "CONFIGURACION",
        "tax_calculated_at": str(row["tax_calculated_at"]) if row["tax_calculated_at"] else None,
        "rules": [
            "El cliente paga antes de iniciar y los fondos permanecen protegidos en Custodia SERVIYA.",
            "El trabajador no recibe el dinero mientras el servicio permanece en Custodia.",
            "El cliente aprueba la finalización y Administración verifica y autoriza la liberación.",
            "La comisión y cualquier retención fiscal del comprobante corresponden al snapshot histórico calculado para esta operación.",
            "El trabajador recibe el neto histórico registrado en la liquidación; luego puede solicitar retiro a su cuenta bancaria configurada."
        ]
    }


@router.get("")
def list_payment_receipts(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT s.id FROM services s JOIN escrows e ON e.service_id=s.id WHERE e.status='LIBERADO' AND (s.client_id=:uid OR s.worker_id=:uid) ORDER BY e.released_at DESC NULLS LAST,e.created_at DESC LIMIT 50"), {"uid": current_user.id}).scalars().all()
    return {"receipts": [r for sid in rows if (r := _build_receipt(db, sid))]}


@router.get("/{service_id}")
def get_payment_receipt(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    receipt = _build_receipt(db, service_id)
    if not receipt:
        raise HTTPException(404, "El comprobante estará disponible cuando Administración haya liberado el pago.")
    if current_user.id not in {receipt["client_id"], receipt["worker_id"]}:
        raise HTTPException(403, "No tienes acceso a este comprobante")
    return {"receipt": receipt}
