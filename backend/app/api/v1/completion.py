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
    db.execute(text("INSERT INTO notifications (user_id,title,message,type,read,created_at,related_entity_id) VALUES (:u,:t,:m,:ty,false,CURRENT_TIMESTAMP,:r)"), {"u":user_id,"t":title,"m":message,"ty":typ,"r":related})

@router.post("/{service_id}/execute")
def execute_work(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    s = db.execute(text("SELECT id,client_id,worker_id,status,completion_submitted FROM services WHERE id=:id FOR UPDATE"), {"id":service_id}).mappings().first()
    if not s: raise HTTPException(404,"Servicio no encontrado")
    if s["worker_id"] != current_user.id: raise HTTPException(403,"Solo el técnico asignado puede ejecutar este trabajo")
    if s["status"] == "EN_PROGRESO": return {"message":"El trabajo ya está en ejecución.","service_id":service_id,"status":"EN_PROGRESO"}
    if s["status"] != "TRABAJADOR_SELECCIONADO": raise HTTPException(409,"El trabajo no está listo para ejecución. La Custodia debe estar confirmada y el técnico debe estar asignado.")
    escrow = db.execute(text("SELECT id,status,total_amount_rd FROM escrows WHERE service_id=:sid ORDER BY created_at DESC LIMIT 1 FOR UPDATE"), {"sid":service_id}).mappings().first()
    if not escrow: raise HTTPException(409,"No existe una Custodia asociada a este servicio")
    if escrow["status"] != "RETENIDO": raise HTTPException(409,"El dinero todavía no está en Custodia SERVIYA; Administración debe confirmar el depósito primero")
    db.execute(text("UPDATE services SET status='EN_PROGRESO' WHERE id=:id"), {"id":service_id})
    notify(db,s["client_id"],"Trabajo iniciado", "El técnico asignado comenzó oficialmente el trabajo. El pago continúa protegido en Custodia SERVIYA.", "WORK_STARTED", service_id)
    db.commit()
    return {"message":"Trabajo ejecutado correctamente. El servicio está EN_PROGRESO.","service_id":service_id,"status":"EN_PROGRESO"}

@router.post("/{service_id}/submit")
def submit_completion(service_id: str, data: CompletionSubmitSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    s=db.execute(text("SELECT id,client_id,worker_id,status,completion_submitted,completion_photos FROM services WHERE id=:id FOR UPDATE"),{"id":service_id}).mappings().first()
    if not s: raise HTTPException(404,"Servicio no encontrado")
    if s["worker_id"] != current_user.id: raise HTTPException(403,"Solo el técnico asignado puede enviar el trabajo a revisión")
    if s["status"] != "EN_PROGRESO": raise HTTPException(400,"El trabajo debe estar en progreso para enviarlo a revisión")
    if s["completion_submitted"]: raise HTTPException(400,"Este trabajo ya fue enviado a revisión")
    photos = s["completion_photos"] or []
    if isinstance(photos, str):
        import json
        try: photos = json.loads(photos)
        except Exception: photos = []
    if not isinstance(photos, list) or not photos: raise HTTPException(400,"Debes subir al menos una foto de evidencia antes de marcar el trabajo como terminado")
    otp=f"{__import__('random').randint(100000,999999)}"
    db.execute(text("UPDATE services SET completion_submitted=true,completion_summary=:summary,completion_submitted_at=CURRENT_TIMESTAMP WHERE id=:id"),{"summary":data.summary,"id":service_id})
    db.execute(text("UPDATE escrows SET release_otp=:otp WHERE service_id=:sid AND status='RETENIDO'"),{"otp":otp,"sid":service_id})
    notify(db,s["client_id"],"Trabajo listo para revisión",f"El técnico envió el trabajo a revisión. Revisa las fotos y el resumen antes de aprobar y liberar fondos. Código de conformidad: {otp}.","COMPLETION_SUBMITTED",service_id)
    db.commit()
    return {"message":"Trabajo enviado a revisión del cliente.","service_id":service_id,"completion_submitted":True,"release_otp":otp}

@router.post("/{service_id}/approve")
def approve_completion(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    s=db.execute(text("SELECT id,client_id,worker_id,status,completion_submitted,completion_summary FROM services WHERE id=:id FOR UPDATE"),{"id":service_id}).mappings().first()
    if not s: raise HTTPException(404,"Servicio no encontrado")
    if s["client_id"] != current_user.id: raise HTTPException(403,"Solo el cliente que contrató el servicio puede aprobarlo")
    if not s["completion_submitted"]: raise HTTPException(400,"El técnico todavía no ha enviado el trabajo a revisión")
    escrow=db.execute(text("SELECT id,total_amount_rd,status FROM escrows WHERE service_id=:sid ORDER BY created_at DESC LIMIT 1 FOR UPDATE"),{"sid":service_id}).mappings().first()
    if not escrow: raise HTTPException(404,"No existe una custodia para este servicio")
    if escrow["status"] == "PENDIENTE_APROBACION": return {"message":"La aprobación del cliente ya fue registrada y está pendiente de Administración.","status":"PENDIENTE_APROBACION"}
    if escrow["status"] != "RETENIDO": raise HTTPException(409,"La custodia no está disponible para aprobación del cliente")
    db.execute(text("UPDATE escrows SET status='PENDIENTE_APROBACION' WHERE id=:id"),{"id":escrow["id"]})
    notify(db,s["worker_id"],"Pago en proceso de liberación","El cliente confirmó que el trabajo está terminado y conforme. El pago pasó al proceso de liberación de Administración; el dinero permanece protegido en Custodia hasta que Administración lo confirme.","CLIENT_APPROVED_RELEASE",service_id)
    # La aplicación utiliza role=ADMIN y admin_role para distinguir las áreas administrativas.
    # Incluimos cualquier administrador activo, incluso si su active_role no es ADMIN en ese momento.
    admins=db.execute(text("SELECT id FROM users WHERE COALESCE(is_active,true)=true AND (role='ADMIN' OR admin_role IS NOT NULL OR active_role='ADMIN')")).scalars().all()
    for admin_id in admins:
        notify(db,admin_id,"Liberación pendiente de aprobación",f"El cliente aprobó el servicio y solicita liberar RD$ {float(escrow['total_amount_rd'] or 0):,.2f}. Revisa la evidencia y procesa la liberación administrativa.","ADMIN_RELEASE_PENDING",service_id)
    db.commit()
    return {"message":"Aprobación registrada. El dinero sigue protegido hasta que Administración confirme y libere los fondos.","status":"PENDIENTE_APROBACION","service_id":service_id}

@router.get("/{service_id}")
def get_completion(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    s=db.execute(text("SELECT id,client_id,worker_id,status,completion_submitted,completion_summary,completion_submitted_at,completion_photos FROM services WHERE id=:id"),{"id":service_id}).mappings().first()
    if not s: raise HTTPException(404,"Servicio no encontrado")
    if current_user.id not in {s["client_id"],s["worker_id"]}: raise HTTPException(403,"No tienes acceso a este trabajo")
    photos = s["completion_photos"] or []
    return {"service_id":service_id,"completion_submitted":bool(s["completion_submitted"]),"summary":s["completion_summary"],"submitted_at":str(s["completion_submitted_at"]) if s["completion_submitted_at"] else None,"status":s["status"].value if hasattr(s["status"],"value") else str(s["status"]),"photos":photos}

@router.get("/{service_id}/warranty")
def get_warranty(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row=db.execute(text("SELECT id,service_id,client_id,worker_id,coverage_days,status,activated_at,expires_at,certificate_ref FROM service_warranties WHERE service_id=:sid"),{"sid":service_id}).mappings().first()
    if not row: raise HTTPException(404,"Este servicio todavía no tiene una garantía activa")
    if current_user.id not in {row["client_id"],row["worker_id"]}: raise HTTPException(403,"No tienes acceso a esta garantía")
    return {"warranty":dict(row)}
