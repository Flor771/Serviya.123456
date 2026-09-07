from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import Notification, User

router = APIRouter(prefix="/notifications", tags=["Notificaciones"])

@router.get("")
def list_notifications(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    notes = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()
    results = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "read": n.read,
            "created_at": str(n.created_at)
        } for n in notes
    ]
    return {"notifications": results}

@router.patch("/mark-read")
def mark_read(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.read == False).update({"read": True})
    db.commit()
    return {"message": "Todas las notificaciones fueron marcadas como leídas"}
