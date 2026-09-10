from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.models.models import User

router = APIRouter(prefix='/admin', tags=['Disputas administrativas'])

@router.get('/disputes')
def get_admin_disputes(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text('''
        SELECT d.id, d.service_id, d.opened_by_user_id, d.against_user_id, d.status,
               d.description, d.admin_notes, d.resolution_notes, d.created_at,
               s.title AS service_title,
               COALESCE(c.full_name, CONCAT(COALESCE(c.first_name,''),' ',COALESCE(c.last_name,''))) AS client_name,
               COALESCE(w.full_name, CONCAT(COALESCE(w.first_name,''),' ',COALESCE(w.last_name,''))) AS worker_name,
               e.total_amount_rd, e.status AS escrow_status
        FROM disputes d
        LEFT JOIN services s ON s.id=d.service_id
        LEFT JOIN users c ON c.id=d.opened_by_user_id
        LEFT JOIN users w ON w.id=d.against_user_id
        LEFT JOIN escrows e ON e.service_id=d.service_id AND e.status IN ('RETENIDO','EN_DISPUTA')
        WHERE d.service_id IS NOT NULL AND d.status IN ('ABIERTA','EN_REVISION')
        ORDER BY d.created_at DESC
    ''')).mappings().all()
    return {'disputes':[dict(r) for r in rows]}
