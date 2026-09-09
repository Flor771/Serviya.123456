import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_active_user
from app.models.models import User

router = APIRouter(prefix="/completion", tags=["Finalización y Garantía"])

class CompletionSubmitSchema(BaseModel):
    summary: str = Field(min_length=5, max_length=1500)
    otp: str | None = Field(default=None, max_length=10)


def notify(db, user_id, title, message, typ, related):
    db.execute(text("INSERT INTO notifications (user_id,title,message,type,is_read,created_at,related_entity_id) VALUES (:u,:t,:m,:ty,false,CURRENT_TIMESTAMP,:r)"), {"u":user_id,"t":title,"m":message,"ty":typ,"r":related})

@router.post("/{service_id}/submit")
def submit_completion(service_id: str, data: CompletionSubmitSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    s=db.execute(text("SELECT id,client_id,worker_id,status,completion_submitted FROM services WHERE id=:id FOR UPDATE"),{"id":service_id}).mappings().first()
    if not s: raise HTTPException(404,"Servicio no encontrado")
    if s["worker_id"] != current_user.id: raise HTTPException(403,"Solo el técnico asignado puede enviar el trabajo a revisión")
    if s["status"] != "EN_PROGRESO": raise HTTPException(400,"El trabajo debe estar en progreso para enviarlo a revisión")
    if s["completion_submitted"]: raise HTTPException(400,"Este trabajo ya fue enviado a revisión")
    otp=f"{__import__('random').randint(100000,999999)}"
    db.execute(text("UPDATE services SET completion_submitted=true,completion_summary=:summary,completion_submitted_at=CURRENT_TIMESTAMP WHERE id=:id"),{"summary":data.summary,"id":service_id})
    db.execute(text("UPDATE escrows SET release_otp=:otp WHERE service_id=:sid AND status='RETENIDO'"),{"otp":otp,"sid":service_id})
    notify(db,s["client_id"],"Trabajo listo para revisión",f"El técnico envió el trabajo a revisión. Revisa las fotos y el resumen antes de aprobar y liberar fondos. Código de conformidad: {otp}.","COMPLETION_SUBMITTED",service_id)
    db.commit()
    return {"message":"Trabajo enviado a revisión del cliente.","service_id":service_id,"completion_submitted":True,"release_otp":otp}

@router.get("/{service_id}")
def get_completion(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    s=db.execute(text("SELECT id,client_id,worker_id,status,completion_submitted,completion_summary,completion_submitted_at FROM services WHERE id=:id"),{"id":service_id}).mappings().first()
    if not s: raise HTTPException(404,"Servicio no encontrado")
    if current_user.id not in {s["client_id"],s["worker_id"]}: raise HTTPException(403,"No tienes acceso a este trabajo")
    return {"service_id":service_id,"completion_submitted":bool(s["completion_submitted"]),"summary":s["completion_summary"],"submitted_at":str(s["completion_submitted_at"]) if s["completion_submitted_at"] else None,"status":s["status"].value if hasattr(s["status"],"value") else str(s["status"])}

@router.get("/{service_id}/warranty")
def get_warranty(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row=db.execute(text("SELECT id,service_id,client_id,worker_id,coverage_days,status,activated_at,expires_at,certificate_ref FROM service_warranties WHERE service_id=:sid"),{"sid":service_id}).mappings().first()
    if not row: raise HTTPException(404,"Este servicio todavía no tiene una garantía activa")
    if current_user.id not in {row["client_id"],row["worker_id"]}: raise HTTPException(403,"No tienes acceso a esta garantía")
    return {"warranty":dict(row)}
