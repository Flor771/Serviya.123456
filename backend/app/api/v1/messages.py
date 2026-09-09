from fastapi import APIRouter, Depends, HTTPException, status
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

def role_of(user): return user.role.value if hasattr(user.role,"value") else str(user.role)

@router.get("/conversations")
def get_conversations(current_user: User=Depends(get_current_active_user), db: Session=Depends(get_db)):
    user_msgs=db.query(Message).filter(or_(Message.sender_id==current_user.id,Message.receiver_id==current_user.id)).order_by(desc(Message.created_at)).all()
    user_services=db.query(Service).filter(or_(Service.client_id==current_user.id,Service.worker_id==current_user.id)).all()
    service_map={s.id:s for s in user_services}; service_ids=set([m.service_id for m in user_msgs]+list(service_map.keys())); conversations=[]
    for s_id in service_ids:
        service=service_map.get(s_id) or db.query(Service).filter(Service.id==s_id).first(); s_msgs=[m for m in user_msgs if m.service_id==s_id]
        if not s_msgs: s_msgs=db.query(Message).filter(Message.service_id==s_id).order_by(desc(Message.created_at)).all()
        last=s_msgs[0] if s_msgs else None; other=None
        if service: other=service.worker_id if service.client_id==current_user.id else service.client_id if service.worker_id==current_user.id else None
        if not other and last: other=last.receiver_id if last.sender_id==current_user.id else last.sender_id
        ou=db.query(User).filter(User.id==other).first() if other else None
        conversations.append({"service_id":s_id,"service_title":service.title if service else f"Servicio #{s_id}","other_user":{"id":other or "","first_name":ou.first_name if ou else "Usuario","last_name":ou.last_name if ou else "SERVIYA","email":ou.email if ou else "","role":role_of(ou) if ou else ""},"last_message":{"content":last.content,"created_at":str(last.created_at),"sender_id":last.sender_id} if last else None})
    return {"conversations":conversations}

@router.get("/{service_id}")
def get_messages(service_id:str,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    service=db.query(Service).filter(Service.id==service_id).first(); role=role_of(current_user)
    authorized=role=="ADMIN" or (service is not None and current_user.id in (service.client_id,service.worker_id))
    if not authorized: authorized=db.query(Message).filter(Message.service_id==service_id,or_(Message.sender_id==current_user.id,Message.receiver_id==current_user.id)).first() is not None
    if not authorized: raise HTTPException(403,"No tienes permiso para acceder a los mensajes de esta conversación.")
    msgs=db.query(Message).filter(Message.service_id==service_id).order_by(Message.created_at.asc()).all()
    return {"messages":[{"id":m.id,"service_id":m.service_id,"sender_id":m.sender_id,"receiver_id":m.receiver_id,"content":m.content,"created_at":str(m.created_at)} for m in msgs]}

@router.post("")
def send_message(data:CreateMessageSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    service=db.query(Service).filter(Service.id==data.service_id).first()
    if not service: raise HTTPException(404,"Servicio no encontrado")
    role=role_of(current_user)
    if role!="ADMIN" and current_user.id not in (service.client_id,service.worker_id): raise HTTPException(403,"Solo los participantes del servicio pueden enviar mensajes")
    if role!="ADMIN":
        if not service.worker_id: raise HTTPException(400,"El servicio todavía no tiene técnico seleccionado")
        counterpart=service.worker_id if current_user.id==service.client_id else service.client_id
        if data.receiver_id!=counterpart: raise HTTPException(403,"El destinatario no pertenece a esta conversación")
    if not data.content.strip(): raise HTTPException(400,"El mensaje no puede estar vacío")
    msg=Message(service_id=data.service_id,sender_id=current_user.id,receiver_id=data.receiver_id,content=data.content.strip()); db.add(msg)
    if role!="ADMIN":
        db.add(Notification(user_id=data.receiver_id,title="Nuevo mensaje de SERVIYA",message=f"{current_user.first_name} te envió un mensaje sobre: {service.title}",type="MESSAGE",related_entity_id=service.id))
    db.commit(); db.refresh(msg)
    return {"message":"Mensaje enviado exitosamente","data":{"id":msg.id,"service_id":msg.service_id,"sender_id":msg.sender_id,"receiver_id":msg.receiver_id,"content":msg.content,"created_at":str(msg.created_at)}}
