import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_active_user
from app.models.models import User

router = APIRouter(prefix="/completion", tags=["Garantía y Revisitas"])

class RevisitRequest(BaseModel):
    issue: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=10, max_length=2000)

class ScheduleRequest(BaseModel):
    scheduled_at: datetime

class ResolutionRequest(BaseModel):
    notes: str = Field(min_length=5, max_length=2000)


def ensure_table(db: Session) -> None:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS warranty_revisits (
            id VARCHAR(64) PRIMARY KEY,
            service_id VARCHAR(64) NOT NULL,
            warranty_id VARCHAR(64) NOT NULL,
            requested_by_user_id VARCHAR(255) NOT NULL,
            client_id VARCHAR(255) NOT NULL,
            worker_id VARCHAR(255) NOT NULL,
            issue VARCHAR(180) NOT NULL,
            description TEXT NOT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'SOLICITADA',
            scheduled_at TIMESTAMP NULL,
            resolution_notes TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP NULL
        )
    """))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_warranty_revisits_service ON warranty_revisits(service_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_warranty_revisits_worker ON warranty_revisits(worker_id,status)"))
    db.commit()


def notify(db: Session, user_id: str, title: str, message: str, related: str):
    db.execute(text("""
        INSERT INTO notifications (id,user_id,title,message,type,read,related_entity_id,created_at)
        VALUES (:id,:uid,:title,:message,'GARANTIA',false,:related,CURRENT_TIMESTAMP)
    """), {"id": uuid.uuid4().hex, "uid": user_id, "title": title, "message": message, "related": related})


def participant_warranty(service_id: str, current_user: User, db: Session):
    row = db.execute(text("""
        SELECT w.id,w.service_id,w.client_id,w.worker_id,w.coverage_days,w.status,w.activated_at,w.expires_at,w.certificate_ref,
               s.title
        FROM service_warranties w JOIN services s ON s.id=w.service_id
        WHERE w.service_id=:sid
    """), {"sid": service_id}).mappings().first()
    if not row:
        raise HTTPException(404, "Este servicio todavía no tiene una garantía registrada")
    if current_user.id not in {row['client_id'], row['worker_id']}:
        raise HTTPException(403, "No tienes acceso a esta garantía")
    if row['expires_at'] and row['expires_at'] < datetime.utcnow():
        raise HTTPException(400, "La garantía SERVIYA ya venció")
    return row


@router.post("/{service_id}/warranty/revisit")
def request_revisit(service_id: str, data: RevisitRequest, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    ensure_table(db)
    warranty = participant_warranty(service_id, current_user, db)
    if current_user.id != warranty['client_id']:
        raise HTTPException(403, "La solicitud de revisita debe iniciarla el cliente")
    active = db.execute(text("""
        SELECT id,status FROM warranty_revisits
        WHERE service_id=:sid AND status IN ('SOLICITADA','PROGRAMADA','CORRECCION_EN_PROCESO','CORRECCION_REALIZADA','ESCALADA_ADMIN')
        ORDER BY created_at DESC LIMIT 1
    """), {"sid": service_id}).mappings().first()
    if active:
        raise HTTPException(409, "Ya existe una revisita activa para esta garantía")
    rid = uuid.uuid4().hex
    db.execute(text("""
        INSERT INTO warranty_revisits
        (id,service_id,warranty_id,requested_by_user_id,client_id,worker_id,issue,description,status)
        VALUES (:id,:sid,:wid,:requested,:client,:worker,:issue,:description,'SOLICITADA')
    """), {"id":rid,"sid":service_id,"wid":warranty['id'],"requested":current_user.id,"client":warranty['client_id'],"worker":warranty['worker_id'],"issue":data.issue,"description":data.description})
    notify(db,warranty['worker_id'],"Nueva revisita por Garantía SERVIYA",f"El cliente solicitó una revisita para el servicio: {data.issue}. Revisa la solicitud y programa la visita.",rid)
    admins = db.execute(text("SELECT id FROM users WHERE COALESCE(is_active,true)=true AND (role='ADMIN' OR admin_role IS NOT NULL OR active_role='ADMIN')")).scalars().all()
    for admin_id in admins:
        notify(db,admin_id,"Solicitud de revisita SERVIYA",f"Se solicitó una revisita por garantía para el servicio {service_id}.",rid)
    db.commit()
    return {"message":"Revisita solicitada correctamente.","revisit_id":rid,"status":"SOLICITADA"}


@router.get("/{service_id}/warranty/revisits")
def list_revisits(service_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    ensure_table(db)
    participant_warranty(service_id,current_user,db)
    rows = db.execute(text("""
        SELECT id,service_id,issue,description,status,scheduled_at,resolution_notes,created_at,updated_at,resolved_at
        FROM warranty_revisits WHERE service_id=:sid ORDER BY created_at DESC
    """), {"sid":service_id}).mappings().all()
    return {"revisits":[dict(r) for r in rows]}


@router.post("/{service_id}/warranty/revisits/{revisit_id}/schedule")
def schedule_revisit(service_id: str, revisit_id: str, data: ScheduleRequest, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    ensure_table(db)
    warranty = participant_warranty(service_id,current_user,db)
    if current_user.id != warranty['worker_id']:
        raise HTTPException(403,"Solo el trabajador asignado puede programar la revisita")
    row = db.execute(text("SELECT id,status FROM warranty_revisits WHERE id=:id AND service_id=:sid FOR UPDATE"), {"id":revisit_id,"sid":service_id}).mappings().first()
    if not row: raise HTTPException(404,"Revisita no encontrada")
    if row['status'] not in ('SOLICITADA','PROGRAMADA'): raise HTTPException(409,"La revisita no puede ser programada en su estado actual")
    db.execute(text("UPDATE warranty_revisits SET status='PROGRAMADA',scheduled_at=:when,updated_at=CURRENT_TIMESTAMP WHERE id=:id"), {"when":data.scheduled_at,"id":revisit_id})
    notify(db,warranty['client_id'],"Revisita programada",f"El trabajador programó la revisita para {data.scheduled_at.strftime('%d/%m/%Y %H:%M')}.",revisit_id)
    db.commit()
    return {"message":"Revisita programada.","status":"PROGRAMADA","scheduled_at":data.scheduled_at}


@router.post("/{service_id}/warranty/revisits/{revisit_id}/start")
def start_revisit(service_id: str, revisit_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    ensure_table(db)
    warranty = participant_warranty(service_id,current_user,db)
    if current_user.id != warranty['worker_id']: raise HTTPException(403,"Solo el trabajador asignado puede iniciar la corrección")
    result = db.execute(text("UPDATE warranty_revisits SET status='CORRECCION_EN_PROCESO',updated_at=CURRENT_TIMESTAMP WHERE id=:id AND service_id=:sid AND status='PROGRAMADA' RETURNING id"), {"id":revisit_id,"sid":service_id}).first()
    if not result: raise HTTPException(409,"La revisita no está programada")
    notify(db,warranty['client_id'],"Revisita iniciada","El trabajador inició la revisión/corrección de tu solicitud de garantía.",revisit_id)
    db.commit()
    return {"message":"Corrección en proceso.","status":"CORRECCION_EN_PROCESO"}


@router.post("/{service_id}/warranty/revisits/{revisit_id}/complete")
def complete_revisit(service_id: str, revisit_id: str, data: ResolutionRequest, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    ensure_table(db)
    warranty = participant_warranty(service_id,current_user,db)
    if current_user.id != warranty['worker_id']: raise HTTPException(403,"Solo el trabajador asignado puede registrar la corrección")
    result = db.execute(text("UPDATE warranty_revisits SET status='CORRECCION_REALIZADA',resolution_notes=:notes,updated_at=CURRENT_TIMESTAMP WHERE id=:id AND service_id=:sid AND status='CORRECCION_EN_PROCESO' RETURNING id"), {"id":revisit_id,"sid":service_id,"notes":data.notes}).first()
    if not result: raise HTTPException(409,"La revisita no está en proceso de corrección")
    notify(db,warranty['client_id'],"Corrección realizada","El trabajador indicó que la corrección de garantía fue realizada. Revisa el resultado y confirma si quedó solucionado.",revisit_id)
    db.commit()
    return {"message":"Corrección registrada. Esperando confirmación del cliente.","status":"CORRECCION_REALIZADA"}


@router.post("/{service_id}/warranty/revisits/{revisit_id}/confirm")
def confirm_revisit(service_id: str, revisit_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    ensure_table(db)
    warranty = participant_warranty(service_id,current_user,db)
    if current_user.id != warranty['client_id']: raise HTTPException(403,"Solo el cliente puede confirmar la solución")
    result = db.execute(text("UPDATE warranty_revisits SET status='CERRADA',resolved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=:id AND service_id=:sid AND status='CORRECCION_REALIZADA' RETURNING id"), {"id":revisit_id,"sid":service_id}).first()
    if not result: raise HTTPException(409,"La revisita no está pendiente de confirmación")
    notify(db,warranty['worker_id'],"Revisita cerrada","El cliente confirmó que la corrección de garantía quedó solucionada.",revisit_id)
    db.commit()
    return {"message":"Garantía atendida y revisita cerrada.","status":"CERRADA"}


@router.post("/{service_id}/warranty/revisits/{revisit_id}/escalate")
def escalate_revisit(service_id: str, revisit_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    ensure_table(db)
    warranty = participant_warranty(service_id,current_user,db)
    row = db.execute(text("SELECT id,status FROM warranty_revisits WHERE id=:id AND service_id=:sid FOR UPDATE"), {"id":revisit_id,"sid":service_id}).mappings().first()
    if not row: raise HTTPException(404,"Revisita no encontrada")
    if row['status'] in ('CERRADA','ESCALADA_ADMIN'): raise HTTPException(409,"La revisita ya está cerrada o escalada")
    db.execute(text("UPDATE warranty_revisits SET status='ESCALADA_ADMIN',updated_at=CURRENT_TIMESTAMP WHERE id=:id"), {"id":revisit_id})
    admins = db.execute(text("SELECT id FROM users WHERE COALESCE(is_active,true)=true AND (role='ADMIN' OR admin_role IS NOT NULL OR active_role='ADMIN')")).scalars().all()
    for admin_id in admins:
        notify(db,admin_id,"Revisita escalada a Administración",f"Una revisita de garantía requiere intervención administrativa. Servicio: {service_id}.",revisit_id)
    other = warranty['worker_id'] if current_user.id == warranty['client_id'] else warranty['client_id']
    notify(db,other,"Revisita escalada","La solicitud de garantía fue escalada a Administración SERVIYA.",revisit_id)
    db.commit()
    return {"message":"Revisita escalada a Administración.","status":"ESCALADA_ADMIN"}
