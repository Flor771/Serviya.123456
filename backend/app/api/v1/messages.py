from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text, or_, desc
from app.core.deps import get_db, get_current_active_user
from app.models.models import Service, User, Notification

router = APIRouter(prefix="/messages", tags=["Mensajería"])

class CreateMessageSchema(BaseModel):
    service_id: str
    receiver_id: str
    content: str

def role_of(user):
    return user.role.value if hasattr(user.role, "value") else str(user.role)

def participant(service, user_id):
    return service and user_id in (service.client_id, service.worker_id)

def message_rows(db, service_id=None, user_id=None):
    clauses = []
    params = {}
    if service_id is not None:
        clauses.append("service_id = :service_id")
        params["service_id"] = service_id
    if user_id is not None:
        clauses.append("(sender_id = :user_id OR receiver_id = :user_id)")
        params["user_id"] = user_id
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = text(f"""
        SELECT id, service_id, sender_id, receiver_id,
               COALESCE(content, text) AS content, created_at
        FROM messages
        {where}
        ORDER BY created_at ASC, id ASC
    """)
    return db.execute(sql, params).mappings().all()

@router.get("/conversations")
def get_conversations(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    services = db.query(Service).filter(
        or_(Service.client_id == current_user.id, Service.worker_id == current_user.id)
    ).order_by(desc(Service.created_at)).all()

    conversations = []
    for service in services:
        if not service.worker_id:
            continue
        other_id = service.worker_id if service.client_id == current_user.id else service.client_id
        other = db.query(User).filter(User.id == other_id).first()
        rows = message_rows(db, service_id=service.id)
        last = rows[-1] if rows else None
        conversations.append({
            "service_id": service.id,
            "service_title": service.title,
            "other_user": {
                "id": other_id or "",
                "first_name": other.first_name if other else "Usuario",
                "last_name": other.last_name if other else "SERVIYA",
                "email": other.email if other else "",
                "role": role_of(other) if other else ""
            },
            "last_message": {
                "content": last["content"],
                "created_at": str(last["created_at"]),
                "sender_id": last["sender_id"]
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
        raise HTTPException(403, "No tienes permiso para acceder a los mensajes de esta conversación.")

    rows = message_rows(db, service_id=service_id)
    return {"messages": [
        {
            "id": row["id"],
            "service_id": row["service_id"],
            "sender_id": row["sender_id"],
            "receiver_id": row["receiver_id"],
            "content": row["content"],
            "created_at": str(row["created_at"])
        }
        for row in rows
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

    # The production messages table is legacy: id is integer, conversation_id
    # belongs to the old chat model, while SERVIYA uses service-based chat.
    # Migration 016 adds nullable service_id/receiver_id/content so new chat
    # messages can be stored without breaking the existing legacy records.
    result = db.execute(text("""
        INSERT INTO messages (service_id, sender_id, receiver_id, text, content, is_read, created_at)
        VALUES (:service_id, :sender_id, :receiver_id, :text, :content, false, CURRENT_TIMESTAMP)
        RETURNING id, service_id, sender_id, receiver_id, COALESCE(content, text) AS content, created_at
    """), {
        "service_id": data.service_id,
        "sender_id": current_user.id,
        "receiver_id": data.receiver_id,
        "text": content,
        "content": content,
    })
    row = result.mappings().one()

    if role != "ADMIN":
        db.add(Notification(
            user_id=data.receiver_id,
            title="Nuevo mensaje de SERVIYA",
            message=f"{current_user.first_name} te envió un mensaje sobre: {service.title}",
            type="MESSAGE"
        ))

    db.commit()
    return {
        "message": "Mensaje enviado exitosamente",
        "data": {
            "id": row["id"],
            "service_id": row["service_id"],
            "sender_id": row["sender_id"],
            "receiver_id": row["receiver_id"],
            "content": row["content"],
            "created_at": str(row["created_at"])
        }
    }
