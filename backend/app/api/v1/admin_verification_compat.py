from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.models.models import User

router = APIRouter(prefix="/admin", tags=["Verificación administrativa"])

class VerificationDecision(BaseModel):
    status: str
    notes: str | None = None

@router.patch("/verifications/{verification_id}")
def update_verification(verification_id: int, data: VerificationDecision, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    status = str(data.status or '').strip().upper()
    if status not in {'VERIFICADO','APROBADO','RECHAZADO','PENDIENTE'}:
        raise HTTPException(400, 'Estado de verificación no válido.')
    row = db.execute(text('SELECT id, worker_id FROM verifications WHERE id=:id FOR UPDATE'), {'id': verification_id}).mappings().first()
    if not row:
        raise HTTPException(404, 'Documento de verificación no encontrado.')
    canonical = 'VERIFICADO' if status == 'APROBADO' else status
    db.execute(text('UPDATE verifications SET status=:status, admin_feedback=:notes WHERE id=:id'), {'status':canonical,'notes':data.notes,'id':verification_id})
    if canonical == 'VERIFICADO':
        db.execute(text('UPDATE users SET is_verified=true WHERE id=:uid'), {'uid':row['worker_id']})
    elif canonical == 'RECHAZADO':
        db.execute(text('UPDATE users SET is_verified=false WHERE id=:uid'), {'uid':row['worker_id']})
    db.execute(text("INSERT INTO admin_audit_logs (admin_id,action,resource,target_id,details,timestamp) VALUES (:aid,'VERIFICATION_UPDATED','verifications',:id,:details,CURRENT_TIMESTAMP)"), {'aid':admin_user.id,'id':verification_id,'details':f'Estado={canonical}; {data.notes or ""}'})
    db.commit()
    return {'message':'Verificación actualizada.','status':canonical}
