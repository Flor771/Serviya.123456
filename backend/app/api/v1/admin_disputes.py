from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.models.models import User
import uuid

router = APIRouter(prefix='/admin', tags=['Disputas administrativas'])

class DisputeResolution(BaseModel):
    resolution: str = Field(pattern='^(TRABAJADOR|CLIENTE|MANTENER)$')
    notes: str = Field(min_length=5, max_length=1500)


def _notify(db, user_id, title, message, kind, related):
    if user_id:
        db.execute(text("INSERT INTO notifications (id,user_id,title,message,type,read,related_entity_id,created_at) VALUES (:id,:u,:t,:m,:k,false,:r,CURRENT_TIMESTAMP)"), {'id': uuid.uuid4().hex, 'u': user_id, 't': title, 'm': message, 'k': kind, 'r': related})


def _audit(db, admin_id, action, target_id, notes):
    db.execute(text("INSERT INTO admin_audit_logs (admin_id,action,resource,target_id,details,timestamp) VALUES (:a,:action,'disputes',:id,:details,CURRENT_TIMESTAMP)"), {'a': admin_id, 'action': action, 'id': str(target_id), 'details': notes})


@router.get('/disputes')
def get_admin_disputes(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text('''
        SELECT d.id, d.service_id, d.opened_by_user_id, d.against_user_id, d.status,
               d.reason, d.description, d.resolution_notes, d.created_at,
               s.title AS service_title,
               COALESCE(NULLIF(TRIM(CONCAT(COALESCE(c.first_name,''),' ',COALESCE(c.last_name,''))),''),c.email) AS client_name,
               COALESCE(NULLIF(TRIM(CONCAT(COALESCE(w.first_name,''),' ',COALESCE(w.last_name,''))),''),w.email) AS worker_name,
               e.total_amount_rd, e.status AS escrow_status
        FROM disputes d
        LEFT JOIN services s ON s.id=d.service_id
        LEFT JOIN users c ON c.id=d.opened_by_user_id
        LEFT JOIN users w ON w.id=d.against_user_id
        LEFT JOIN escrows e ON e.service_id=d.service_id
        WHERE d.service_id IS NOT NULL AND d.status IN ('ABIERTA','EN_REVISION')
        ORDER BY d.created_at DESC
    ''')).mappings().all()
    return {'disputes':[dict(r) for r in rows]}


@router.post('/disputes/{dispute_id}/resolve')
def resolve_dispute(dispute_id: str, data: DisputeResolution, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    dispute = db.execute(text('''
        SELECT d.id,d.service_id,d.opened_by_user_id,d.against_user_id,d.status,d.reason,d.description,
               s.client_id,s.worker_id,s.status AS service_status,
               e.id AS escrow_id,e.total_amount_rd,e.status AS escrow_status,e.worker_payout_rd,e.commission_amount_rd
        FROM disputes d
        JOIN services s ON s.id=d.service_id
        LEFT JOIN escrows e ON e.service_id=d.service_id
        WHERE d.id=:id AND d.status IN ('ABIERTA','EN_REVISION')
        ORDER BY e.created_at DESC LIMIT 1 FOR UPDATE
    '''), {'id': dispute_id}).mappings().first()
    if not dispute:
        raise HTTPException(404, 'Disputa activa no encontrada')
    if not dispute['escrow_id'] or dispute['escrow_status'] not in ('EN_DISPUTA','RETENIDO'):
        raise HTTPException(409, 'La disputa no tiene una Custodia activa que pueda resolverse')

    resolution = data.resolution
    notes = data.notes.strip()
    if resolution == 'MANTENER':
        db.execute(text("UPDATE disputes SET status='EN_REVISION',resolution_notes=:notes WHERE id=:id"), {'id': dispute_id, 'notes': notes})
        db.execute(text("UPDATE escrows SET status='EN_DISPUTA' WHERE id=:id"), {'id': dispute['escrow_id']})
        db.execute(text("UPDATE services SET status='EN_DISPUTA' WHERE id=:id"), {'id': dispute['service_id']})
        _notify(db, dispute['opened_by_user_id'], 'Disputa en revisión', f'Administración mantiene la disputa en revisión. Motivo: {notes}', 'DISPUTA', dispute_id)
        _notify(db, dispute['against_user_id'], 'Disputa en revisión', f'Administración mantiene la disputa en revisión. Motivo: {notes}', 'DISPUTA', dispute_id)
        _audit(db, admin_user.id, 'ADMIN_DISPUTE_REVIEW', dispute_id, notes)
        db.commit()
        return {'message':'La disputa quedó en revisión y el dinero permanece congelado en Custodia.','status':'EN_REVISION'}

    total = float(dispute['total_amount_rd'] or 0)
    if resolution == 'TRABAJADOR':
        payout = round(total * 0.90, 2)
        commission = round(total * 0.10, 2)
        wallet = db.execute(text("SELECT id FROM wallets WHERE worker_id=:w FOR UPDATE"), {'w': dispute['worker_id']}).mappings().first()
        if not wallet:
            db.execute(text("INSERT INTO wallets (worker_id,available_balance,pending_custody_balance,total_earnings,total_commissions,total_withdrawn) VALUES (:w,0,0,0,0,0)"), {'w': dispute['worker_id']})
            wallet = db.execute(text("SELECT id FROM wallets WHERE worker_id=:w FOR UPDATE"), {'w': dispute['worker_id']}).mappings().one()
        db.execute(text("UPDATE escrows SET status='LIBERADO',commission_rate_percent=10.0,commission_amount_rd=:c,worker_payout_rd=:p,released_at=CURRENT_TIMESTAMP,otp_verified=true WHERE id=:id"), {'id': dispute['escrow_id'], 'c': commission, 'p': payout})
        db.execute(text("UPDATE wallets SET available_balance=COALESCE(available_balance,0)+:p,pending_custody_balance=GREATEST(COALESCE(pending_custody_balance,0)-:t,0),total_earnings=COALESCE(total_earnings,0)+:p,total_commissions=COALESCE(total_commissions,0)+:c WHERE id=:id"), {'id': wallet['id'], 'p': payout, 't': total, 'c': commission})
        ref = f'DISPUTE-RELEASE-{str(dispute_id)[:8].upper()}'
        db.execute(text("INSERT INTO wallet_transactions (id,wallet_id,user_id,type,amount_rd,description,reference,status,created_at) SELECT :id,:wid,:u,'LIBERACION_DISPUTA',:p,:d,:ref,'EXITOSO',CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE reference=:ref)"), {'id': str(uuid.uuid4()), 'wid': wallet['id'], 'u': dispute['worker_id'], 'p': payout, 'd': f'Resolución administrativa de disputa {dispute_id}', 'ref': ref})
        db.execute(text("UPDATE services SET status='COMPLETADA' WHERE id=:id"), {'id': dispute['service_id']})
        message = f'Administración resolvió la disputa a favor del trabajador. Se liberaron RD$ {payout:,.2f} al trabajador.'
        _notify(db, dispute['worker_id'], 'Disputa resuelta a tu favor', message, 'DISPUTA_RESUELTA', dispute_id)
        _notify(db, dispute['client_id'], 'Disputa resuelta', f'Administración resolvió la disputa. El pago fue liberado al trabajador. Motivo: {notes}', 'DISPUTA_RESUELTA', dispute_id)
    else:
        db.execute(text("UPDATE escrows SET status='REEMBOLSADO',released_at=CURRENT_TIMESTAMP WHERE id=:id"), {'id': dispute['escrow_id']})
        db.execute(text("UPDATE services SET status='CANCELADA' WHERE id=:id"), {'id': dispute['service_id']})
        message = f'Administración resolvió la disputa a favor del cliente. El pago de RD$ {total:,.2f} quedó marcado como REEMBOLSADO para gestionar su devolución.'
        _notify(db, dispute['client_id'], 'Disputa resuelta a tu favor', message, 'DISPUTA_RESUELTA', dispute_id)
        _notify(db, dispute['worker_id'], 'Disputa resuelta', f'Administración resolvió la disputa a favor del cliente. Motivo: {notes}', 'DISPUTA_RESUELTA', dispute_id)

    db.execute(text("UPDATE disputes SET status='RESUELTA',resolution_notes=:notes WHERE id=:id"), {'id': dispute_id, 'notes': notes})
    _audit(db, admin_user.id, f'ADMIN_DISPUTE_RESOLVE_{resolution}', dispute_id, notes)
    db.commit()
    return {'message': message, 'status': 'RESUELTA', 'resolution': resolution}
