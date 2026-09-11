import json
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user, require_admin
from app.models.models import User

router = APIRouter(prefix="/announcements", tags=["Anuncios SERVIYA"])

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS serviya_announcements (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    audience VARCHAR(20) NOT NULL DEFAULT 'TODOS',
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    action_label TEXT NULL,
    action_tab TEXT NULL,
    starts_at TIMESTAMP NULL,
    ends_at TIMESTAMP NULL,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

class AnnouncementIn(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    body: str = Field(min_length=1, max_length=5000)
    image_urls: list[str] = Field(default_factory=list, max_length=8)
    audience: str = Field(default="TODOS")
    priority: str = Field(default="NORMAL")
    action_label: Optional[str] = Field(default=None, max_length=80)
    action_tab: Optional[str] = Field(default=None, max_length=80)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    published: bool = True


def _ensure_table(db: Session) -> None:
    db.execute(text(CREATE_SQL))
    db.commit()


def _row(row: Any) -> dict:
    return {
        "id": int(row.id),
        "title": row.title,
        "body": row.body,
        "image_urls": row.image_urls or [],
        "audience": row.audience,
        "priority": row.priority,
        "action_label": row.action_label,
        "action_tab": row.action_tab,
        "starts_at": row.starts_at.isoformat() if row.starts_at else None,
        "ends_at": row.ends_at.isoformat() if row.ends_at else None,
        "published": bool(row.published),
        "created_by": row.created_by,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("")
def list_announcements(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ensure_table(db)
    role = str(getattr(current_user, "role", "")).split(".")[-1].upper()
    now = datetime.utcnow()
    rows = db.execute(text("""
        SELECT * FROM serviya_announcements
        WHERE published = TRUE
          AND (starts_at IS NULL OR starts_at <= :now)
          AND (ends_at IS NULL OR ends_at >= :now)
          AND (audience = 'TODOS' OR audience = :role)
        ORDER BY CASE priority WHEN 'URGENTE' THEN 0 WHEN 'IMPORTANTE' THEN 1 ELSE 2 END, created_at DESC
    """), {"now": now, "role": role}).mappings().all()
    return {"announcements": [_row(r) for r in rows]}


@router.get("/admin")
def list_admin_announcements(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    _ensure_table(db)
    rows = db.execute(text("SELECT * FROM serviya_announcements ORDER BY created_at DESC")).mappings().all()
    return {"announcements": [_row(r) for r in rows]}


@router.post("/admin")
def create_announcement(payload: AnnouncementIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    _ensure_table(db)
    audience = payload.audience.upper()
    priority = payload.priority.upper()
    if audience not in {"TODOS", "CLIENTE", "TRABAJADOR"}:
        raise HTTPException(400, "Audiencia inválida")
    if priority not in {"NORMAL", "IMPORTANTE", "URGENTE"}:
        raise HTTPException(400, "Prioridad inválida")
    if payload.ends_at and payload.starts_at and payload.ends_at < payload.starts_at:
        raise HTTPException(400, "La fecha final no puede ser anterior a la inicial")
    row = db.execute(text("""
        INSERT INTO serviya_announcements
        (title, body, image_urls, audience, priority, action_label, action_tab, starts_at, ends_at, published, created_by)
        VALUES (:title, :body, CAST(:image_urls AS jsonb), :audience, :priority, :action_label, :action_tab, :starts_at, :ends_at, :published, :created_by)
        RETURNING *
    """), {
        "title": payload.title.strip(), "body": payload.body.strip(),
        "image_urls": json.dumps(payload.image_urls), "audience": audience, "priority": priority,
        "action_label": payload.action_label, "action_tab": payload.action_tab,
        "starts_at": payload.starts_at, "ends_at": payload.ends_at,
        "published": payload.published, "created_by": str(admin.email),
    }).mappings().first()
    db.commit()
    return {"announcement": _row(row)}


@router.patch("/admin/{announcement_id}")
def update_announcement(announcement_id: int, payload: AnnouncementIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    _ensure_table(db)
    exists = db.execute(text("SELECT id FROM serviya_announcements WHERE id=:id"), {"id": announcement_id}).first()
    if not exists:
        raise HTTPException(404, "Anuncio no encontrado")
    audience = payload.audience.upper(); priority = payload.priority.upper()
    if audience not in {"TODOS", "CLIENTE", "TRABAJADOR"} or priority not in {"NORMAL", "IMPORTANTE", "URGENTE"}:
        raise HTTPException(400, "Audiencia o prioridad inválida")
    row = db.execute(text("""
        UPDATE serviya_announcements SET title=:title, body=:body, image_urls=CAST(:image_urls AS jsonb),
        audience=:audience, priority=:priority, action_label=:action_label, action_tab=:action_tab,
        starts_at=:starts_at, ends_at=:ends_at, published=:published, updated_at=CURRENT_TIMESTAMP
        WHERE id=:id RETURNING *
    """), {
        "id": announcement_id, "title": payload.title.strip(), "body": payload.body.strip(),
        "image_urls": json.dumps(payload.image_urls), "audience": audience, "priority": priority,
        "action_label": payload.action_label, "action_tab": payload.action_tab,
        "starts_at": payload.starts_at, "ends_at": payload.ends_at, "published": payload.published,
    }).mappings().first()
    db.commit()
    return {"announcement": _row(row)}


@router.delete("/admin/{announcement_id}")
def delete_announcement(announcement_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    _ensure_table(db)
    result = db.execute(text("DELETE FROM serviya_announcements WHERE id=:id"), {"id": announcement_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(404, "Anuncio no encontrado")
    return {"message": "Anuncio eliminado", "id": announcement_id}
