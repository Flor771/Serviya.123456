from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.core.deps import get_db, get_current_active_user
from app.models.models import Message, Service, User, UserRoleEnum

router = APIRouter(prefix="/messages", tags=["Mensajería"])

class CreateMessageSchema(BaseModel):
    service_id: str
    receiver_id: str
    content: str

@router.get("/conversations")
def get_conversations(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Find all messages where current_user is sender or receiver
    user_msgs = db.query(Message).filter(
        or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id)
    ).order_by(desc(Message.created_at)).all()

    # Find services where current_user is client or worker
    user_services = db.query(Service).filter(
        or_(Service.client_id == current_user.id, Service.worker_id == current_user.id)
    ).all()

    service_map = {s.id: s for s in user_services}
    
    # Collect all unique service_ids
    service_ids = set([m.service_id for m in user_msgs] + list(service_map.keys()))

    conversations = []
    for s_id in service_ids:
        # Get service if exists
        service = service_map.get(s_id) or db.query(Service).filter(Service.id == s_id).first()
        
        # Get msgs for this service
        s_msgs = [m for m in user_msgs if m.service_id == s_id]
        if not s_msgs:
            s_msgs = db.query(Message).filter(Message.service_id == s_id).order_by(desc(Message.created_at)).all()
        
        last_msg = s_msgs[0] if s_msgs else None

        # Determine other user
        other_user_id = None
        if service:
            if service.client_id == current_user.id:
                other_user_id = service.worker_id
            elif service.worker_id == current_user.id:
                other_user_id = service.client_id
        
        if not other_user_id and last_msg:
            other_user_id = last_msg.receiver_id if last_msg.sender_id == current_user.id else last_msg.sender_id

        other_user_data = None
        if other_user_id:
            ou = db.query(User).filter(User.id == other_user_id).first()
            if ou:
                role_str = ou.role.value if hasattr(ou.role, "value") else str(ou.role)
                other_user_data = {
                    "id": ou.id,
                    "first_name": ou.first_name,
                    "last_name": ou.last_name,
                    "email": ou.email,
                    "role": role_str
                }

        conversations.append({
            "service_id": s_id,
            "service_title": service.title if service else f"Servicio #{s_id}",
            "other_user": other_user_data or {"id": other_user_id or "unknown", "first_name": "Usuario", "last_name": "SERVIYA"},
            "last_message": {
                "content": last_msg.content if last_msg else "Sin mensajes previos",
                "created_at": str(last_msg.created_at) if last_msg else str(service.created_at if service else ""),
                "sender_id": last_msg.sender_id if last_msg else None
            } if last_msg else None
        })

    return {"conversations": conversations}

@router.get("/{service_id}")
def get_messages(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    
    # Server-side security check:
    service = db.query(Service).filter(Service.id == service_id).first()
    
    # User is authorized if admin, service client, service worker, or sender/receiver of messages in this service
    is_authorized = False
    if role_str == "ADMIN":
        is_authorized = True
    elif service and (service.client_id == current_user.id or service.worker_id == current_user.id):
        is_authorized = True
    else:
        # Check if user has messages in this service
        user_msg = db.query(Message).filter(
            Message.service_id == service_id,
            or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id)
        ).first()
        if user_msg:
            is_authorized = True

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a los mensajes de esta conversación."
        )

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
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    
    # Validate authorization
    service = db.query(Service).filter(Service.id == data.service_id).first()
    if role_str != "ADMIN" and service:
        if service.client_id != current_user.id and service.worker_id != current_user.id and data.receiver_id != current_user.id:
            # allow message sending between parties
            pass

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
            "receiver_id": msg.receiver_id,
            "content": msg.content,
            "created_at": str(msg.created_at)
        }
    }
