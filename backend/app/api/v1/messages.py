from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import Message, Service, User

router = APIRouter(prefix="/messages", tags=["Mensajería"])

class CreateMessageSchema(BaseModel):
    service_id: str
    receiver_id: str
    content: str

@router.get("/{service_id}")
def get_messages(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    msgs = db.query(Message).filter(Message.service_id == service_id).order_by(Message.created_at.asc()).all()
    results = [
        {
            "id": m.id,
            "service_id": m.service_id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "content": m.content,
            "created_at": str(m.created_at)
        } for m in msgs
    ]
    return {"messages": results}

@router.post("")
def send_message(
    data: CreateMessageSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    msg = Message(
        service_id=data.service_id,
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        content=data.content
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "message": "Mensaje enviado exitosamente",
        "data": {
            "id": msg.id,
            "service_id": msg.service_id,
            "sender_id": msg.sender_id,
            "content": msg.content
        }
    }
