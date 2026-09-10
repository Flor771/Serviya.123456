from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import User

router = APIRouter(prefix="/verification", tags=["Verificación Cédula RD"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads" / "verification"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 8 * 1024 * 1024


class UploadVerificationSchema(BaseModel):
    document_type: Optional[str] = "CEDULA_RD"
    document_url: str = Field(min_length=5, max_length=1000)
    notes: Optional[str] = None


def _require_worker(current_user: User):
    if current_user.role.value != "TRABAJADOR":
        raise HTTPException(status_code=403, detail="La verificación de identidad está disponible para técnicos")


@router.post("/upload")
def upload_verification(
    data: UploadVerificationSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_worker(current_user)
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


@router.post("/upload-photo")
async def upload_cedula_photo(
    side: str,
    photo: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Carga directa de una foto de la cédula. No realiza escaneo ni OCR."""
    _require_worker(current_user)
    side = side.strip().lower()
    if side not in {"front", "back"}:
        raise HTTPException(status_code=400, detail="La foto debe ser frontal o posterior")
    if photo.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Solo se permiten fotos JPG, PNG o WEBP")

    content = await photo.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="La foto no puede superar 8 MB")

    extension = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[photo.content_type]
    filename = f"{current_user.id}_{side}_{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename
    destination.write_bytes(content)
    url = f"/api/v1/verification/file/{filename}"
    document_type = "CEDULA_FRONT" if side == "front" else "CEDULA_BACK"

    row = db.execute(text("""
        INSERT INTO verifications (worker_id, document_type, document_url, status, created_at)
        VALUES (:worker_id, :document_type, :document_url, 'PENDIENTE', :created_at)
        RETURNING id, status, created_at
    """), {
        "worker_id": current_user.id,
        "document_type": document_type,
        "document_url": url,
        "created_at": datetime.utcnow(),
    }).mappings().one()

    column = "cedula_front_url" if side == "front" else "cedula_back_url"
    db.execute(text(f"UPDATE worker_profiles SET {column}=:url, is_approved=false WHERE user_id=:uid"), {"url": url, "uid": current_user.id})
    db.commit()
    return {
        "message": "Foto de cédula cargada correctamente. No se realizó escaneo.",
        "side": side,
        "url": url,
        "verification_id": row["id"],
        "status": row["status"],
    }


@router.get("/file/{filename}")
def get_verification_file(
    filename: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_worker(current_user)
    safe_name = Path(filename).name
    path = UPLOAD_DIR / safe_name
    if not path.is_file() or not safe_name.startswith(f"{current_user.id}_"):
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    return FileResponse(path)


@router.get("/me")
def my_verification(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, document_type, document_url, status, admin_feedback, created_at
        FROM verifications WHERE worker_id=:uid ORDER BY created_at DESC
    """), {"uid": current_user.id}).mappings().all()
    return {"verifications": [dict(r) for r in rows]}
