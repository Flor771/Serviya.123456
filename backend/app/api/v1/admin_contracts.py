from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.models.models import User

router = APIRouter(prefix="/admin-panel", tags=["Evidencia contractual administrativa"])


@router.get("/contracts")
def list_contract_evidence(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            dc.id, dc.service_id, dc.escrow_id, dc.contract_number, dc.version, dc.status,
            dc.content_hash, dc.generated_at, dc.generated_by_admin,
            dc.client_accepted_at, dc.worker_accepted_at,
            dc.client_acceptance_hash, dc.worker_acceptance_hash, dc.locked_at,
            e.status AS escrow_status, e.total_amount_rd, e.commission_rate_percent,
            e.commission_amount_rd, e.worker_payout_rd,
            s.title,
            COALESCE(NULLIF(TRIM(CONCAT(COALESCE(c.first_name,''),' ',COALESCE(c.last_name,''))),''),c.email) AS client_name,
            COALESCE(NULLIF(TRIM(CONCAT(COALESCE(w.first_name,''),' ',COALESCE(w.last_name,''))),''),w.email) AS worker_name
        FROM digital_contracts dc
        JOIN services s ON s.id=dc.service_id
        LEFT JOIN escrows e ON e.id=dc.escrow_id
        LEFT JOIN users c ON c.id=s.client_id
        LEFT JOIN users w ON w.id=s.worker_id
        ORDER BY dc.generated_at DESC
        LIMIT 200
    """)).mappings().all()
    return {
        "contracts": [dict(r) for r in rows],
        "summary": {
            "count": len(rows),
            "locked": sum(1 for r in rows if r["locked_at"] is not None),
            "accepted_by_both": sum(1 for r in rows if r["status"] == "ACEPTADO_POR_AMBOS"),
        },
    }


@router.get("/contracts/{contract_id}")
def get_contract_evidence(contract_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT * FROM digital_contracts WHERE id=:id"), {"id": contract_id}).mappings().first()
    if not row:
        return {"contract": None}
    return {"contract": dict(row), "document": row["content_json"]}
