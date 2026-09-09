from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import Service, Application, Escrow, ServiceStatusEnum, User, UserRoleEnum

router = APIRouter(prefix="/services", tags=["Servicios y Trabajos"])

class CreateServiceSchema(BaseModel):
    title: str
    description: str
    category_name: str
    subcategory: Optional[str] = None
    price_rd: float
    province: str
    municipality: str
    address_approx: Optional[str] = None
    service_date: str
    service_time: str
    estimated_duration: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    photos: List[str] = Field(default_factory=list)
    requirements: List[str] = Field(default_factory=list)

class CancelServiceSchema(BaseModel):
    reason: str = Field(default="Cancelación solicitada por el cliente", min_length=3, max_length=500)

@router.get("")
def list_services(province: Optional[str] = Query(None), category_name: Optional[str] = Query(None), status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Service)
    if province: query = query.filter(Service.province == province)
    if category_name: query = query.filter(Service.category_name == category_name)
    if status: query = query.filter(Service.status == status)
    services = query.order_by(Service.created_at.desc()).all()
    results = []
    for s in services:
        status_str = s.status.value if hasattr(s.status, "value") else str(s.status)
        client = db.query(User).filter(User.id == s.client_id).first()
        results.append({"id":s.id,"title":s.title,"description":s.description,"category_name":s.category_name,"subcategory":s.subcategory,"price_rd":s.price_rd,"province":s.province,"municipality":s.municipality,"address_approx":s.address_approx,"service_date":s.service_date,"service_time":s.service_time,"estimated_duration":s.estimated_duration,"images":s.images or [],"requirements":s.requirements or [],"status":status_str,"client_id":s.client_id,"client_name":f"{client.first_name} {client.last_name}" if client else "Cliente SERVIYA","created_at":str(s.created_at)})
    return {"services":results}

@router.post("")
def create_service(data: CreateServiceSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str != UserRoleEnum.CLIENTE.value: raise HTTPException(status_code=403, detail="Solo los clientes pueden publicar servicios")
    if data.price_rd <= 0: raise HTTPException(status_code=400, detail="El precio del servicio debe ser mayor que RD$0")
    service = Service(title=data.title,description=data.description,category_name=data.category_name,subcategory=data.subcategory,price_rd=data.price_rd,province=data.province,municipality=data.municipality,address_approx=data.address_approx,service_date=data.service_date,service_time=data.service_time,estimated_duration=data.estimated_duration,images=list(dict.fromkeys(data.images+data.photos)),requirements=data.requirements,client_id=current_user.id,status=ServiceStatusEnum.PUBLICADA)
    db.add(service); db.commit(); db.refresh(service)
    return {"message":"Servicio publicado exitosamente en SERVIYA.do","service":{"id":service.id,"title":service.title,"price_rd":service.price_rd,"images":service.images or [],"requirements":service.requirements or [],"status":service.status.value if hasattr(service.status,"value") else str(service.status)}}

@router.post("/{id}/cancel")
def cancel_service(id: str, data: CancelServiceSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == id).with_for_update().first()
    if not service: raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if service.client_id != current_user.id: raise HTTPException(status_code=403, detail="Solo el cliente creador puede cancelar este servicio")
    current_status = service.status.value if hasattr(service.status,"value") else str(service.status)
    if current_status in {"COMPLETADA","CANCELADA"}: raise HTTPException(status_code=400, detail=f"El servicio no puede cancelarse en estado {current_status}")

    escrow = db.query(Escrow).filter(Escrow.service_id==service.id, Escrow.status.in_(["RETENIDO","EN_DISPUTA"])).with_for_update().first()
    # Una vez que existe dinero en Custodia, la cancelación del cliente no libera fondos a ciegas.
    # Se abre/continúa una disputa para que se determine si corresponde reembolso total, parcial o compensación.
    if escrow:
        if escrow.status == "RETENIDO":
            escrow.status = "EN_DISPUTA"
        service.status = ServiceStatusEnum.EN_DISPUTA
        ref = f"CANCEL-REVIEW-{str(service.id)[:8].upper()}"
        db.execute(text("INSERT INTO transactions (user_id, amount, type, status, reference_code, created_at) VALUES (:user_id,0,'CANCELACION','EN_REVISION',:reference,CURRENT_TIMESTAMP)"), {"user_id":current_user.id,"reference":ref})
        if service.worker_id:
            db.execute(text("INSERT INTO notifications (user_id,title,message,type,created_at) VALUES (:user_id,'Cancelación en revisión',:message,'SERVICE_CANCEL_REVIEW',CURRENT_TIMESTAMP)"), {"user_id":service.worker_id,"message":f"El cliente solicitó cancelar el servicio. El pago permanece protegido mientras se revisa el caso. Motivo: {data.reason}"})
        db.commit()
        return {"message":"La cancelación fue recibida y el caso quedó en revisión. Los fondos permanecen protegidos en Custodia SERVIYA hasta determinar el reembolso correspondiente.","service_id":service.id,"status":"EN_DISPUTA","refund_amount_rd":0.0,"refund_pending":True,"reason":data.reason}

    # Sin pago en custodia, el cliente puede cancelar directamente sin generar un reembolso financiero.
    service.status = ServiceStatusEnum.CANCELADA
    ref = f"CANCEL-{str(service.id)[:8].upper()}"
    db.execute(text("INSERT INTO transactions (user_id, amount, type, status, reference_code, created_at) VALUES (:user_id,0,'CANCELACION','EXITOSO',:reference,CURRENT_TIMESTAMP)"), {"user_id":current_user.id,"reference":ref})
    if service.worker_id:
        db.execute(text("INSERT INTO notifications (user_id,title,message,type,created_at) VALUES (:user_id,'Servicio cancelado',:message,'SERVICE_CANCELLED',CURRENT_TIMESTAMP)"), {"user_id":service.worker_id,"message":f"El cliente canceló el servicio. Motivo: {data.reason}"})
    db.commit()
    return {"message":"Servicio cancelado correctamente.","service_id":service.id,"status":"CANCELADA","refund_amount_rd":0.0,"refund_pending":False,"reason":data.reason}

@router.get("/{id}")
def get_service(id: str, db: Session = Depends(get_db)):
    service=db.query(Service).filter(Service.id==id).first()
    if not service: raise HTTPException(status_code=404,detail="Servicio no encontrado")
    client=db.query(User).filter(User.id==service.client_id).first(); worker=db.query(User).filter(User.id==service.worker_id).first() if service.worker_id else None
    status_str=service.status.value if hasattr(service.status,"value") else str(service.status)
    return {"service":{"id":service.id,"title":service.title,"description":service.description,"category_name":service.category_name,"subcategory":service.subcategory,"price_rd":service.price_rd,"province":service.province,"municipality":service.municipality,"address_approx":service.address_approx,"service_date":service.service_date,"service_time":service.service_time,"estimated_duration":service.estimated_duration,"images":service.images or [],"requirements":service.requirements or [],"status":status_str,"client_id":service.client_id,"client_name":f"{client.first_name} {client.last_name}" if client else "Cliente SERVIYA","worker_id":service.worker_id,"worker_name":f"{worker.first_name} {worker.last_name}" if worker else None,"created_at":str(service.created_at)}}

@router.get("/{id}/applications")
def get_service_applications(id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service=db.query(Service).filter(Service.id==id).first()
    if not service: raise HTTPException(status_code=404,detail="Servicio no encontrado")
    role_str=current_user.role.value if hasattr(current_user.role,"value") else str(current_user.role)
    if role_str != UserRoleEnum.ADMIN.value and service.client_id != current_user.id: raise HTTPException(status_code=403,detail="Solo el cliente del servicio puede ver las postulaciones")
    apps=db.query(Application).filter(Application.service_id==id).all(); results=[]
    for a in apps:
        worker=db.query(User).filter(User.id==a.worker_id).first(); status_str=a.status.value if hasattr(a.status,"value") else str(a.status)
        results.append({"id":a.id,"service_id":a.service_id,"worker_id":a.worker_id,"worker_name":f"{worker.first_name} {worker.last_name}" if worker else "Técnico SERVIYA","worker_rating":worker.rating if worker else 5.0,"worker_verified":worker.is_verified if worker else False,"message":a.message,"offered_price_rd":a.offered_price_rd,"availability_note":a.availability_note,"status":status_str,"created_at":str(a.created_at)})
    return {"applications":results}
