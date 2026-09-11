from fastapi import APIRouter, Depends, HTTPException, status
from app.core.deps import require_admin
from app.models.models import User

router = APIRouter(prefix="/admin-panel", tags=["Finanzas administrativas"])

@router.post("/disputes/{dispute_id}/financial-resolution")
def financial_resolution_legacy_blocked(dispute_id: int, admin_user: User = Depends(require_admin)):
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Esta ruta financiera histórica está deshabilitada. Usa la resolución administrativa de disputas con snapshot fiscal para proteger Custodia, Wallet y auditoría.",
    )
