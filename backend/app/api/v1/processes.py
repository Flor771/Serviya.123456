from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_active_user
from app.models.models import ProcessEvent, User

router = APIRouter(prefix="/processes", tags=["Estados de procesos"])

@router.get("")
def list_process_events(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    events = db.query(ProcessEvent).filter(ProcessEvent.user_id == current_user.id).order_by(ProcessEvent.created_at.desc()).limit(200).all()
    return {"processes": [
        {"id": e.id, "process_type": e.process_type, "status": e.status,
         "title": e.title, "message": e.message, "next_step": e.next_step,
         "rejection_reason": e.rejection_reason, "correction": e.correction,
         "related_entity_id": e.related_entity_id, "created_at": str(e.created_at)}
        for e in events
    ]}

@router.get("/{process_type}")
def list_process_type(process_type: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    events = db.query(ProcessEvent).filter(ProcessEvent.user_id == current_user.id, ProcessEvent.process_type == process_type).order_by(ProcessEvent.created_at.desc()).limit(100).all()
    return {"process_type": process_type, "processes": [
        {"id": e.id, "status": e.status, "title": e.title, "message": e.message,
         "next_step": e.next_step, "rejection_reason": e.rejection_reason,
         "correction": e.correction, "related_entity_id": e.related_entity_id,
         "created_at": str(e.created_at)}
        for e in events
    ]}
