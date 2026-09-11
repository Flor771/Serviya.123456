from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_active_user
from app.models.models import User

router = APIRouter(prefix="/client-funds", tags=["Fondos del Cliente"])

@router.get("")
def get_client_funds(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if str(getattr(current_user, "role", "")).upper() != "CLIENTE":
        raise HTTPException(403, "Esta información está disponible solamente para clientes.")
    rows = db.execute(text("""SELECT e.id AS escrow_id, e.service_id, e.worker_id,
        e.total_amount_rd, e.status AS escrow_status, e.created_at,
        s.title AS service_title, u.full_name AS worker_name
        FROM escrows e
        LEFT JOIN services s ON s.id = e.service_id
        LEFT JOIN users u ON u.id = e.worker_id
        WHERE e.client_id = :client_id
        ORDER BY e.created_at DESC"""), {"client_id": current_user.id}).mappings().all()
    labels = {"PENDIENTE_VERIFICACION":"Pendiente de verificación","RETENIDO":"En custodia","PENDIENTE_APROBACION":"Pendiente de liberación","LIBERADO":"Liberado","REEMBOLSADO":"Reembolsado","EN_DISPUTA":"En disputa"}
    funds = []
    for row in rows:
        status = str(row["escrow_status"] or "PENDIENTE_VERIFICACION")
        funds.append({"payment_id":str(row["escrow_id"]),"depositor_name":getattr(current_user,"full_name",None) or getattr(current_user,"name",None) or getattr(current_user,"email","Cliente"),"destination_worker_name":row["worker_name"] or "Trabajador no asignado","service_title":row["service_title"] or f"Servicio #{str(row['service_id'])[:8]}","amount_dop":float(row["total_amount_rd"] or 0),"status":status,"status_label":labels.get(status,status.replace("_"," ").title()),"reference":f"ESCROW-{str(row['escrow_id']).upper()}","date":row["created_at"].isoformat() if row["created_at"] else None,"contract_id":None,"job_id":str(row["service_id"])})
    total = sum(x["amount_dop"] for x in funds if x["status"] != "REEMBOLSADO")
    custody = sum(x["amount_dop"] for x in funds if x["status"] in {"RETENIDO","PENDIENTE_APROBACION","EN_DISPUTA"})
    pending = sum(x["amount_dop"] for x in funds if x["status"] == "PENDIENTE_VERIFICACION")
    return {"total_deposited_dop":total,"total_in_custody_dop":custody,"total_pending_dop":pending,"funds":funds}
