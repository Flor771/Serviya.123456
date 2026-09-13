from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import ProcessEvent, Notification


def record_process(
    db: Session,
    *,
    user_id: str,
    process_type: str,
    status: str,
    title: str,
    message: str,
    next_step: Optional[str] = None,
    rejection_reason: Optional[str] = None,
    correction: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    notify: bool = True,
):
    """Persist the user-visible result of an important SERVIYA action.

    This is the platform-wide source of truth for confirmations, approvals,
    rejections and next steps. It is intentionally independent of a toast/modal
    so the result survives reloads, logout/login and future sessions.
    """
    event = ProcessEvent(
        user_id=user_id,
        process_type=process_type,
        status=status,
        title=title,
        message=message,
        next_step=next_step,
        rejection_reason=rejection_reason,
        correction=correction,
        related_entity_id=related_entity_id,
        created_at=datetime.utcnow(),
    )
    db.add(event)
    if notify:
        db.add(Notification(
            user_id=user_id,
            title=title,
            message=message + (f" {next_step}" if next_step else ""),
            type=f"PROCESS_{status}",
            related_entity_id=related_entity_id,
        ))
    return event
