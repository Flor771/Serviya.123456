from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.core.deps import get_db, get_current_active_user
from app.models.models import Message, Service, User, Notification

router = APIRouter(prefix="/messages", tags=["Mensajería"])

class CreateMessageSchema(BaseModel):
    service_id: str
    receiver_id: str
    content: str

def role_of(user):
    return user.role.value if hasattr(user.role, "value") else str(user.role)

def participant(service, user_id):
    return service and user_id in (service.client_id, service.worker_id)

@router.get("/conversations")
def get_conversations(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    user_msgs = db.query(Message).filter(
        or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id)
    ).order_by(desc(Message.created_at)).all()
    user_services = db.query(Service).filter(
        or_(Service.client_id == current_user.id, Service.worker_id == current_user.id)
    ).all()
    service_map = {s.id: s for s in user_services}
    service_ids = set(m.service_id for m in user_msgs) | set(service_map.keys())
    conversations = []
    for service_id in service_ids:
        service = service_map.get(service_id) or db.query(Service).filter(Service.id == service_id).first()
        service_msgs = [m for m in user_msgs if m.service_id == service_id]
        if not service_msgs:
            service_msgs = db.query(Message).filter(Message.service_id == service_id).order_by(desc(Message.created_at)).all()
        last = service_msgs[0] if service_msgs else None
        other_id = None
        if service:
            if service.client_id == current_user.id:
                other_id = service.worker_id
            elif service.worker_id == current_user.id:
                other_id = service.client_id
        if not other_id and last:
            other_id = last.receiver_id if last.sender_id == current_user.id else last.sender_id
        other = db.query(User).filter(User.id == other_id).first() if other_id else None
        conversations.append({
            "service_id": service_id,
            "service_title": service.title if service else f"Servicio #{service_id}",
            "other_user": {
                "id": other_id or "",
                "first_name": other.first_name if other else "Usuario",
                "last_name": other.last_name if other else "SERVIYA",
                "email": other.email if other else "",
                "role": role_of(other) if other else ""
            },
            "last_message": {
                "content": last.content,
                "created_at": str(last.created_at),
                "sender_id": last.sender_id
            } if last else None
        })
    conversations.sort(key=lambda c: c["last_message"]["created_at"] if c["last_message"] else "", reverse=True)
    return {"conversations": conversations}

@router.get("/{service_id}")
def get_messages(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    role = role_of(current_user)
    authorized = role == "ADMIN" or participant(service, current_user.id)
    if not authorized:
        authorized = db.query(Message).filter(
            Message.service_id == service_id,
            or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id)
        ).first() is not None
    if not authorized:
        raise HTTPException(403, "No tienes permiso para acceder a los mensajes de esta conversación.")
    msgs = db.query(Message).filter(Message.service_id == service_id).order_by(Message.created_at.asc()).all()
    return {"messages": [
        {"id": m.id, "service_id": m.service_id, "sender_id": m.sender_id,
         "receiver_id": m.receiver_id, "content": m.content, "created_at": str(m.created_at)}
        for m in msgs
    ]}

@router.post("")
def send_message(data: CreateMessageSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == data.service_id).first()
    if not service:
        raise HTTPException(404, "Servicio no encontrado")
    role = role_of(current_user)
    if role != "ADMIN" and not participant(service, current_user.id):
        raise HTTPException(403, "Solo los participantes del servicio pueden enviar mensajes")
    if role != "ADMIN":
        if not service.worker_id:
            raise HTTPException(400, "El servicio todavía no tiene trabajador/técnico seleccionado")
        counterpart = service.worker_id if current_user.id == service.client_id else service.client_id
        if data.receiver_id != counterpart:
            raise HTTPException(403, "El destinatario no pertenece a esta conversación")
    content = data.content.strip()
    if not content:
        raise HTTPException(400, "El mensaje no puede estar vacío")
    msg = Message(
        service_id=data.service_id,
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        content=content
    )
    db.add(msg)
    if role != "ADMIN":
        # Production notifications table currently does not expose related_entity_id.
        db.add(Notification(
            user_id=data.receiver_id,
            title="Nuevo mensaje de SERVIYA",
            message=f"{current_user.first_name} te envió un mensaje sobre: {service.title}",
            type="MESSAGE"
        ))
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
