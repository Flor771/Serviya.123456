from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.models.models import User

router = APIRouter(prefix="/admin-panel", tags=["Finanzas administrativas"])

class FinancialResolution(BaseModel):
    action: str = Field(..., description="REFUND_FULL, REFUND_PARTIAL o RELEASE_TO_WORKER")
    amount_rd: Optional[float] = None
    notes: str = Field(default="", max_length=1000)


def _audit(db, admin_id, action, target_id, details):
    db.execute(text("INSERT INTO admin_audit_logs (admin_id,action,resource,target_id,details,timestamp) VALUES (:a,:action,'disputes',:id,:details,CURRENT_TIMESTAMP)"), {"a":admin_id,"action":action,"id":target_id,"details":details})


def _notify(db, user_id, title, message, kind):
    if user_id:
        db.execute(text("INSERT INTO notifications (user_id,title,message,type,is_read,created_at) VALUES (:u,:t,:m,:k,false,CURRENT_TIMESTAMP)"), {"u":user_id,"t":title,"m":message,"k":kind})


@router.post("/disputes/{dispute_id}/financial-resolution")
def financial_resolution(dispute_id: int, data: FinancialResolution, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if data.action not in {"REFUND_FULL", "REFUND_PARTIAL", "RELEASE_TO_WORKER"}:
        raise HTTPException(400, "Acción financiera no válida")
    disp = db.execute(text("SELECT id,service_id,opened_by_user_id,against_user_id,status FROM disputes WHERE id=:id FOR UPDATE"), {"id":dispute_id}).mappings().first()
    if not disp:
        raise HTTPException(404, "Disputa no encontrada")
    if not disp["service_id"]:
        raise HTTPException(400, "La disputa no pertenece al flujo actual de servicios")
    if disp["status"] in {"RESUELTA", "CERRADA"}:
        raise HTTPException(409, "La disputa ya está resuelta")

    escrow = db.execute(text("SELECT id,client_id,worker_id,total_amount_rd,commission_amount_rd,worker_payout_rd,status FROM escrows WHERE service_id=:sid AND status IN ('RETENIDO','EN_DISPUTA') ORDER BY created_at DESC LIMIT 1 FOR UPDATE"), {"sid":disp["service_id"]}).mappings().first()
    if not escrow:
        raise HTTPException(400, "No existe una custodia activa para esta disputa")

    total = float(escrow["total_amount_rd"])
    commission = float(escrow["commission_amount_rd"] or 0)
    payout = float(escrow["worker_payout_rd"] or 0)

    if data.action == "REFUND_FULL":
        refund = total
    elif data.action == "REFUND_PARTIAL":
        if data.amount_rd is None or data.amount_rd <= 0 or data.amount_rd >= total:
            raise HTTPException(400, f"Para reembolso parcial indica un monto mayor que 0 y menor que RD$ {total:,.2f}.")
        refund = float(data.amount_rd)
    else:
        refund = 0.0

    if data.action in {"REFUND_FULL", "REFUND_PARTIAL"}:
        client_wallet = db.execute(text("SELECT id FROM client_wallets WHERE client_id=:c FOR UPDATE"), {"c":escrow["client_id"]}).mappings().first()
        if not client_wallet:
            db.execute(text("INSERT INTO client_wallets (client_id) VALUES (:c) ON CONFLICT (client_id) DO NOTHING"), {"c":escrow["client_id"]})
            client_wallet = db.execute(text("SELECT id FROM client_wallets WHERE client_id=:c FOR UPDATE"), {"c":escrow["client_id"]}).mappings().one()

        worker_release = 0.0
        if data.action == "REFUND_FULL":
            db.execute(text("UPDATE escrows SET status='REEMBOLSADO', released_at=CURRENT_TIMESTAMP WHERE id=:e"), {"e":escrow["id"]})
        else:
            # Final settlement: refund the requested amount to the client and release
            # the remaining custody to the worker after proportional platform commission.
            remaining = round(total - refund, 2)
            commission_rate = commission / total if total > 0 else 0.0
            commission_remaining = round(remaining * commission_rate, 2)
            worker_release = round(remaining - commission_remaining, 2)
            db.execute(text("UPDATE escrows SET status='LIBERADO', total_amount_rd=:remaining, commission_amount_rd=:commission, worker_payout_rd=:worker, released_at=CURRENT_TIMESTAMP WHERE id=:e"), {"remaining":remaining,"commission":commission_remaining,"worker":worker_release,"e":escrow["id"]})

            worker_wallet = db.execute(text("SELECT id FROM wallets WHERE worker_id=:w FOR UPDATE"), {"w":escrow["worker_id"]}).mappings().first()
            if not worker_wallet:
                raise HTTPException(400, "El trabajador no tiene billetera")
            db.execute(text("UPDATE wallets SET available_balance=COALESCE(available_balance,0)+:p,total_earnings=COALESCE(total_earnings,0)+:p,total_commissions=COALESCE(total_commissions,0)+:c WHERE id=:w"), {"p":worker_release,"c":commission_remaining,"w":worker_wallet["id"]})
            db.execute(text("INSERT INTO financial_movements (wallet_id,contract_id,movement_type,amount_dop,description,created_at) VALUES (:w,NULL,'LIBERACION_PARCIAL_DISPUTA',:p,:d,CURRENT_TIMESTAMP)"), {"w":worker_wallet["id"],"p":worker_release,"d":f"Liquidación parcial de disputa {dispute_id}"})
            db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) VALUES (:u,:p,'LIBERACION_PARCIAL_ADMIN','COMPLETADO',:ref,CURRENT_TIMESTAMP)"), {"u":escrow["worker_id"],"p":worker_release,"ref":f"ADMIN-PARTIAL-RELEASE-{dispute_id}"})
            _notify(db,escrow["worker_id"],"Liquidación del servicio","Administración liberó el saldo restante del servicio después del reembolso.","PAYMENT_PARTIAL_RELEASED")

        ref = f"ADMIN-REFUND-{dispute_id}-{int(datetime.utcnow().timestamp())}"
        db.execute(text("UPDATE client_wallets SET available_balance=available_balance+:r,total_refunded=total_refunded+:r,updated_at=CURRENT_TIMESTAMP WHERE id=:wid"), {"r":refund,"wid":client_wallet["id"]})
        db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) VALUES (:u,:a,'REEMBOLSO_ADMIN','COMPLETADO',:ref,CURRENT_TIMESTAMP)"), {"u":escrow["client_id"],"a":refund,"ref":ref})
        db.execute(text("UPDATE services SET status=:status WHERE id=:sid"), {"status":"CANCELADA" if data.action == "REFUND_FULL" else "COMPLETADA", "sid":disp["service_id"]})
        _notify(db,escrow["client_id"],"Reembolso aprobado","Administración acreditó el reembolso correspondiente a tu Billetera SERVIYA.","REFUND")
        _audit(db,admin_user.id,"ADMIN_REFUND",dispute_id,f"{data.action}: RD$ {refund:,.2f}. {data.notes}")
        settlement_note = data.notes or (f"Reembolso total de RD$ {refund:,.2f}" if data.action == "REFUND_FULL" else f"Reembolso de RD$ {refund:,.2f} y liberación de RD$ {worker_release:,.2f} al técnico")
        db.execute(text("UPDATE disputes SET status='RESUELTA',admin_notes=:notes,resolution_notes=:notes WHERE id=:id"), {"id":dispute_id,"notes":settlement_note})
        db.commit()
        return {"message":"Liquidación financiera aplicada correctamente.","refund_amount_rd":refund,"worker_release_rd":worker_release,"reference":ref,"status":"RESUELTA"}

    worker_wallet = db.execute(text("SELECT id FROM wallets WHERE worker_id=:w FOR UPDATE"), {"w":escrow["worker_id"]}).mappings().first()
    if not worker_wallet:
        raise HTTPException(400,"El trabajador no tiene billetera")
    db.execute(text("UPDATE escrows SET status='LIBERADO',released_at=CURRENT_TIMESTAMP WHERE id=:e"), {"e":escrow["id"]})
    db.execute(text("UPDATE wallets SET available_balance=COALESCE(available_balance,0)+:p,total_earnings=COALESCE(total_earnings,0)+:p,total_commissions=COALESCE(total_commissions,0)+:c WHERE id=:w"), {"p":payout,"c":commission,"w":worker_wallet["id"]})
    db.execute(text("INSERT INTO financial_movements (wallet_id,contract_id,movement_type,amount_dop,description,created_at) VALUES (:w,NULL,'LIBERACION_ADMIN',:p,:d,CURRENT_TIMESTAMP)"), {"w":worker_wallet["id"],"p":payout,"d":f"Liberación administrativa de disputa {dispute_id}"})
    db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) VALUES (:u,:p,'LIBERACION_ADMIN','COMPLETADO',:ref,CURRENT_TIMESTAMP)"), {"u":escrow["worker_id"],"p":payout,"ref":f"ADMIN-RELEASE-{dispute_id}"})
    db.execute(text("UPDATE services SET status='COMPLETADA' WHERE id=:sid"), {"sid":disp["service_id"]})
    db.execute(text("UPDATE disputes SET status='RESUELTA',admin_notes=:notes,resolution_notes=:notes WHERE id=:id"), {"id":dispute_id,"notes":data.notes or "Liberación administrativa al técnico"})
    _notify(db,escrow["worker_id"],"Pago liberado","Administración liberó los fondos de tu servicio.","PAYMENT_RELEASED")
    _audit(db,admin_user.id,"ADMIN_RELEASE",dispute_id,f"Liberación de RD$ {payout:,.2f}. {data.notes}")
    db.commit()
    return {"message":"Fondos liberados al técnico.","worker_payout_rd":payout,"status":"RESUELTA"}
