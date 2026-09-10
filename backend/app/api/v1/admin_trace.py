from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.models.models import User

router = APIRouter(prefix="/admin-panel", tags=["Trazabilidad financiera"])

@router.get("/trace/{service_id}")
def trace_service(service_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT e.id AS escrow_id,e.service_id,e.client_id,e.worker_id,e.total_amount_rd,e.commission_amount_rd,e.worker_payout_rd,e.commission_rate_percent,e.status AS escrow_status,e.payment_method,e.bank_account_id,e.voucher_url,e.created_at,e.released_at,
               s.title,s.status AS service_status,s.negotiated_price_rd,
               COALESCE(NULLIF(TRIM(CONCAT(COALESCE(c.first_name,''),' ',COALESCE(c.last_name,''))),''),c.email) AS client_name,c.email AS client_email,
               COALESCE(NULLIF(TRIM(CONCAT(COALESCE(w.first_name,''),' ',COALESCE(w.last_name,''))),''),w.email) AS worker_name,w.email AS worker_email,
               ba.bank_name,ba.account_number,ba.account_type
        FROM escrows e JOIN services s ON s.id=e.service_id
        LEFT JOIN users c ON c.id=e.client_id LEFT JOIN users w ON w.id=e.worker_id
        LEFT JOIN bank_accounts ba ON ba.id=e.bank_account_id
        WHERE e.service_id=:sid ORDER BY e.created_at DESC LIMIT 1
    """), {"sid": service_id}).mappings().first()
    if not row: raise HTTPException(404, "No existe trazabilidad para este servicio.")
    transactions = db.execute(text("SELECT id,user_id,amount,type,status,reference_code,created_at,bank_account_id FROM transactions WHERE user_id=:client AND (bank_account_id=:bank OR type IN ('PAGO_CUSTODIA_TRANSFERENCIA','LIBERACION_ADMIN','REEMBOLSO')) ORDER BY created_at ASC"), {"client":row["client_id"],"bank":row["bank_account_id"] or -1}).mappings().all()
    events = [{"stage":"CONTRATACION","status":row["service_status"],"client_id":row["client_id"],"client_name":row["client_name"],"worker_id":row["worker_id"],"worker_name":row["worker_name"]},
              {"stage":"DEPOSITO","status":row["escrow_status"],"amount_rd":float(row["total_amount_rd"] or 0),"bank":row["bank_name"],"bank_account_id":row["bank_account_id"],"account_number":row["account_number"],"voucher_received":bool(row["voucher_url"]),"created_at":row["created_at"]},
              {"stage":"LIQUIDACION","commission_rd":float(row["commission_amount_rd"] or 0),"worker_payout_rd":float(row["worker_payout_rd"] or 0),"released_at":row["released_at"]}]
    return {"trace_id":str(row["escrow_id"]),"service_id":service_id,"identity":{"client_id":row["client_id"],"client_name":row["client_name"],"worker_id":row["worker_id"],"worker_name":row["worker_name"]},"service":{"title":row["title"],"status":row["service_status"],"agreed_price_rd":float(row["negotiated_price_rd"] or 0)},"money":{"total_rd":float(row["total_amount_rd"] or 0),"commission_rd":float(row["commission_amount_rd"] or 0),"worker_payout_rd":float(row["worker_payout_rd"] or 0)},"bank":{"bank_name":row["bank_name"],"bank_account_id":row["bank_account_id"],"account_number":row["account_number"],"account_type":row["account_type"]},"escrow":{"id":str(row["escrow_id"]),"status":row["escrow_status"],"payment_method":row["payment_method"],"voucher_received":bool(row["voucher_url"])},"timeline":events,"transactions":[dict(x) for x in transactions]}
