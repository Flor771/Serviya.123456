from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_admin
from app.models.models import User

router = APIRouter(prefix="/admin-panel", tags=["Historial y Auditoría"])

@router.get("/history")
def admin_history(
    q: Optional[str] = Query(None, description="Buscar por usuario, correo, acción, proceso, entidad, servicio o texto"),
    event_type: Optional[str] = Query(None, description="AUDITORIA o PROCESO"),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # This endpoint is intentionally read-only and combines the permanent audit trail
    # with the permanent process-state trail so Administration can search one timeline.
    like = f"%{q.strip()}%" if q and q.strip() else None
    audit_sql = """
        SELECT 'AUDITORIA' AS event_type, a.id::text AS id, a.created_at,
               a.action AS action, a.entity_type, a.entity_id::text AS entity_id,
               a.details AS message, NULL::text AS status,
               a.admin_id AS actor_id,
               COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))),''), u.email, a.admin_id) AS actor_name,
               u.email AS actor_email
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.admin_id
        WHERE 1=1
    """
    process_sql = """
        SELECT 'PROCESO' AS event_type, p.id::text AS id, p.created_at,
               p.process_type AS action, 'PROCESO' AS entity_type,
               p.related_entity_id::text AS entity_id,
               CONCAT(p.title, CASE WHEN p.message IS NOT NULL AND p.message <> '' THEN ' — ' || p.message ELSE '' END) AS message,
               p.status, p.user_id AS actor_id,
               COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))),''), u.email, p.user_id) AS actor_name,
               u.email AS actor_email
        FROM process_events p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE 1=1
    """
    params = {"q": like, "date_from": date_from, "date_to": date_to, "status": status, "limit": limit, "offset": offset}
    clauses = ""
    if like:
        clauses += " AND (COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.email,'') || ' ' || COALESCE(a.action,'') || ' ' || COALESCE(a.entity_type,'') || ' ' || COALESCE(a.details,'') || ' ' || COALESCE(a.entity_id::text,'')) ILIKE :q"
    if date_from: clauses += " AND a.created_at >= :date_from"
    if date_to: clauses += " AND a.created_at <= :date_to"
    audit_sql += clauses
    pclauses = ""
    if like:
        pclauses += " AND (COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.email,'') || ' ' || COALESCE(p.process_type,'') || ' ' || COALESCE(p.title,'') || ' ' || COALESCE(p.message,'') || ' ' || COALESCE(p.related_entity_id::text,'')) ILIKE :q"
    if status: pclauses += " AND p.status = :status"
    if date_from: pclauses += " AND p.created_at >= :date_from"
    if date_to: pclauses += " AND p.created_at <= :date_to"
    process_sql += pclauses

    rows = []
    if event_type in (None, "", "AUDITORIA"):
        rows.extend([dict(x) for x in db.execute(text(audit_sql), params).mappings().all()])
    if event_type in (None, "", "PROCESO"):
        rows.extend([dict(x) for x in db.execute(text(process_sql), params).mappings().all()])
    rows.sort(key=lambda x: x.get("created_at") or datetime.min, reverse=True)
    total = len(rows)
    page = rows[offset:offset + limit]
    for row in page:
        if row.get("created_at"):
            row["created_at"] = row["created_at"].isoformat()
    return {"items": page, "total": total, "limit": limit, "offset": offset, "search": q or "", "message": "Historial cargado correctamente."}
