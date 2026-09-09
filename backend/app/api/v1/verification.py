from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import User

router = APIRouter(prefix="/verification", tags=["Verificación Cédula RD"])

class UploadVerificationSchema(BaseModel):
    document_type: Optional[str] = "CEDULA_RD"
    document_url: str = Field(min_length=5, max_length=1000)
    notes: Optional[str] = None

@router.post("/upload")
def upload_verification(data: UploadVerificationSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.role.value != "TRABAJADOR":
        raise HTTPException(status_code=403, detail="La verificación de identidad está disponible para técnicos")
    document_type = (data.document_type or "CEDULA_RD").strip().upper()
    allowed = {"CEDULA_RD", "CEDULA_FRONT", "CEDULA_BACK", "SELFIE", "INFOTEP", "INFOTEP_CERTIFICATE"}
    if document_type not in allowed:
        raise HTTPException(status_code=400, detail="Tipo de documento no válido")
    row = db.execute(text("""
        INSERT INTO verifications (worker_id, document_type, document_url, status, admin_feedback, created_at)
        VALUES (:worker_id, :document_type, :document_url, 'PENDIENTE', :feedback, :created_at)
        RETURNING id, status, created_at
    """), {
        "worker_id": current_user.id,
        "document_type": document_type,
        "document_url": data.document_url.strip(),
        "feedback": data.notes,
        "created_at": datetime.utcnow(),
    }).mappings().one()
    if document_type in {"INFOTEP", "INFOTEP_CERTIFICATE"}:
        db.execute(text("UPDATE worker_profiles SET certificate_url=:url, has_infotep=true, is_approved=false WHERE user_id=:uid"), {"url": data.document_url.strip(), "uid": current_user.id})
    else:
        db.execute(text("UPDATE worker_profiles SET is_approved=false WHERE user_id=:uid"), {"uid": current_user.id})
    db.commit()
    return {"message": "Documento cargado. Queda pendiente de revisión administrativa.", "verification_id": row["id"], "status": row["status"], "created_at": str(row["created_at"])}

@router.get("/me")
def my_verification(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, document_type, document_url, status, admin_feedback, created_at
        FROM verifications WHERE worker_id=:uid ORDER BY created_at DESC
    """), {"uid": current_user.id}).mappings().all()
    return {"verifications": [dict(r) for r in rows]}
