from fastapi import APIRouter, Depends, HTTPException
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
            "read": bool(n.read),
            "related_entity_id": n.related_entity_id,
            "created_at": str(n.created_at),
        }
        for n in notes
    ]
    return {"notifications": results}

@router.patch("/{notification_id}/read")
def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    note = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    note.read = True
    db.commit()
    return {"message": "Notificación marcada como leída", "id": notification_id, "read": True}

@router.patch("/mark-read")
def mark_read(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.read == False).update({"read": True})
    db.commit()
    return {"message": "Todas las notificaciones fueron marcadas como leídas"}
