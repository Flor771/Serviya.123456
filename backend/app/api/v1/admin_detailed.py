from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.core.security import get_password_hash
from app.models.models import User, UserRoleEnum

router = APIRouter(prefix="/admin-panel", tags=["Panel Administrativo Completo"])

class UserStateBody(BaseModel):
    is_active: bool
    reason: Optional[str] = None
class TicketBody(BaseModel):
    status: Optional[str] = None
    admin_response: Optional[str] = None
class ServiceModerationBody(BaseModel):
    status: str
    reason: Optional[str] = None
class PortfolioModerationBody(BaseModel):
    action: str
    reason: Optional[str] = None
class AdminCreateBody(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str = ""
    admin_role: str
    initial_password: str
class AdminRoleBody(BaseModel):
    admin_role: str

ADMIN_ROLES = {
    "SUPER_ADMIN": "Administrador principal",
    "ADMIN_OPERACIONES": "Administrador de operaciones",
    "ADMIN_FINANCIERO": "Administrador financiero",
    "ADMIN_VERIFICACIONES": "Administrador de verificaciones",
    "ADMIN_SOPORTE": "Administrador de soporte",
    "ADMIN_MODERACION": "Administrador de moderación",
}

def audit(db: Session, admin_id: str, action: str, resource: str, target_id=None, details: str = ""):
    db.execute(text("INSERT INTO admin_audit_logs (admin_id, action, resource, target_id, details, timestamp) VALUES (:admin_id, :action, :resource, :target_id, :details, :timestamp)"), {"admin_id": admin_id, "action": action, "resource": resource, "target_id": target_id, "details": details, "timestamp": datetime.utcnow()})

@router.get("/overview")
def overview(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    q = lambda sql: db.execute(text(sql)).scalar() or 0
    return {"users": {"total": int(q("SELECT COUNT(*) FROM users")), "clients": int(q("SELECT COUNT(*) FROM users WHERE role = 'CLIENTE'")), "workers": int(q("SELECT COUNT(*) FROM users WHERE role = 'TRABAJADOR'")), "admins": int(q("SELECT COUNT(*) FROM users WHERE role = 'ADMIN'")), "inactive": int(q("SELECT COUNT(*) FROM users WHERE COALESCE(is_active,false) = false")), "verified": int(q("SELECT COUNT(*) FROM users WHERE COALESCE(is_verified,false) = true"))}, "services": {"total": int(q("SELECT COUNT(*) FROM services")), "published": int(q("SELECT COUNT(*) FROM services WHERE status IN ('PUBLICADA','RECIBIENDO_POSTULACIONES')")), "in_progress": int(q("SELECT COUNT(*) FROM services WHERE status = 'EN_PROGRESO'")), "completed": int(q("SELECT COUNT(*) FROM services WHERE status = 'COMPLETADA'")), "disputed": int(q("SELECT COUNT(*) FROM services WHERE status = 'EN_DISPUTA'"))}, "finance": {"custody_rd": float(q("SELECT COALESCE(SUM(total_amount_rd),0) FROM escrows WHERE status IN ('RETENIDO','EN_DISPUTA')")), "released_rd": float(q("SELECT COALESCE(SUM(total_amount_rd),0) FROM escrows WHERE status = 'LIBERADO'")), "commission_rd": float(q("SELECT COALESCE(SUM(commission_amount_rd),0) FROM escrows WHERE status = 'LIBERADO'")), "pending_withdrawals": int(q("SELECT COUNT(*) FROM withdrawals WHERE status = 'PENDIENTE'")), "withdrawals_rd": float(q("SELECT COALESCE(SUM(amount),0) FROM withdrawals WHERE status = 'PENDIENTE'"))}, "moderation": {"pending_verifications": int(q("SELECT COUNT(*) FROM verifications WHERE status = 'PENDIENTE'")), "open_disputes": int(q("SELECT COUNT(*) FROM disputes WHERE status IN ('ABIERTA','EN_REVISION') AND service_id IS NOT NULL")), "open_tickets": int(q("SELECT COUNT(*) FROM support_tickets WHERE status NOT IN ('CERRADO','RESUELTO')")), "portfolio_items": int(q("SELECT COUNT(*) FROM portfolio_items")), "reviews": int(q("SELECT COUNT(*) FROM reviews"))}}

@router.get("/users")
def users(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT id, first_name, last_name, full_name, email, phone, cedula, role, active_role, province, municipality, is_active, is_verified, rating, jobs_completed, created_at, updated_at FROM users ORDER BY created_at DESC")).mappings().all()
    return {"users": [dict(r) for r in rows]}

@router.patch("/users/{user_id}/state")
def user_state(user_id: str, data: UserStateBody, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.execute(text("SELECT id, role, is_active FROM users WHERE id = :id"), {"id": user_id}).mappings().first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user["role"] == "ADMIN" and not data.is_active: raise HTTPException(status_code=400, detail="No se puede suspender un administrador desde este panel")
    db.execute(text("UPDATE users SET is_active = :active, updated_at = :now WHERE id = :id"), {"active": data.is_active, "now": datetime.utcnow(), "id": user_id})
    audit(db, admin_user.id, "USER_ACTIVATED" if data.is_active else "USER_SUSPENDED", "users", None, f"Usuario {user_id}; motivo: {data.reason or 'sin motivo indicado'}")
    db.commit()
    return {"message": "Usuario activado" if data.is_active else "Usuario suspendido", "is_active": data.is_active}

@router.get("/administrators")
def administrators(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT id, first_name, last_name, email, phone, admin_role, is_active, is_verified, created_at FROM users WHERE role = 'ADMIN' ORDER BY created_at DESC")).mappings().all()
    return {"administrators": [dict(r) for r in rows], "roles": [{"code": k, "name": v} for k, v in ADMIN_ROLES.items()]}

@router.post("/administrators")
def create_administrator(data: AdminCreateBody, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if data.admin_role not in ADMIN_ROLES: raise HTTPException(400, "Rol administrativo no válido")
    if len(data.initial_password) < 8: raise HTTPException(400, "La contraseña inicial debe tener al menos 8 caracteres")
    if db.query(User).filter(User.email == data.email).first(): raise HTTPException(409, "Ya existe un usuario con ese correo")
    user = User(first_name=data.first_name,last_name=data.last_name,email=str(data.email).lower(),phone=data.phone,password_hash=get_password_hash(data.initial_password),role=UserRoleEnum.ADMIN,active_role="ADMIN",admin_role=data.admin_role,province="Distrito Nacional",municipality="Santo Domingo de Guzmán (DN)",is_active=True,is_verified=True)
    db.add(user); db.commit(); db.refresh(user)
    audit(db, admin_user.id, "ADMIN_CREATED", "users", None, f"Administrador creado con rol {data.admin_role}")
    db.commit()
    return {"message": "Administrador creado correctamente", "id": user.id, "admin_role": user.admin_role}

@router.patch("/administrators/{user_id}/role")
def update_administrator_role(user_id: str, data: AdminRoleBody, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if data.admin_role not in ADMIN_ROLES: raise HTTPException(400, "Rol administrativo no válido")
    user = db.query(User).filter(User.id == user_id, User.role == UserRoleEnum.ADMIN).first()
    if not user: raise HTTPException(404, "Administrador no encontrado")
    user.admin_role = data.admin_role; db.commit()
    audit(db, admin_user.id, "ADMIN_ROLE_CHANGED", "users", None, f"Administrador {user_id} -> {data.admin_role}"); db.commit()
    return {"message": "Rol administrativo actualizado", "admin_role": user.admin_role}

@router.patch("/administrators/{user_id}/status")
def update_administrator_status(user_id: str, data: UserStateBody, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.role == UserRoleEnum.ADMIN).first()
    if not user: raise HTTPException(404, "Administrador no encontrado")
    if user.id == admin_user.id and not data.is_active: raise HTTPException(400, "No puedes desactivar tu propio acceso administrativo")
    user.is_active = data.is_active; db.commit()
    audit(db, admin_user.id, "ADMIN_ACTIVATED" if data.is_active else "ADMIN_DEACTIVATED", "users", None, f"Administrador {user_id}"); db.commit()
    return {"message": "Acceso administrativo actualizado", "is_active": data.is_active}

@router.get("/services")
def services(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT s.id, s.title, s.description, s.category_name, s.subcategory, s.price_rd, s.province, s.municipality, s.address_approx, s.service_date, s.service_time, s.estimated_duration, s.images, s.requirements, s.payment_type, s.status, s.client_id, s.worker_id, s.created_at, COALESCE(u.full_name, CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS client_name FROM services s LEFT JOIN users u ON u.id = s.client_id ORDER BY s.created_at DESC")).mappings().all()
    return {"services": [dict(r) for r in rows]}

@router.patch("/services/{service_id}/moderation")
def moderate_service(service_id: str, data: ServiceModerationBody, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT id, status FROM services WHERE id = :id"), {"id": service_id}).mappings().first()
    if not row: raise HTTPException(status_code=404, detail="Servicio no encontrado")
    allowed = {"PUBLICADA", "RECIBIENDO_POSTULACIONES", "TRABAJADOR_SELECCIONADO", "EN_PROGRESO", "COMPLETADA", "CANCELADA", "EN_DISPUTA"}
    if data.status not in allowed: raise HTTPException(status_code=400, detail="Estado de servicio no válido")
    db.execute(text("UPDATE services SET status = :status WHERE id = :id"), {"status": data.status, "id": service_id})
    audit(db, admin_user.id, "SERVICE_MODERATED", "services", None, f"Servicio {service_id}: {row['status']} -> {data.status}; {data.reason or ''}")
    db.commit()
    return {"message": "Servicio actualizado", "status": data.status}

@router.get("/applications")
def applications(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT a.id, a.service_id, a.worker_id, a.message, a.offered_price_rd, a.availability_note, a.status, a.created_at, s.title AS service_title, COALESCE(u.full_name, CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS worker_name FROM applications a LEFT JOIN services s ON s.id = a.service_id LEFT JOIN users u ON u.id = a.worker_id ORDER BY a.created_at DESC")).mappings().all()
    return {"applications": [dict(r) for r in rows]}

@router.get("/transactions")
def transactions(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT t.id, t.user_id, t.amount, t.type, t.status, t.reference_code, t.created_at, COALESCE(u.full_name, CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS user_name FROM transactions t LEFT JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 500")).mappings().all()
    return {"transactions": [dict(r) for r in rows]}

@router.get("/support")
def support(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT st.id, st.user_id, st.ticket_type, st.subject, st.description, st.target_user_id, st.target_job_id, st.status, st.admin_response, st.created_at, COALESCE(u.full_name, CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS user_name FROM support_tickets st LEFT JOIN users u ON u.id = st.user_id ORDER BY st.created_at DESC")).mappings().all()
    return {"tickets": [dict(r) for r in rows]}

@router.patch("/support/{ticket_id}")
def update_support(ticket_id: int, data: TicketBody, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT id, user_id, subject FROM support_tickets WHERE id = :id"), {"id": ticket_id}).mappings().first()
    if not row: raise HTTPException(status_code=404, detail="Ticket no encontrado")
    if data.status is not None and data.status not in {"ABIERTO", "EN_REVISION", "RESUELTO", "CERRADO"}: raise HTTPException(status_code=400, detail="Estado de ticket no válido")
    db.execute(text("UPDATE support_tickets SET status = COALESCE(:status, status), admin_response = COALESCE(:response, admin_response) WHERE id = :id"), {"id": ticket_id, "status": data.status, "response": data.admin_response})
    audit(db, admin_user.id, "SUPPORT_TICKET_UPDATED", "support_tickets", ticket_id, f"Estado={data.status or 'sin cambio'}")
    db.commit()
    return {"message": "Ticket actualizado"}

@router.get("/portfolio")
def portfolio(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT p.id, p.worker_id, p.title, p.description, p.category_id, p.photo_url, p.created_at, COALESCE(u.full_name, CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS worker_name FROM portfolio_items p LEFT JOIN users u ON u.id = p.worker_id ORDER BY p.created_at DESC")).mappings().all()
    return {"portfolio": [dict(r) for r in rows]}

@router.patch("/portfolio/{portfolio_id}/moderation")
def moderate_portfolio(portfolio_id: int, data: PortfolioModerationBody, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if data.action not in {"APPROVE", "REMOVE"}: raise HTTPException(status_code=400, detail="Acción de moderación no válida")
    row = db.execute(text("SELECT p.id, p.worker_id, p.title FROM portfolio_items p WHERE p.id = :id"), {"id": portfolio_id}).mappings().first()
    if not row: raise HTTPException(status_code=404, detail="Trabajo del portafolio no encontrado")
    if data.action == "REMOVE": db.execute(text("DELETE FROM portfolio_items WHERE id = :id"), {"id": portfolio_id})
    audit(db, admin_user.id, "PORTFOLIO_APPROVED" if data.action == "APPROVE" else "PORTFOLIO_REMOVED", "portfolio_items", portfolio_id, f"{row['title']}; motivo: {data.reason or 'sin motivo'}")
    db.commit()
    return {"message": "Trabajo aprobado" if data.action == "APPROVE" else "Trabajo retirado", "action": data.action}

@router.get("/reviews")
def reviews(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT r.id, r.service_id, r.reviewer_id, r.target_user_id, r.rating, r.comment, r.created_at, COALESCE(u1.full_name, CONCAT(COALESCE(u1.first_name,''),' ',COALESCE(u1.last_name,''))) AS reviewer_name, COALESCE(u2.full_name, CONCAT(COALESCE(u2.first_name,''),' ',COALESCE(u2.last_name,''))) AS target_name FROM reviews r LEFT JOIN users u1 ON u1.id = r.reviewer_id LEFT JOIN users u2 ON u2.id = r.target_user_id ORDER BY r.created_at DESC")).mappings().all()
    return {"reviews": [dict(r) for r in rows]}

@router.get("/audit")
def audit_logs(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT id, admin_id, action, resource, target_id, details, timestamp FROM admin_audit_logs ORDER BY timestamp DESC LIMIT 500")).mappings().all()
    return {"admin_audit": [dict(r) for r in rows]}
