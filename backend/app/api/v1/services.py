import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_active_user
from app.models.models import Service, Application, Escrow, User, UserRoleEnum

router = APIRouter(prefix="/services", tags=["Servicios y Trabajos"])

class CreateServiceSchema(BaseModel):
    title:str; description:str; category_name:str; subcategory:Optional[str]=None; price_rd:float; province:str; municipality:str; address_approx:Optional[str]=None; service_date:str; service_time:str; estimated_duration:Optional[str]=None; images:List[str]=Field(default_factory=list); photos:List[str]=Field(default_factory=list); requirements:List[str]=Field(default_factory=list)
class CancelServiceSchema(BaseModel):
    reason:str=Field(default="Cancelación solicitada",min_length=3,max_length=500)
class CompletionPhotosSchema(BaseModel):
    photos: List[str] = Field(default_factory=list, max_length=10)
    summary: Optional[str] = Field(default=None, max_length=1000)

def role(u): return u.role.value if hasattr(u.role,"value") else str(u.role)
def tx(db,u,a,t,s,r,d): db.execute(text("INSERT INTO transactions (user_id,amount,type,status,reference_code,created_at) VALUES (:u,:a,:t,:s,:r,CURRENT_TIMESTAMP)"),{"u":u,"a":a,"t":t,"s":s,"r":r})
def notify(db,u,title,msg,typ,related=None):
    db.execute(text("INSERT INTO notifications (user_id,title,message,type,is_read,created_at) VALUES (:u,:title,:msg,:typ,false,CURRENT_TIMESTAMP)"),{"u":u,"title":title,"msg":msg,"typ":typ})

def create_dispute(db, service_id, opened_by, against, reason, description):
    existing=db.execute(text("SELECT id FROM disputes WHERE service_id=:sid AND status IN ('ABIERTA','EN_REVISION') LIMIT 1"),{"sid":service_id}).scalar()
    if existing:return existing
    return db.execute(text("INSERT INTO disputes (service_id,opened_by_user_id,against_user_id,reason,description,status,created_at) VALUES (:sid,:opened,:against,:reason,:description,'ABIERTA',CURRENT_TIMESTAMP) RETURNING id"),{"sid":service_id,"opened":opened_by,"against":against,"reason":reason,"description":description}).scalar_one()

def validate_photo(photo: str):
    if not photo.startswith("data:image/"): raise HTTPException(400,"Cada foto debe ser una imagen válida")
    if len(photo) > 700_000: raise HTTPException(400,"Cada foto no puede superar aproximadamente 700 KB")

@router.get("")
def list_services(province:Optional[str]=Query(None),category_name:Optional[str]=Query(None),status:Optional[str]=Query(None),db:Session=Depends(get_db)):
    q=db.query(Service)
    if province:q=q.filter(Service.province==province)
    if category_name:q=q.filter(Service.category_name==category_name)
    if status:q=q.filter(Service.status==status)
    out=[]
    for s in q.order_by(Service.created_at.desc()).all():
        c=db.query(User).filter(User.id==s.client_id).first();out.append({"id":s.id,"title":s.title,"description":s.description,"category_name":s.category_name,"subcategory":s.subcategory,"price_rd":s.price_rd,"province":s.province,"municipality":s.municipality,"address_approx":s.address_approx,"service_date":s.service_date,"service_time":s.service_time,"estimated_duration":s.estimated_duration,"images":s.images or [],"requirements":s.requirements or [],"status":s.status.value if hasattr(s.status,"value") else str(s.status),"client_id":s.client_id,"client_name":f"{c.first_name} {c.last_name}" if c else "Cliente SERVIYA","created_at":str(s.created_at)})
    return {"services":out}

@router.post("")
def create_service(data:CreateServiceSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    if role(current_user)!=UserRoleEnum.CLIENTE.value:raise HTTPException(403,"Solo los clientes pueden publicar servicios")
    if data.price_rd<=0:raise HTTPException(400,"El precio debe ser mayor que RD$0")
    photos=list(dict.fromkeys(data.images+data.photos))
    if len(photos)>10: raise HTTPException(400,"Puedes subir hasta 10 fotos por solicitud")
    for photo in photos: validate_photo(photo)
    s=Service(title=data.title,description=data.description,category_name=data.category_name,subcategory=data.subcategory,price_rd=data.price_rd,province=data.province,municipality=data.municipality,address_approx=data.address_approx,service_date=data.service_date,service_time=data.service_time,estimated_duration=data.estimated_duration,images=photos,requirements=data.requirements,client_id=current_user.id,status="PUBLICADA")
    db.add(s);db.commit();db.refresh(s);return {"message":"Servicio publicado exitosamente en SERVIYA.do","service":{"id":s.id,"title":s.title,"price_rd":s.price_rd,"images":s.images or [],"requirements":s.requirements or [],"status":str(s.status.value if hasattr(s.status,"value") else s.status)}}

@router.get("/{id}/completion-photos")
def get_completion_photos(id:str,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    s=db.query(Service).filter(Service.id==id).first()
    if not s: raise HTTPException(404,"Servicio no encontrado")
    if role(current_user)!=UserRoleEnum.ADMIN.value and current_user.id not in {s.client_id,s.worker_id}: raise HTTPException(403,"No tienes acceso a las fotos de este trabajo")
    row=db.execute(text("SELECT completion_photos FROM services WHERE id=:id"),{"id":id}).mappings().first()
    photos=(row.get("completion_photos") if row else []) or []
    if isinstance(photos,str):
        try: photos=json.loads(photos)
        except Exception: photos=[]
    return {"photos":photos,"count":len(photos)}

@router.post("/{id}/completion-photos")
def upload_completion_photos(id:str,data:CompletionPhotosSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    s=db.query(Service).filter(Service.id==id).with_for_update().first()
    if not s: raise HTTPException(404,"Servicio no encontrado")
    if s.worker_id!=current_user.id: raise HTTPException(403,"Solo el técnico asignado puede subir evidencia de finalización")
    st=s.status.value if hasattr(s.status,"value") else str(s.status)
    if st not in {"TRABAJADOR_SELECCIONADO","EN_PROGRESO"}: raise HTTPException(400,"Las fotos de finalización solo se pueden subir cuando el trabajo está asignado o en progreso")
    photos=list(dict.fromkeys(data.photos))
    if not photos: raise HTTPException(400,"Sube al menos una foto del trabajo terminado")
    if len(photos)>10: raise HTTPException(400,"Puedes subir hasta 10 fotos de finalización")
    for photo in photos: validate_photo(photo)
    row=db.execute(text("SELECT completion_photos FROM services WHERE id=:id FOR UPDATE"),{"id":id}).mappings().first()
    existing=(row.get("completion_photos") if row else []) or []
    if isinstance(existing,str):
        try: existing=json.loads(existing)
        except Exception: existing=[]
    merged=list(dict.fromkeys(existing+photos))
    if len(merged)>10: raise HTTPException(400,"Este trabajo ya tiene el máximo de 10 fotos de finalización")
    db.execute(text("UPDATE services SET completion_photos=:photos WHERE id=:id"),{"photos":json.dumps(merged),"id":id})
    notify(db,s.client_id,"El técnico subió fotos del trabajo",f"El técnico {current_user.first_name} {current_user.last_name} agregó {len(photos)} foto(s) como evidencia. Revisa el servicio en SERVIYA.","COMPLETION_PHOTOS",s.id)
    db.commit()
    return {"message":"Fotos del trabajo guardadas. El cliente fue notificado para revisar la evidencia.","photos":merged,"count":len(merged),"summary":data.summary}

@router.post("/{id}/cancel")
def cancel_service(id:str,data:CancelServiceSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    s=db.query(Service).filter(Service.id==id).with_for_update().first()
    if not s:raise HTTPException(404,"Servicio no encontrado")
    if s.client_id!=current_user.id:raise HTTPException(403,"Solo el cliente creador puede cancelar este servicio")
    st=s.status.value if hasattr(s.status,"value") else str(s.status)
    if st in {"COMPLETADA","CANCELADA"}:raise HTTPException(400,f"El servicio no puede cancelarse en estado {st}")
    e=db.query(Escrow).filter(Escrow.service_id==s.id,Escrow.status.in_(["RETENIDO","EN_DISPUTA"])).with_for_update().first()
    if e:
        did=create_dispute(db,s.id,current_user.id,s.worker_id,"CLIENT_CANCELLED_FUNDED",data.reason)
        e.status="EN_DISPUTA";s.status="EN_DISPUTA";tx(db,current_user.id,0,"CANCELACION","EN_REVISION",f"CANCEL-REVIEW-{str(s.id)[:8].upper()}",data.reason)
        if s.worker_id:notify(db,s.worker_id,"Cancelación en revisión",f"El cliente solicitó cancelar el servicio. Caso #{did}. El pago permanece protegido.","SERVICE_CANCEL_REVIEW",s.id)
        db.commit();return {"message":"Cancelación recibida y enviada a revisión administrativa.","service_id":s.id,"status":"EN_DISPUTA","dispute_id":did,"refund_pending":True}
    s.status="CANCELADA";tx(db,current_user.id,0,"CANCELACION","EXITOSO",f"CANCEL-{str(s.id)[:8].upper()}",data.reason)
    if s.worker_id:notify(db,s.worker_id,"Servicio cancelado",f"El cliente canceló el servicio. Motivo: {data.reason}","SERVICE_CANCELLED",s.id)
    db.commit();return {"message":"Servicio cancelado correctamente.","service_id":s.id,"status":"CANCELADA","refund_pending":False}

@router.post("/{id}/cancel-by-worker")
def cancel_by_worker(id:str,data:CancelServiceSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    s=db.query(Service).filter(Service.id==id).with_for_update().first()
    if not s:raise HTTPException(404,"Servicio no encontrado")
    if s.worker_id!=current_user.id:raise HTTPException(403,"Solo el técnico asignado puede cancelar este servicio")
    st=s.status.value if hasattr(s.status,"value") else str(s.status)
    if st in {"COMPLETADA","CANCELADA"}:raise HTTPException(400,"El servicio ya no puede cancelarse")
    e=db.query(Escrow).filter(Escrow.service_id==s.id,Escrow.status.in_(["RETENIDO","EN_DISPUTA"])).with_for_update().first()
    if e:
        did=create_dispute(db,s.id,current_user.id,s.client_id,"WORKER_CANCELLED_FUNDED",data.reason)
        e.status="EN_DISPUTA";s.status="EN_DISPUTA";tx(db,current_user.id,0,"CANCELACION_TECNICO","EN_REVISION",f"WORKER-CANCEL-{str(s.id)[:8].upper()}",data.reason);notify(db,s.client_id,"El técnico canceló el servicio",f"El técnico solicitó cancelar el servicio. Caso #{did}. El pago permanece protegido.","WORKER_CANCELLED",s.id);db.commit();return {"message":"Cancelación del técnico enviada a revisión. El pago permanece protegido.","status":"EN_DISPUTA","dispute_id":did,"refund_pending":True}
    s.status="CANCELADA";tx(db,current_user.id,0,"CANCELACION_TECNICO","EXITOSO",f"WORKER-CANCEL-{str(s.id)[:8].upper()}",data.reason);notify(db,s.client_id,"Servicio cancelado por el técnico",f"El técnico canceló el servicio. Motivo: {data.reason}","WORKER_CANCELLED",s.id);db.commit();return {"message":"Servicio cancelado por el técnico.","status":"CANCELADA","refund_pending":False}

@router.post("/{id}/report-no-show")
def report_no_show(id:str,data:CancelServiceSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    s=db.query(Service).filter(Service.id==id).with_for_update().first()
    if not s:raise HTTPException(404,"Servicio no encontrado")
    if s.client_id!=current_user.id:raise HTTPException(403,"Solo el cliente puede reportar la ausencia del técnico")
    if not s.worker_id:raise HTTPException(400,"El servicio no tiene técnico asignado")
    e=db.query(Escrow).filter(Escrow.service_id==s.id,Escrow.status=="RETENIDO").with_for_update().first()
    if not e:raise HTTPException(400,"No existe un pago activo en Custodia para este servicio")
    did=create_dispute(db,s.id,current_user.id,s.worker_id,"NO_SHOW",data.reason)
    e.status="EN_DISPUTA";s.status="EN_DISPUTA";notify(db,s.worker_id,"Reporte de no-show",f"El cliente reportó que no te presentaste al servicio. Caso #{did} enviado a revisión.","NO_SHOW",did);tx(db,current_user.id,0,"NO_SHOW","EN_REVISION",f"NO-SHOW-{did}",data.reason);db.commit();return {"message":"No-show reportado. Custodia congelada y caso enviado al administrador.","dispute_id":did,"status":"EN_DISPUTA"}

@router.get("/{id}")
def get_service(id:str,db:Session=Depends(get_db)):
    s=db.query(Service).filter(Service.id==id).first()
    if not s:raise HTTPException(404,"Servicio no encontrado")
    c=db.query(User).filter(User.id==s.client_id).first();w=db.query(User).filter(User.id==s.worker_id).first() if s.worker_id else None;st=s.status.value if hasattr(s.status,"value") else str(s.status)
    return {"service":{"id":s.id,"title":s.title,"description":s.description,"category_name":s.category_name,"subcategory":s.subcategory,"price_rd":s.price_rd,"province":s.province,"municipality":s.municipality,"address_approx":s.address_approx,"service_date":s.service_date,"service_time":s.service_time,"estimated_duration":s.estimated_duration,"images":s.images or [],"requirements":s.requirements or [],"status":st,"client_id":s.client_id,"client_name":f"{c.first_name} {c.last_name}" if c else "Cliente SERVIYA","worker_id":s.worker_id,"worker_name":f"{w.first_name} {w.last_name}" if w else None,"created_at":str(s.created_at)}}

@router.get("/{id}/applications")
def get_service_applications(id:str,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    s=db.query(Service).filter(Service.id==id).first()
    if not s:raise HTTPException(404,"Servicio no encontrado")
    if role(current_user)!=UserRoleEnum.ADMIN.value and s.client_id!=current_user.id:raise HTTPException(403,"Solo el cliente del servicio puede ver las postulaciones")
    out=[]
    for a in db.query(Application).filter(Application.service_id==id).all():
        w=db.query(User).filter(User.id==a.worker_id).first();out.append({"id":a.id,"service_id":a.service_id,"worker_id":a.worker_id,"worker_name":f"{w.first_name} {w.last_name}" if w else "Técnico SERVIYA","worker_rating":w.rating if w else 5.0,"worker_verified":w.is_verified if w else False,"message":a.message,"offered_price_rd":a.offered_price_rd,"availability_note":a.availability_note,"status":a.status.value if hasattr(a.status,"value") else str(a.status),"created_at":str(a.created_at)})
    return {"applications":out}
