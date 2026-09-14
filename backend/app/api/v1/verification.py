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
CERTIFICATE_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 8 * 1024 * 1024
CATEGORY_LABELS = {
    "CEDULA": "Cédula / identidad",
    "CERTIFICACION_TECNICA": "Certificación técnica",
    "DIPLOMADO": "Diplomado / formación profesional",
    "EXPERIENCIA_ACREDITADA": "Experiencia o acreditación profesional",
    "LICENCIA_ESPECIALIDAD": "Licencia / especialidad",
}
OPTIONAL_CATEGORIES = tuple(k for k in CATEGORY_LABELS if k != "CEDULA")


class UploadVerificationSchema(BaseModel):
    document_type: Optional[str] = "CEDULA_RD"
    document_url: str = Field(min_length=5, max_length=1000)
    notes: Optional[str] = None


def _require_worker(current_user: User):
    if current_user.role.value != "TRABAJADOR":
        raise HTTPException(status_code=403, detail="La verificación de identidad está disponible para técnicos")


def _summary(db: Session, worker_id: str):
    rows = db.execute(text("""
        SELECT verification_category, document_type, document_name, status, admin_feedback,
               document_url, created_at, reviewed_at
        FROM verifications
        WHERE worker_id=:uid
        ORDER BY created_at DESC
    """), {"uid": worker_id}).mappings().all()

    approved = {}
    for row in rows:
        category = row["verification_category"]
        if not category:
            category = "CEDULA" if str(row["document_type"] or "").upper() in {"CEDULA_RD", "CEDULA_FRONT", "CEDULA_BACK"} else str(row["document_type"] or "").upper()
        if category in CATEGORY_LABELS and category not in approved and row["status"] == "VERIFICADO":
            approved[category] = row

    stars = 1 if "CEDULA" in approved else 0
    stars += sum(1 for category in OPTIONAL_CATEGORIES if category in approved)
    return {
        "stars": stars,
        "max_stars": 5,
        "level": "VERIFICACIÓN COMPLETA" if stars == 5 else ("VERIFICADO" if stars == 1 else "VERIFICACIÓN EN PROGRESO" if stars > 1 else "SIN VERIFICAR"),
        "base_verified": "CEDULA" in approved,
        "categories": [
            {
                "key": key,
                "label": label,
                "required": key == "CEDULA",
                "verified": key in approved,
                "document_name": approved[key]["document_name"] if key in approved else None,
            }
            for key, label in CATEGORY_LABELS.items()
        ],
        "verified_certifications": [
            {"category": key, "label": CATEGORY_LABELS[key], "document_name": approved[key]["document_name"]}
            for key in OPTIONAL_CATEGORIES if key in approved
        ],
        "documents": [
            {
                "id": row["document_type"],
                "category": row["verification_category"] or row["document_type"],
                "document_type": row["document_type"],
                "document_name": row["document_name"],
                "status": row["status"],
                "admin_feedback": row["admin_feedback"],
                "created_at": str(row["created_at"]),
                "reviewed_at": str(row["reviewed_at"]) if row["reviewed_at"] else None,
            }
            for row in rows
        ],
    }


@router.post("/upload")
def upload_verification(
    data: UploadVerificationSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_worker(current_user)
    document_type = (data.document_type or "CEDULA_RD").strip().upper()
    allowed = {"CEDULA_RD", "CEDULA_FRONT", "CEDULA_BACK", "SELFIE", "INFOTEP", "INFOTEP_CERTIFICATE", *OPTIONAL_CATEGORIES}
    if document_type not in allowed:
        raise HTTPException(status_code=400, detail="Tipo de documento no válido")
    category = "CEDULA" if document_type in {"CEDULA_RD", "CEDULA_FRONT", "CEDULA_BACK"} else ("CERTIFICACION_TECNICA" if document_type in {"INFOTEP", "INFOTEP_CERTIFICATE"} else document_type)
    row = db.execute(text("""
        INSERT INTO verifications (worker_id, document_type, document_url, verification_category, document_name, status, admin_feedback, created_at)
        VALUES (:worker_id, :document_type, :document_url, :category, :name, 'PENDIENTE', :feedback, :created_at)
        RETURNING id, status, created_at
    """), {
        "worker_id": current_user.id,
        "document_type": document_type,
        "document_url": data.document_url.strip(),
        "category": category,
        "name": data.notes.strip() if data.notes else CATEGORY_LABELS.get(category),
        "feedback": data.notes,
        "created_at": datetime.utcnow(),
    }).mappings().one()
    if category == "CERTIFICACION_TECNICA":
        db.execute(text("UPDATE worker_profiles SET certificate_url=:url, has_infotep=true, is_approved=false WHERE user_id=:uid"), {"url": data.document_url.strip(), "uid": current_user.id})
    elif category == "CEDULA":
        db.execute(text("UPDATE worker_profiles SET is_approved=false WHERE user_id=:uid"), {"uid": current_user.id})
    db.commit()
    return {"message": "Documento cargado. Queda pendiente de revisión administrativa.", "verification_id": row["id"], "status": row["status"], "created_at": str(row["created_at"])}


@router.post("/upload-certificate")
async def upload_certificate(
    category: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_worker(current_user)
    category = category.strip().upper()
    if category not in OPTIONAL_CATEGORIES:
        raise HTTPException(status_code=400, detail="Categoría de certificación no válida")
    if file.content_type not in CERTIFICATE_TYPES:
        raise HTTPException(status_code=400, detail="La certificación debe ser un PDF o una imagen JPG, PNG o WEBP")
    content = await file.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="El documento no puede superar 8 MB")
    extension = ".pdf" if file.content_type == "application/pdf" else {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[file.content_type]
    filename = f"{current_user.id}_{category.lower()}_{uuid4().hex}{extension}"
    (UPLOAD_DIR / filename).write_bytes(content)
    url = f"/api/v1/verification/file/{filename}"
    row = db.execute(text("""
        INSERT INTO verifications (worker_id, document_type, verification_category, document_url, document_name, mime_type, status, created_at)
        VALUES (:uid, :type, :category, :url, :name, :mime, 'PENDIENTE', :created_at)
        RETURNING id, status
    """), {
        "uid": current_user.id,
        "type": category,
        "category": category,
        "url": url,
        "name": file.filename or CATEGORY_LABELS[category],
        "mime": file.content_type,
        "created_at": datetime.utcnow(),
    }).mappings().one()
    db.commit()
    return {"message": "Certificación cargada. Queda pendiente de revisión administrativa.", "verification_id": row["id"], "status": row["status"], "url": url, "category": category}


@router.post("/upload-photo")
async def upload_cedula_photo(
    side: str,
    photo: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
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
        INSERT INTO verifications (worker_id, document_type, verification_category, document_url, document_name, mime_type, status, created_at)
        VALUES (:worker_id, :document_type, 'CEDULA', :document_url, :document_name, :mime_type, 'PENDIENTE', :created_at)
        RETURNING id, status, created_at
    """), {
        "worker_id": current_user.id,
        "document_type": document_type,
        "document_url": url,
        "document_name": 'Frente de la cédula' if side == 'front' else 'Dorso de la cédula',
        "mime_type": photo.content_type,
        "created_at": datetime.utcnow(),
    }).mappings().one()
    column = "cedula_front_url" if side == "front" else "cedula_back_url"
    db.execute(text(f"UPDATE worker_profiles SET {column}=:url, is_approved=false WHERE user_id=:uid"), {"url": url, "uid": current_user.id})
    db.commit()
    return {"message": "Foto de cédula cargada correctamente. No se realizó escaneo.", "side": side, "url": url, "verification_id": row["id"], "status": row["status"]}


@router.get("/file/{filename}")
def get_verification_file(filename: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _require_worker(current_user)
    safe_name = Path(filename).name
    path = UPLOAD_DIR / safe_name
    if not path.is_file() or not safe_name.startswith(f"{current_user.id}_"):
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    return FileResponse(path)


@router.get("/me")
def my_verification(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    return {"verifications": _summary(db, current_user.id)["documents"], "summary": _summary(db, current_user.id)}


@router.get("/public/{worker_id}")
def public_worker_verification(worker_id: str, db: Session = Depends(get_db)):
    worker = db.query(User).filter(User.id == worker_id, User.role == "TRABAJADOR", User.is_active.is_(True)).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    summary = _summary(db, worker_id)
    return {
        "worker_id": worker_id,
        "stars": summary["stars"],
        "max_stars": 5,
        "level": summary["level"],
        "base_verified": summary["base_verified"],
        "verified_certifications": summary["verified_certifications"],
    }
