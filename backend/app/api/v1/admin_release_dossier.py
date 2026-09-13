from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.models.models import User

router = APIRouter(prefix="/admin-panel", tags=["Expediente de liberación"])

@router.get("/escrows/{service_id}/release-dossier")
def release_dossier(service_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT e.id AS escrow_id,e.service_id,e.client_id,e.worker_id,e.total_amount_rd,
               e.commission_rate_percent,e.commission_amount_rd,e.worker_payout_rd,
               e.gross_service_amount_rd,e.platform_commission_rd,e.isr_withheld_rd,e.itbis_withheld_rd,
               e.net_worker_payout_rd,e.fiscal_rule_code,e.tax_mode,e.status AS escrow_status,
               e.voucher_url,e.bank_account_id,e.payment_method,e.created_at AS deposit_created_at,e.released_at,
               s.title,s.description,s.negotiated_price_rd,s.price_rd,s.status AS service_status,
               s.completion_submitted,s.completion_summary,s.completion_submitted_at,s.completion_photos,
               s.service_date,s.service_time,s.estimated_duration,s.province,s.municipality,s.address_approx,
               c.first_name AS client_first_name,c.last_name AS client_last_name,c.email AS client_email,c.phone AS client_phone,c.cedula AS client_cedula,
               w.first_name AS worker_first_name,w.last_name AS worker_last_name,w.email AS worker_email,w.phone AS worker_phone,w.cedula AS worker_cedula,
               wp.specialties AS worker_specialties,wp.has_infotep AS worker_has_infotep,
               ba.bank_name,ba.account_number,ba.account_type,ba.account_holder,ba.rnc_cedula
        FROM escrows e
        JOIN services s ON s.id=e.service_id
        LEFT JOIN users c ON c.id=e.client_id
        LEFT JOIN users w ON w.id=e.worker_id
        LEFT JOIN worker_profiles wp ON wp.user_id=e.worker_id
        LEFT JOIN bank_accounts ba ON ba.id=e.bank_account_id
        WHERE e.service_id=:sid
        ORDER BY e.created_at DESC LIMIT 1
    """), {"sid": service_id}).mappings().first()
    if not row:
        raise HTTPException(404, "No existe la operación de Custodia para este servicio.")

    contract = db.execute(text("""
        SELECT id,contract_number,version,status,content_hash,generated_at,generated_by_admin,
               client_accepted_at,worker_accepted_at,client_acceptance_hash,worker_acceptance_hash,locked_at
        FROM digital_contracts WHERE service_id=:sid ORDER BY generated_at DESC LIMIT 1
    """), {"sid": service_id}).mappings().first()

    events = db.execute(text("""
        SELECT process_type,status,title,message,next_step,rejection_reason,correction,created_at
        FROM process_events WHERE related_entity_id=:sid ORDER BY created_at ASC
    """), {"sid": service_id}).mappings().all()

    transactions = db.execute(text("""
        SELECT id,amount,type,status,reference_code,created_at
        FROM transactions
        WHERE reference_code LIKE :prefix OR type IN ('CUSTODIA_TRABAJO','LIBERACION_ADMIN')
          AND user_id IN (:client_id,:worker_id)
        ORDER BY created_at ASC
    """), {"prefix": f"%{service_id[:8].upper()}%", "client_id": row["client_id"], "worker_id": row["worker_id"]}).mappings().all()

    audit = db.execute(text("""
        SELECT admin_id,action,target_id,details,timestamp
        FROM admin_audit_logs WHERE target_id=:eid OR details LIKE :sid
        ORDER BY timestamp ASC
    """), {"eid": str(row["escrow_id"]), "sid": f"%service_id={service_id}%"}).mappings().all()

    return {
        "dossier": dict(row),
        "contract": dict(contract) if contract else None,
        "process_history": [dict(x) for x in events],
        "financial_history": [dict(x) for x in transactions],
        "admin_audit": [dict(x) for x in audit],
        "release_direction": {
            "from_client": row["client_id"],
            "to_worker": row["worker_id"],
            "statement": "ESTE DINERO SERÁ LIBERADO DE: CLIENTE → PARA: TRABAJADOR"
        }
    }
