from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import Service, Escrow, User

router = APIRouter(prefix="/contracts", tags=["Contratos"])


def _notify(db, user_id, title, message, kind, related_entity_id=None):
    if not user_id:
        return
    db.execute(
        text("""
            INSERT INTO notifications
                (id,user_id,title,message,type,related_entity_id,read,created_at)
            VALUES
                (gen_random_uuid()::text,:u,:t,:m,:k,:rid,false,CURRENT_TIMESTAMP)
        """),
        {"u": user_id, "t": title, "m": message, "k": kind, "rid": related_entity_id},
    )


@router.get("")
def list_contracts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    services = db.query(Service).filter(
        (Service.client_id == current_user.id) | (Service.worker_id == current_user.id)
    ).all()

    contracts = []
    for service in services:
        status_str = service.status.value if hasattr(service.status, "value") else str(service.status)
        escrow = (
            db.query(Escrow)
            .filter(Escrow.service_id == service.id)
            .order_by(Escrow.created_at.desc())
            .first()
        )
        contracts.append({
            "id": f"contract-{service.id}",
            "service_id": service.id,
            "title": service.title,
            "price_rd": service.price_rd,
            "status": status_str,
            "client_id": service.client_id,
            "worker_id": service.worker_id,
            "escrow_status": escrow.status if escrow else "NO_FINANCIADO",
            "created_at": str(service.created_at),
        })
    return {"contracts": contracts}


@router.get("/{id}")
def get_contract(
    id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service_id = id.removeprefix("contract-")
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Contrato o servicio no encontrado")

    if current_user.id not in {service.client_id, service.worker_id}:
        raise HTTPException(status_code=403, detail="No tienes acceso a este contrato")

    escrow = (
        db.query(Escrow)
        .filter(Escrow.service_id == service.id)
        .order_by(Escrow.created_at.desc())
        .first()
    )
    status_str = service.status.value if hasattr(service.status, "value") else str(service.status)

    return {
        "contract": {
            "id": f"contract-{service.id}",
            "service_id": service.id,
            "title": service.title,
            "price_rd": service.price_rd,
            "status": status_str,
            "client_id": service.client_id,
            "worker_id": service.worker_id,
            "escrow": {
                "total_amount_rd": escrow.total_amount_rd,
                "commission_amount_rd": escrow.commission_amount_rd,
                "worker_payout_rd": escrow.worker_payout_rd,
                "status": escrow.status,
            } if escrow else None,
        }
    }


@router.post("/{id}/confirm-completion")
def confirm_completion(
    id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Compatibility endpoint used by the contract UI.

    IMPORTANT: client confirmation never releases money. It only moves a
    RETENIDO escrow to PENDIENTE_APROBACION. Administration is the only role
    allowed to execute the final release through /admin-panel/escrows/{id}/approve-release.
    """
    service_id = id.removeprefix("contract-")
    service = (
        db.query(Service)
        .filter(Service.id == service_id)
        .with_for_update()
        .first()
    )
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    if service.client_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Solamente el cliente del servicio puede confirmar la finalización.",
        )

    escrow = (
        db.query(Escrow)
        .filter(Escrow.service_id == service.id)
        .order_by(Escrow.created_at.desc())
        .with_for_update()
        .first()
    )
    if not escrow:
        raise HTTPException(status_code=400, detail="No se encontró pago en custodia para este servicio.")

    if escrow.status == "PENDIENTE_APROBACION":
        return {
            "message": "La aprobación del cliente ya fue registrada y está pendiente de Administración.",
            "escrow_released": False,
            "awaiting_admin_release": True,
            "status": "PENDIENTE_APROBACION",
        }

    if escrow.status != "RETENIDO":
        raise HTTPException(
            status_code=409,
            detail="La custodia no está retenida; no se puede registrar la aprobación del cliente en este estado.",
        )

    escrow.status = "PENDIENTE_APROBACION"
    _notify(
        db,
        service.worker_id,
        "Aprobación del cliente registrada",
        "El cliente confirmó que el trabajo está terminado y conforme. El pago sigue protegido en Custodia hasta la liberación de Administración.",
        "CLIENT_APPROVED_RELEASE",
        service.id,
    )

    admin_ids = db.execute(
        text("""
            SELECT id
            FROM users
            WHERE COALESCE(is_active,true)=true
              AND (role='ADMIN' OR admin_role IS NOT NULL OR active_role='ADMIN')
        """
    ).scalars().all()
    for admin_id in admin_ids:
        _notify(
            db,
            admin_id,
            "Liberación pendiente de aprobación",
            f"El cliente aprobó el servicio y solicita la liberación de RD$ {float(escrow.total_amount_rd or 0):,.2f}. Revisa la evidencia y procesa la liberación administrativa.",
            "ADMIN_RELEASE_PENDING",
            service.id,
        )

    db.commit()
    return {
        "message": "Aprobación registrada. El dinero sigue protegido hasta que Administración confirme y libere los fondos.",
        "escrow_released": False,
        "awaiting_admin_release": True,
        "status": "PENDIENTE_APROBACION",
        "service_id": service.id,
    }
