from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
from app.core.deps import get_db, require_admin
from app.models.models import User

router = APIRouter(prefix="/admin", tags=["Verificación administrativa"])

CATEGORIES = {
    "CEDULA": {"label": "Cédula / identidad", "required": True},
    "CERTIFICACION_TECNICA": {"label": "Certificación técnica", "required": False},
    "DIPLOMADO": {"label": "Diplomado / formación profesional", "required": False},
    "EXPERIENCIA_ACREDITADA": {"label": "Experiencia o acreditación profesional", "required": False},
    "LICENCIA_ESPECIALIDAD": {"label": "Licencia / especialidad", "required": False},
}

class VerificationDecision(BaseModel):
    status: str
    notes: str | None = None


def _category_sql():
    return "COALESCE(v.verification_category, CASE WHEN UPPER(v.document_type) IN ('CEDULA_RD','CEDULA_FRONT','CEDULA_BACK') THEN 'CEDULA' WHEN UPPER(v.document_type) IN ('INFOTEP','INFOTEP_CERTIFICATE') THEN 'CERTIFICACION_TECNICA' ELSE UPPER(v.document_type) END)"


def _worker_summary(db: Session, worker_id: str):
    cat = _category_sql()
    rows = db.execute(text(f"""
        SELECT v.verification_category, v.document_type, v.document_name, v.document_url,
               v.status, v.admin_feedback, v.created_at, v.reviewed_at,
               u.first_name, u.last_name, u.email, u.phone, u.is_verified
        FROM verifications v
        JOIN users u ON u.id=v.worker_id
        WHERE v.worker_id=:uid
        ORDER BY v.created_at DESC
    """), {"uid": worker_id}).mappings().all()
    approved = {}
    for r in rows:
        category = r["verification_category"] or ("CEDULA" if str(r["document_type"] or "").upper() in {"CEDULA_RD","CEDULA_FRONT","CEDULA_BACK"} else ("CERTIFICACION_TECNICA" if str(r["document_type"] or "").upper() in {"INFOTEP","INFOTEP_CERTIFICATE"} else str(r["document_type"] or "").upper()))
        if category in CATEGORIES and category not in approved and r["status"] == "VERIFICADO":
            approved[category] = r
    stars = (1 if "CEDULA" in approved else 0) + sum(1 for c in CATEGORIES if c != "CEDULA" and c in approved)
    return {
        "worker": {"id": worker_id, "name": f"{rows[0]['first_name']} {rows[0]['last_name']}" if rows else worker_id, "email": rows[0]["email"] if rows else None, "phone": rows[0]["phone"] if rows else None, "is_verified": bool(rows[0]["is_verified"]) if rows else False},
        "stars": stars,
        "max_stars": 5,
        "level": "VERIFICACIÓN COMPLETA" if stars == 5 else ("VERIFICADO" if stars == 1 else "VERIFICACIÓN EN PROGRESO" if stars > 1 else "SIN VERIFICAR"),
        "categories": [{"key": k, "label": v["label"], "required": v["required"], "verified": k in approved} for k,v in CATEGORIES.items()],
        "documents": [dict(r) for r in rows],
    }


@router.get("/verifications/full")
def full_verifications(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT DISTINCT v.worker_id, u.first_name, u.last_name, u.email, u.is_verified
        FROM verifications v JOIN users u ON u.id=v.worker_id
        WHERE u.role='TRABAJADOR'
        ORDER BY u.last_name, u.first_name
    """)).mappings().all()
    return {"workers": [_worker_summary(db, r["worker_id"]) for r in rows]}


@router.patch("/verifications/{verification_id}")
def update_verification(verification_id: int, data: VerificationDecision, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    status = str(data.status or '').strip().upper()
    if status not in {'VERIFICADO','APROBADO','RECHAZADO','PENDIENTE'}:
        raise HTTPException(400, 'Estado de verificación no válido.')
    row = db.execute(text('SELECT id, worker_id, verification_category, document_type FROM verifications WHERE id=:id FOR UPDATE'), {'id': verification_id}).mappings().first()
    if not row:
        raise HTTPException(404, 'Documento de verificación no encontrado.')
    canonical = 'VERIFICADO' if status == 'APROBADO' else status
    db.execute(text('UPDATE verifications SET status=:status, admin_feedback=:notes, reviewed_at=:now, reviewed_by=:admin WHERE id=:id'), {'status':canonical,'notes':data.notes,'now':datetime.utcnow(),'admin':admin_user.id,'id':verification_id})
    db.execute(text("""
        INSERT INTO admin_audit_logs (admin_id,action,resource,target_id,details,timestamp)
        VALUES (:aid,'VERIFICATION_UPDATED','verifications',:id,:details,CURRENT_TIMESTAMP)
    """), {'aid':admin_user.id,'id':verification_id,'details':f'Estado={canonical}; {data.notes or ""}'})
    db.commit()
    return {'message':'Verificación actualizada.','status':canonical}


@router.get("/verifications/file/{filename}")
def admin_verification_file(filename: str, admin_user: User = Depends(require_admin)):
    safe_name = Path(filename).name
    path = Path(__file__).resolve().parent.parent.parent.parent / "uploads" / "verification" / safe_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return FileResponse(path)
