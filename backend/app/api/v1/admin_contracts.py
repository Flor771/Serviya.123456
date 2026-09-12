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
            COALESCE(NULLIF(TRIM(CONCAT(COALESCE(w.first_name,''),' ',COALESCE(w.last_name,''))),''),w.email) AS worker_name,
            ce.accepted_at AS evidence_client_accepted_at,
            we.accepted_at AS evidence_worker_accepted_at
        FROM digital_contracts dc
        JOIN services s ON s.id=dc.service_id
        LEFT JOIN escrows e ON e.id=dc.escrow_id
        LEFT JOIN users c ON c.id=s.client_id
        LEFT JOIN users w ON w.id=s.worker_id
        LEFT JOIN LATERAL (
            SELECT MIN(n.created_at) AS accepted_at
            FROM notifications n
            WHERE n.type='CONTRACT_ACCEPTED'
              AND n.related_entity_id=dc.service_id
              AND n.message LIKE 'CLIENTE aceptó el contrato ' || dc.contract_number || '.%'
        ) ce ON TRUE
        LEFT JOIN LATERAL (
            SELECT MIN(n.created_at) AS accepted_at
            FROM notifications n
            WHERE n.type='CONTRACT_ACCEPTED'
              AND n.related_entity_id=dc.service_id
              AND n.message LIKE 'TRABAJADOR aceptó el contrato ' || dc.contract_number || '.%'
        ) we ON TRUE
        ORDER BY dc.generated_at DESC
        LIMIT 200
    """)).mappings().all()

    contracts = []
    for r in rows:
        item = dict(r)
        # The acceptance notification is an audit record. If an older deployed
        # acceptance path wrote the audit event but failed to persist the
        # timestamp columns, expose that evidence to Administration instead of
        # incorrectly showing the party as pending.
        if item["client_accepted_at"] is None and item["evidence_client_accepted_at"] is not None:
            item["client_accepted_at"] = item["evidence_client_accepted_at"]
        if item["worker_accepted_at"] is None and item["evidence_worker_accepted_at"] is not None:
            item["worker_accepted_at"] = item["evidence_worker_accepted_at"]
        if item["client_accepted_at"] is not None and item["worker_accepted_at"] is not None and item["status"] not in ("ANULADO",):
            item["acceptance_evidence_status"] = "ACEPTADO_POR_AMBOS"
        elif item["client_accepted_at"] is not None:
            item["acceptance_evidence_status"] = "ACEPTADO_POR_CLIENTE"
        elif item["worker_accepted_at"] is not None:
            item["acceptance_evidence_status"] = "ACEPTADO_POR_TRABAJADOR"
        else:
            item["acceptance_evidence_status"] = item["status"]
        contracts.append(item)

    accepted_by_both = sum(1 for r in contracts if r["acceptance_evidence_status"] == "ACEPTADO_POR_AMBOS")
    locked = sum(1 for r in contracts if r["locked_at"] is not None or r["acceptance_evidence_status"] == "ACEPTADO_POR_AMBOS")

    return {
        "contracts": contracts,
        "summary": {
            "count": len(contracts),
            "locked": locked,
            "accepted_by_both": accepted_by_both,
        },
    }


@router.get("/contracts/{contract_id}")
def get_contract_evidence(contract_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT * FROM digital_contracts WHERE id=:id"), {"id": contract_id}).mappings().first()
    if not row:
        return {"contract": None}
    return {"contract": dict(row), "document": row["content_json"]}
