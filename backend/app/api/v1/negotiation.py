import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_active_user
from app.models.models import User

router = APIRouter(prefix="/negotiation", tags=["Negociación de precio"])
class PriceOfferSchema(BaseModel):
    price_rd: float = Field(gt=0)
    note: Optional[str] = Field(default=None, max_length=1000)
def role(user): return user.role.value if hasattr(user.role,"value") else str(user.role)
def notify(db,user_id,title,message,typ):
    db.execute(text("INSERT INTO notifications (user_id,title,message,type,is_read,created_at) VALUES (:u,:t,:m,:ty,false,CURRENT_TIMESTAMP)"),{"u":user_id,"t":title,"m":message,"ty":typ})
def get_service(db,service_id):
    return db.execute(text("SELECT id,client_id,worker_id,price_rd,negotiated_price_rd,negotiation_status,negotiation_offer_rd,negotiation_offer_by,negotiation_offer_note,price_agreed_at,status,title FROM services WHERE id=:id FOR UPDATE"),{"id":service_id}).mappings().first()
@router.get("/{service_id}")
def get_negotiation(service_id:str,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    s=db.execute(text("SELECT id,client_id,worker_id,price_rd,negotiated_price_rd,negotiation_status,negotiation_offer_rd,negotiation_offer_by,negotiation_offer_note,price_agreed_at,status,title FROM services WHERE id=:id"),{"id":service_id}).mappings().first()
    if not s: raise HTTPException(404,"Servicio no encontrado")
    if current_user.id not in {s["client_id"],s["worker_id"]}: raise HTTPException(403,"Solo el cliente y el técnico asignado pueden negociar este servicio")
    st=s["status"].value if hasattr(s["status"],"value") else str(s["status"])
    return {"service_id":service_id,"title":s["title"],"budget_rd":float(s["price_rd"]),"negotiated_price_rd":float(s["negotiated_price_rd"]) if s["negotiated_price_rd"] is not None else None,"offer_rd":float(s["negotiation_offer_rd"]) if s["negotiation_offer_rd"] is not None else None,"offer_by":s["negotiation_offer_by"],"offer_note":s["negotiation_offer_note"],"status":s["negotiation_status"] or "PENDIENTE","price_agreed_at":str(s["price_agreed_at"]) if s["price_agreed_at"] else None,"service_status":st}
@router.post("/{service_id}/offer")
def offer_price(service_id:str,data:PriceOfferSchema,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    s=get_service(db,service_id)
    if not s: raise HTTPException(404,"Servicio no encontrado")
    if current_user.id not in {s["client_id"],s["worker_id"]}: raise HTTPException(403,"No perteneces a esta negociación")
    if not s["worker_id"]: raise HTTPException(400,"Primero debe seleccionarse un trabajador")
    st=s["status"].value if hasattr(s["status"],"value") else str(s["status"])
    if st not in ("TRABAJADOR_SELECCIONADO","EN_PROGRESO"): raise HTTPException(400,"La negociación de precio está disponible después de seleccionar al trabajador")
    active=db.execute(text("SELECT id FROM escrows WHERE service_id=:sid AND status IN ('RETENIDO','EN_DISPUTA') LIMIT 1"),{"sid":service_id}).scalar()
    if active: raise HTTPException(400,"El precio ya quedó financiado en Custodia SERVIYA y no puede modificarse")
    db.execute(text("UPDATE services SET negotiation_offer_rd=:p,negotiation_offer_by=:u,negotiation_offer_note=:n,negotiation_status='PENDIENTE_ACEPTACION',negotiated_price_rd=NULL,price_agreed_at=NULL WHERE id=:id"),{"p":data.price_rd,"u":current_user.id,"n":data.note,"id":service_id})
    receiver=s["worker_id"] if current_user.id==s["client_id"] else s["client_id"]; label="Cliente" if current_user.id==s["client_id"] else "Trabajador / Técnico"
    notify(db,receiver,"Nueva propuesta de precio",f"{label} propuso RD$ {data.price_rd:,.2f}. Revisa la negociación en SERVIYA.","PRICE_OFFER")
    db.execute(text("INSERT INTO messages (service_id,sender_id,receiver_id,content,created_at) VALUES (:sid,:sender,:receiver,:content,CURRENT_TIMESTAMP)"),{"sid":service_id,"sender":current_user.id,"receiver":receiver,"content":f"PROPUESTA DE PRECIO: RD$ {data.price_rd:,.2f}" + (f" — {data.note}" if data.note else "")})
    db.commit(); return {"message":"Propuesta enviada. Espera la aceptación de la otra parte.","offer_rd":data.price_rd,"status":"PENDIENTE_ACEPTACION"}
@router.post("/{service_id}/accept")
def accept_price(service_id:str,current_user:User=Depends(get_current_active_user),db:Session=Depends(get_db)):
    s=get_service(db,service_id)
    if not s: raise HTTPException(404,"Servicio no encontrado")
    if current_user.id not in {s["client_id"],s["worker_id"]}: raise HTTPException(403,"No perteneces a esta negociación")
    if not s["negotiation_offer_rd"] or not s["negotiation_offer_by"]: raise HTTPException(400,"Todavía no existe una propuesta de precio para aceptar")
    if s["negotiation_offer_by"]==current_user.id: raise HTTPException(400,"La misma persona que propuso el precio no puede aceptarlo")
    active=db.execute(text("SELECT id FROM escrows WHERE service_id=:sid AND status IN ('RETENIDO','EN_DISPUTA') LIMIT 1"),{"sid":service_id}).scalar()
    if active: raise HTTPException(400,"El servicio ya tiene fondos en Custodia SERVIYA")
    agreed=float(s["negotiation_offer_rd"])
    db.execute(text("UPDATE services SET negotiated_price_rd=:p,negotiation_status='ACORDADO',price_agreed_at=CURRENT_TIMESTAMP WHERE id=:id"),{"p":agreed,"id":service_id})
    receiver=s["client_id"] if current_user.id==s["worker_id"] else s["worker_id"]
    notify(db,receiver,"Precio acordado",f"Precio acordado para {s['title']}: RD$ {agreed:,.2f}. El cliente ya puede proceder al pago en Custodia SERVIYA.","PRICE_AGREED")
    db.commit(); return {"message":f"Precio acordado: RD$ {agreed:,.2f}","agreed_price_rd":agreed,"status":"ACORDADO"}
