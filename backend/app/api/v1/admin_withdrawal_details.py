from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.models.models import User

router = APIRouter(prefix="/admin/withdrawals", tags=["Retiros administrativos detallados"])

@router.get("/details")
def get_admin_withdrawal_details(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            w.id, w.worker_id, w.amount, w.method, w.account_number, w.account_type,
            w.account_holder_name, w.account_holder_cedula, w.reference_code, w.status,
            w.created_at,
            u.first_name AS worker_first_name, u.last_name AS worker_last_name,
            u.email AS worker_email, u.phone AS worker_phone, u.cedula AS worker_cedula,
            u.province AS worker_province, u.municipality AS worker_municipality,
            wp.specialties AS worker_specialties, wp.has_infotep AS worker_has_infotep,
            j.service_id, j.service_title, j.service_price_rd, j.escrow_total_rd,
            j.worker_payout_rd, j.released_at,
            cu.first_name AS client_first_name, cu.last_name AS client_last_name,
            cu.email AS client_email, cu.phone AS client_phone
        FROM withdrawals w
        JOIN users u ON u.id = w.worker_id
        LEFT JOIN worker_profiles wp ON wp.user_id = u.id
        LEFT JOIN LATERAL (
            SELECT
                s.id AS service_id,
                s.title AS service_title,
                s.price_rd AS service_price_rd,
                e.total_amount_rd AS escrow_total_rd,
                COALESCE(e.net_worker_payout_rd, e.worker_payout_rd) AS worker_payout_rd,
                e.released_at
            FROM escrows e
            JOIN services s ON s.id = e.service_id
            WHERE e.worker_id = w.worker_id
              AND e.status = 'LIBERADO'
            ORDER BY e.released_at DESC NULLS LAST, e.created_at DESC
            LIMIT 1
        ) j ON TRUE
        LEFT JOIN users cu ON cu.id = (
            SELECT s2.client_id FROM services s2 WHERE s2.id = j.service_id LIMIT 1
        )
        ORDER BY w.created_at DESC
    """)).mappings().all()

    def name(first, last):
        return " ".join(x for x in [first, last] if x).strip() or None

    return {
        "withdrawals": [{
            "id": r["id"],
            "worker_id": r["worker_id"],
            "worker_name": name(r["worker_first_name"], r["worker_last_name"]),
            "worker_first_name": r["worker_first_name"],
            "worker_last_name": r["worker_last_name"],
            "worker_email": r["worker_email"],
            "worker_phone": r["worker_phone"],
            "worker_cedula": r["worker_cedula"],
            "worker_province": r["worker_province"],
            "worker_municipality": r["worker_municipality"],
            "worker_specialties": r["worker_specialties"],
            "worker_has_infotep": bool(r["worker_has_infotep"]),
            "amount_rd": float(r["amount"] or 0),
            "bank_name": r["method"],
            "account_type": r["account_type"],
            "account_number": r["account_number"],
            "account_holder_name": r["account_holder_name"],
            "account_holder_cedula": r["account_holder_cedula"],
            "reference": r["reference_code"],
            "status": r["status"],
            "requested_at": str(r["created_at"]),
            "service_id": r["service_id"],
            "service_title": r["service_title"],
            "service_price_rd": float(r["service_price_rd"] or 0) if r["service_price_rd"] is not None else None,
            "escrow_total_rd": float(r["escrow_total_rd"] or 0) if r["escrow_total_rd"] is not None else None,
            "worker_payout_rd": float(r["worker_payout_rd"] or 0) if r["worker_payout_rd"] is not None else None,
            "released_at": str(r["released_at"]) if r["released_at"] else None,
            "client_name": name(r["client_first_name"], r["client_last_name"]),
            "client_email": r["client_email"],
            "client_phone": r["client_phone"],
        } for r in rows]
    }
