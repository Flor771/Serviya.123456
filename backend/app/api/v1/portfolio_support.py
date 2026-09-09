from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import User

router = APIRouter(tags=["Portafolio y Soporte"])

class PortfolioCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    description: Optional[str] = None
    category_id: Optional[int] = None
    photo_url: str = Field(min_length=5, max_length=1000)

class TicketCreate(BaseModel):
    ticket_type: str = Field(min_length=2, max_length=80)
    subject: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=5)
    target_user_id: Optional[str] = None
    target_job_id: Optional[int] = None

@router.get("/portfolio/{worker_id}")
def get_portfolio(worker_id: str, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT p.id, p.worker_id, p.title, p.description, p.category_id, p.photo_url, p.created_at,
               c.name AS category_name
        FROM portfolio_items p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.worker_id = :worker_id
        ORDER BY p.created_at DESC
    """), {"worker_id": worker_id}).mappings().all()
    return {"portfolio": [dict(r) for r in rows]}

@router.post("/portfolio")
def create_portfolio(data: PortfolioCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.role.value != "TRABAJADOR":
        raise HTTPException(status_code=403, detail="Solo los técnicos pueden administrar su portafolio")
    if data.category_id is not None:
        exists = db.execute(text("SELECT 1 FROM categories WHERE id = :id AND COALESCE(is_active,true) = true"), {"id": data.category_id}).scalar()
        if not exists:
            raise HTTPException(status_code=400, detail="Categoría no válida")
    row = db.execute(text("""
        INSERT INTO portfolio_items (worker_id, title, description, category_id, photo_url, created_at)
        VALUES (:worker_id, :title, :description, :category_id, :photo_url, :created_at)
        RETURNING id, worker_id, title, description, category_id, photo_url, created_at
    """), {"worker_id": current_user.id, "title": data.title.strip(), "description": data.description, "category_id": data.category_id, "photo_url": data.photo_url.strip(), "created_at": datetime.utcnow()}).mappings().one()
    db.commit()
    return {"message": "Trabajo agregado al portafolio", "portfolio_item": dict(row)}

@router.put("/portfolio/{portfolio_id}")
def update_portfolio(portfolio_id: int, data: PortfolioCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.role.value != "TRABAJADOR":
        raise HTTPException(status_code=403, detail="Solo los técnicos pueden administrar su portafolio")
    row = db.execute(text("SELECT id FROM portfolio_items WHERE id = :id AND worker_id = :worker_id"), {"id": portfolio_id, "worker_id": current_user.id}).first()
    if not row:
        raise HTTPException(status_code=404, detail="Trabajo del portafolio no encontrado")
    db.execute(text("""
        UPDATE portfolio_items SET title=:title, description=:description, category_id=:category_id, photo_url=:photo_url
        WHERE id=:id AND worker_id=:worker_id
    """), {"id": portfolio_id, "worker_id": current_user.id, "title": data.title.strip(), "description": data.description, "category_id": data.category_id, "photo_url": data.photo_url.strip()})
    db.commit()
    return {"message": "Portafolio actualizado"}

@router.delete("/portfolio/{portfolio_id}")
def delete_portfolio(portfolio_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.role.value != "TRABAJADOR":
        raise HTTPException(status_code=403, detail="Solo los técnicos pueden administrar su portafolio")
    result = db.execute(text("DELETE FROM portfolio_items WHERE id=:id AND worker_id=:worker_id"), {"id": portfolio_id, "worker_id": current_user.id})
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Trabajo del portafolio no encontrado")
    db.commit()
    return {"message": "Trabajo eliminado del portafolio"}

@router.post("/support/tickets")
def create_ticket(data: TicketCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    row = db.execute(text("""
        INSERT INTO support_tickets (user_id, ticket_type, subject, description, target_user_id, target_job_id, status, created_at)
        VALUES (:user_id, :ticket_type, :subject, :description, :target_user_id, :target_job_id, 'ABIERTO', :created_at)
        RETURNING id, status, created_at
    """), {"user_id": current_user.id, "ticket_type": data.ticket_type.strip(), "subject": data.subject.strip(), "description": data.description.strip(), "target_user_id": data.target_user_id, "target_job_id": data.target_job_id, "created_at": datetime.utcnow()}).mappings().one()
    db.commit()
    return {"message": "Solicitud de soporte creada", "ticket": dict(row)}

@router.get("/support/tickets/me")
def my_tickets(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, ticket_type, subject, description, target_user_id, target_job_id, status, admin_response, created_at
        FROM support_tickets WHERE user_id=:user_id ORDER BY created_at DESC
    """), {"user_id": current_user.id}).mappings().all()
    return {"tickets": [dict(r) for r in rows]}
