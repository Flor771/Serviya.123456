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
    s=db.execute(text("SELECT id,client_id,worker_id,status,completion_submitted,completion_summary,completion_photos FROM services WHERE id=:id FOR UPDATE"),{"id":service_id}).mappings().first()
    if not s: raise HTTPException(404,"Servicio no encontrado")
    if s["client_id"] != current_user.id: raise HTTPException(403,"Solo el cliente que contrató el servicio puede aprobarlo")
    photos = s["completion_photos"] or []
    if isinstance(photos, str):
        import json
        try: photos = json.loads(photos)
        except Exception: photos = []
    if not isinstance(photos, list): photos = []
    work_status = db.execute(text("SELECT status FROM service_work_status_history WHERE service_id=:sid ORDER BY created_at DESC, id DESC LIMIT 1"), {"sid":service_id}).scalar()
    direct_finalization = (not s["completion_submitted"] and work_status == "FINALIZANDO" and bool(photos))
    if not s["completion_submitted"] and not direct_finalization:
        raise HTTPException(400,"El técnico debe marcar el trabajo como finalizando y subir al menos una foto de evidencia antes de la aprobación")
    escrow=db.execute(text("SELECT id,total_amount_rd,status FROM escrows WHERE service_id=:sid ORDER BY created_at DESC LIMIT 1 FOR UPDATE"),{"sid":service_id}).mappings().first()
    if not escrow: raise HTTPException(404,"No existe una custodia para este servicio")
    if escrow["status"] == "PENDIENTE_APROBACION": return {"message":"La aprobación del cliente ya fue registrada y está pendiente de Administración.","status":"PENDIENTE_APROBACION"}
    if escrow["status"] != "RETENIDO": raise HTTPException(409,"La custodia no está disponible para aprobación del cliente")
    if direct_finalization:
        summary = s["completion_summary"] or "El cliente revisó la evidencia fotográfica y confirmó la finalización del trabajo."
        db.execute(text("UPDATE services SET completion_submitted=true,completion_summary=:summary,completion_submitted_at=CURRENT_TIMESTAMP WHERE id=:id"), {"summary":summary,"id":service_id})
    db.execute(text("UPDATE escrows SET status='PENDIENTE_APROBACION' WHERE id=:id"),{"id":escrow["id"]})
    notify(db,s["worker_id"],"Pago en proceso de liberación","El cliente confirmó que el trabajo está terminado y conforme. El pago pasó al proceso de liberación de Administración; el dinero permanece protegido en Custodia hasta que Administración lo confirme.","CLIENT_APPROVED_RELEASE",service_id)
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
    row=db.execute(text("""
        SELECT sw.id, sw.service_id, sw.client_id, sw.worker_id, sw.coverage_days, sw.status,
               sw.activated_at, sw.expires_at, sw.certificate_ref,
               CONCAT_WS(' ', cu.first_name, cu.last_name) AS client_name,
               CONCAT_WS(' ', wu.first_name, wu.last_name) AS worker_name,
               s.title AS service_title,
               COALESCE(s.negotiated_price_rd, s.price_rd, 0) AS amount_rd
        FROM service_warranties sw
        JOIN services s ON s.id=sw.service_id
        LEFT JOIN users cu ON cu.id=sw.client_id
        LEFT JOIN users wu ON wu.id=sw.worker_id
        WHERE sw.service_id=:sid LIMIT 1
    """),{"sid":service_id}).mappings().first()
    if not row: raise HTTPException(404,"Este servicio todavía no tiene una garantía activa")
    if current_user.id not in {row["client_id"],row["worker_id"]}: raise HTTPException(403,"No tienes acceso a esta garantía")
    revisits=db.execute(text("SELECT id,issue,description,status,scheduled_at,resolution_notes,created_at,resolved_at FROM warranty_revisits WHERE warranty_id=:wid ORDER BY created_at DESC"),{"wid":row["id"]}).mappings().all()
    warranty=dict(row)
    warranty["expired"]=bool(row["expires_at"] and row["expires_at"] < datetime.utcnow())
    return {"warranty":warranty,"revisits":[dict(r) for r in revisits]}

@router.post("/{service_id}/warranty/revisit")
def request_warranty_revisit(service_id: str, data: dict, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row=db.execute(text("SELECT id,client_id,worker_id,expires_at FROM service_warranties WHERE service_id=:sid FOR UPDATE"),{"sid":service_id}).mappings().first()
    if not row: raise HTTPException(404,"Este servicio todavía no tiene una garantía activa")
    if current_user.id != row["client_id"]: raise HTTPException(403,"Solo el cliente puede solicitar una revisita")
    if row["expires_at"] and row["expires_at"] < datetime.utcnow(): raise HTTPException(409,"La garantía ya venció; no se puede solicitar una revisita")
    issue=str(data.get("issue") or "").strip(); description=str(data.get("description") or "").strip()
    if len(issue)<3 or len(description)<10: raise HTTPException(422,"Indica el problema y una explicación de al menos 10 caracteres")
    rid=str(uuid.uuid4())
    db.execute(text("INSERT INTO warranty_revisits (id,service_id,warranty_id,requested_by_user_id,client_id,worker_id,issue,description,status,created_at,updated_at) VALUES (:id,:sid,:wid,:uid,:cid,:wid2,:issue,:description,'SOLICITADA',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"),{"id":rid,"sid":service_id,"wid":row["id"],"uid":current_user.id,"cid":row["client_id"],"wid2":row["worker_id"],"issue":issue,"description":description})
    notify(db,row["worker_id"],"Nueva revisita de garantía",f"El cliente solicitó una revisita de garantía para el servicio {service_id}.","WARRANTY_REVISIT_REQUESTED",service_id)
    db.commit()
    return {"message":"Revisita solicitada correctamente.","status":"SOLICITADA","revisit_id":rid}

@router.post("/{service_id}/warranty/revisits/{revisit_id}/schedule")
def schedule_warranty_revisit(service_id: str, revisit_id: str, data: dict, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row=db.execute(text("SELECT * FROM warranty_revisits WHERE id=:rid AND service_id=:sid FOR UPDATE"),{"rid":revisit_id,"sid":service_id}).mappings().first()
    if not row: raise HTTPException(404,"Revisita no encontrada")
    if current_user.id != row["worker_id"]: raise HTTPException(403,"Solo el trabajador puede programar la revisita")
    scheduled_at=data.get("scheduled_at")
    if not scheduled_at: raise HTTPException(422,"Indica fecha y hora para la revisita")
    db.execute(text("UPDATE warranty_revisits SET scheduled_at=:at,status='PROGRAMADA',updated_at=CURRENT_TIMESTAMP WHERE id=:rid"),{"at":scheduled_at,"rid":revisit_id})
    notify(db,row["client_id"],"Revisita programada",f"La revisita de garantía fue programada para {scheduled_at}.","WARRANTY_REVISIT_SCHEDULED",service_id)
    db.commit()
    return {"message":"Revisita programada.","status":"PROGRAMADA"}

@router.post("/{service_id}/warranty/revisits/{revisit_id}/start")
def start_warranty_revisit(service_id: str, revisit_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row=db.execute(text("SELECT * FROM warranty_revisits WHERE id=:rid AND service_id=:sid FOR UPDATE"),{"rid":revisit_id,"sid":service_id}).mappings().first()
    if not row: raise HTTPException(404,"Revisita no encontrada")
    if current_user.id != row["worker_id"]: raise HTTPException(403,"Solo el trabajador puede iniciar la revisita")
    if row["status"] != "PROGRAMADA": raise HTTPException(409,"La revisita debe estar programada antes de iniciarla")
    db.execute(text("UPDATE warranty_revisits SET status='CORRECCION_EN_PROCESO',updated_at=CURRENT_TIMESTAMP WHERE id=:rid"),{"rid":revisit_id})
    notify(db,row["client_id"],"Revisita iniciada","El trabajador inició la corrección de la garantía.","WARRANTY_REVISIT_STARTED",service_id)
    db.commit()
    return {"message":"Revisita iniciada.","status":"CORRECCION_EN_PROCESO"}

@router.post("/{service_id}/warranty/revisits/{revisit_id}/complete")
def complete_warranty_revisit(service_id: str, revisit_id: str, data: dict, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row=db.execute(text("SELECT * FROM warranty_revisits WHERE id=:rid AND service_id=:sid FOR UPDATE"),{"rid":revisit_id,"sid":service_id}).mappings().first()
    if not row: raise HTTPException(404,"Revisita no encontrada")
    if current_user.id != row["worker_id"]: raise HTTPException(403,"Solo el trabajador puede registrar la corrección")
    notes=str(data.get("notes") or "").strip()
    if len(notes)<5: raise HTTPException(422,"Describe la corrección realizada")
    db.execute(text("UPDATE warranty_revisits SET status='CORRECCION_REALIZADA',resolution_notes=:notes,updated_at=CURRENT_TIMESTAMP WHERE id=:rid"),{"notes":notes,"rid":revisit_id})
    notify(db,row["client_id"],"Corrección de garantía registrada","La corrección fue registrada. Revisa el resultado y confirma la solución.","WARRANTY_REVISIT_COMPLETED",service_id)
    db.commit()
    return {"message":"Corrección registrada.","status":"CORRECCION_REALIZADA"}

@router.post("/{service_id}/warranty/revisits/{revisit_id}/confirm")
def confirm_warranty_revisit(service_id: str, revisit_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row=db.execute(text("SELECT * FROM warranty_revisits WHERE id=:rid AND service_id=:sid FOR UPDATE"),{"rid":revisit_id,"sid":service_id}).mappings().first()
    if not row: raise HTTPException(404,"Revisita no encontrada")
    if current_user.id != row["client_id"]: raise HTTPException(403,"Solo el cliente puede confirmar la solución")
    if row["status"] != "CORRECCION_REALIZADA": raise HTTPException(409,"La corrección todavía no está lista para confirmación")
    db.execute(text("UPDATE warranty_revisits SET status='CERRADA',resolved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=:rid"),{"rid":revisit_id})
    notify(db,row["worker_id"],"Revisita cerrada","El cliente confirmó la solución de la garantía.","WARRANTY_REVISIT_CONFIRMED",service_id)
    db.commit()
    return {"message":"Solución confirmada y revisita cerrada.","status":"CERRADA"}

@router.post("/{service_id}/warranty/revisits/{revisit_id}/escalate")
def escalate_warranty_revisit(service_id: str, revisit_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row=db.execute(text("SELECT * FROM warranty_revisits WHERE id=:rid AND service_id=:sid FOR UPDATE"),{"rid":revisit_id,"sid":service_id}).mappings().first()
    if not row: raise HTTPException(404,"Revisita no encontrada")
    if current_user.id not in {row["client_id"],row["worker_id"]}: raise HTTPException(403,"No tienes acceso a esta revisita")
    if row["status"] not in {"SOLICITADA","PROGRAMADA","CORRECCION_EN_PROCESO","CORRECCION_REALIZADA"}: raise HTTPException(409,"Esta revisita ya no puede escalarse")
    db.execute(text("UPDATE warranty_revisits SET status='ESCALADA_ADMIN',updated_at=CURRENT_TIMESTAMP WHERE id=:rid"),{"rid":revisit_id})
    admins=db.execute(text("SELECT id FROM users WHERE COALESCE(is_active,true)=true AND (role='ADMIN' OR admin_role IS NOT NULL OR active_role='ADMIN')")).scalars().all()
    for admin_id in admins:
        notify(db,admin_id,"Revisita de garantía escalada",f"La revisita {revisit_id} fue escalada a Administración SERVIYA.","WARRANTY_REVISIT_ESCALATED",service_id)
    db.commit()
    return {"message":"Revisita escalada a Administración.","status":"ESCALADA_ADMIN"}
