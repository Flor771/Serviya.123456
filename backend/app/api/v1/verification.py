from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import VerificationDocument, WorkerProfile, VerificationStatusEnum, User

router = APIRouter(prefix="/verification", tags=["Verificación Cédula RD"])

class UploadVerificationSchema(BaseModel):
    document_type: Optional[str] = "CEDULA_RD"
    document_url: str
    notes: Optional[str] = None

@router.post("/upload")
def upload_verification(
    data: UploadVerificationSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    doc = VerificationDocument(
        user_id=current_user.id,
        document_type=data.document_type or "CEDULA_RD",
        document_url=data.document_url,
        notes=data.notes,
        status=VerificationStatusEnum.PENDIENTE
    )
    db.add(doc)

    worker_prof = db.query(WorkerProfile).filter(WorkerProfile.user_id == current_user.id).first()
    if worker_prof:
        worker_prof.verification_status = VerificationStatusEnum.PENDIENTE

    db.commit()
    db.refresh(doc)

    return {
        "message": "Documento de identidad cargado exitosamente. En proceso de verificación administrativa.",
        "verification_id": doc.id,
        "status": "PENDIENTE"
    }
