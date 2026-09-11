import hashlib
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user, require_admin
from app.models.models import Service, Escrow, User

router = APIRouter(prefix="/contracts", tags=["Contratos"])


def _notify(db, user_id, title, message, kind, related_entity_id=None):
    if not user_id:
        return
    db.execute(text("""
        INSERT INTO notifications (id,user_id,title,message,type,related_entity_id,read,created_at)
        VALUES (gen_random_uuid()::text,:u,:t,:m,:k,:rid,false,CURRENT_TIMESTAMP)
    """), {"u": user_id, "t": title, "m": message, "k": kind, "rid": related_entity_id})


def _ensure_contract_table(db):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS digital_contracts (
            id TEXT PRIMARY KEY,
            service_id TEXT NOT NULL UNIQUE,
            escrow_id TEXT NOT NULL,
            contract_number VARCHAR(80) NOT NULL UNIQUE,
            version INTEGER NOT NULL DEFAULT 1,
            status VARCHAR(40) NOT NULL DEFAULT 'EMITIDO',
            content_json JSONB NOT NULL,
            content_text TEXT NOT NULL,
            content_hash VARCHAR(64) NOT NULL,
            generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            generated_by_admin TEXT NOT NULL,
            client_accepted_at TIMESTAMP NULL,
            worker_accepted_at TIMESTAMP NULL,
            client_acceptance_ip VARCHAR(100) NULL,
            worker_acceptance_ip VARCHAR(100) NULL,
            client_user_agent TEXT NULL,
            worker_user_agent TEXT NULL,
            client_acceptance_hash VARCHAR(64) NULL,
            worker_acceptance_hash VARCHAR(64) NULL
        )
    """))


def _contract_document(service, escrow, client, worker, admin_id, notes=""):
    generated_at = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    total = float(escrow.total_amount_rd or 0)
    commission = float(escrow.commission_amount_rd or round(total * 0.10, 2))
    payout = float(escrow.worker_payout_rd or round(total * 0.90, 2))
    content = {
        "document_type": "CONTRATO_DIGITAL_DE_PRESTACION_DE_SERVICIOS_SERVIYA",
        "platform": "SERVIYA",
        "version": 1,
        "contract_number": f"SRV-CON-{str(service.id)[:8].upper()}-{str(escrow.id)[:8].upper()}",
        "issued_at": generated_at,
        "issued_by_admin_id": str(admin_id),
        "service": {
            "id": str(service.id), "title": service.title, "description": service.description,
            "category": service.category_name, "subcategory": service.subcategory,
            "province": service.province, "municipality": service.municipality,
            "address_approx": service.address_approx, "service_date": service.service_date,
            "service_time": service.service_time, "estimated_duration": service.estimated_duration,
            "requirements": service.requirements or [], "images": service.images or [],
        },
        "agreement": {
            "negotiation_status": service.negotiation_status,
            "negotiated_price_rd": float(service.negotiated_price_rd or 0),
            "price_agreed_at": service.price_agreed_at.isoformat() if service.price_agreed_at else None,
            "payment_type": service.payment_type,
        },
        "parties": {
            "client": {"id": str(client.id), "name": f"{client.first_name} {client.last_name}", "email": client.email, "phone": client.phone},
            "worker": {"id": str(worker.id), "name": f"{worker.first_name} {worker.last_name}", "email": worker.email, "phone": worker.phone},
        },
        "custody": {
            "escrow_id": str(escrow.id), "status": escrow.status, "total_amount_rd": total,
            "commission_percent": 10.0, "commission_rd": commission, "worker_payout_rd": payout,
            "payment_method": escrow.payment_method, "voucher_received": bool(escrow.voucher_url),
            "custody_activated_at": generated_at,
        },
        "terms": [
            "El precio de este contrato corresponde al precio final acordado entre cliente y trabajador.",
            "El pago fue depositado para este trabajo específico y quedó retenido en Custodia SERVIYA tras verificación administrativa.",
            "El trabajador se obliga a ejecutar el servicio descrito y a entregar evidencia de finalización cuando corresponda.",
            "La confirmación del cliente no libera automáticamente los fondos; la liberación final corresponde exclusivamente a Administración SERVIYA.",
            "SERVIYA registra las actuaciones, estados, comprobantes y aprobaciones relacionadas con este contrato para fines de trazabilidad y prueba.",
            "Las partes deben conservar este documento y sus comprobantes. Las controversias se tramitan mediante el procedimiento de disputas de SERVIYA.",
            "La garantía y sus condiciones se rigen por las políticas vigentes de SERVIYA asociadas al servicio.",
        ],
        "admin_notes": notes or "Depósito verificado y contrato digital emitido.",
        "legal_notice": "Este documento electrónico constituye un registro de la operación, del acuerdo y de las actuaciones registradas en SERVIYA. Su valor probatorio o fuerza contractual frente a terceros dependerá de la legislación aplicable y de las formalidades que dicha legislación exija; para operaciones que requieran una formalidad especial se recomienda asesoría legal y, cuando corresponda, firma electrónica cualificada o notarización.",
    }
    content_text = json.dumps(content, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    content_hash = hashlib.sha256(content_text.encode("utf-8")).hexdigest()
    return content, content_text, content_hash


@router.get("")
def list_contracts(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ensure_contract_table(db)
    services = db.query(Service).filter((Service.client_id == current_user.id) | (Service.worker_id == current_user.id)).all()
    contracts = []
    for service in services:
        row = db.execute(text("SELECT id,contract_number,status,version,content_hash,generated_at,client_accepted_at,worker_accepted_at FROM digital_contracts WHERE service_id=:sid"), {"sid": service.id}).mappings().first()
        status_str = service.status.value if hasattr(service.status, "value") else str(service.status)
        escrow = db.query(Escrow).filter(Escrow.service_id == service.id).order_by(Escrow.created_at.desc()).first()
        contracts.append({
            "id": row["id"] if row else f"contract-{service.id}", "service_id": service.id,
            "title": service.title, "price_rd": service.negotiated_price_rd or service.price_rd,
            "status": row["status"] if row else "NO_EMITIDO", "service_status": status_str,
            "escrow_status": escrow.status if escrow else "NO_FINANCIADO",
            "contract_number": row["contract_number"] if row else None,
            "version": row["version"] if row else None, "content_hash": row["content_hash"] if row else None,
            "generated_at": str(row["generated_at"]) if row else None,
            "client_accepted_at": str(row["client_accepted_at"]) if row and row["client_accepted_at"] else None,
            "worker_accepted_at": str(row["worker_accepted_at"]) if row and row["worker_accepted_at"] else None,
        })
    db.commit()
    return {"contracts": contracts}


@router.get("/{id}")
def get_contract(id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ensure_contract_table(db)
    service_id = id.removeprefix("contract-")
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Contrato o servicio no encontrado")
    if current_user.id not in {service.client_id, service.worker_id} and str(current_user.role) != "UserRoleEnum.ADMIN" and current_user.active_role != "ADMIN":
        raise HTTPException(status_code=403, detail="No tienes acceso a este contrato")
    row = db.execute(text("SELECT * FROM digital_contracts WHERE service_id=:sid"), {"sid": service.id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="El contrato digital todavía no ha sido emitido")
    return {"contract": dict(row), "document": row["content_json"], "integrity": {"sha256": row["content_hash"], "immutable": True}}


@router.post("/{id}/accept")
def accept_contract(id: str, request: Request, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ensure_contract_table(db)
    service_id = id.removeprefix("contract-")
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service or current_user.id not in {service.client_id, service.worker_id}:
        raise HTTPException(status_code=403, detail="No tienes acceso a este contrato")
    row = db.execute(text("SELECT * FROM digital_contracts WHERE service_id=:sid FOR UPDATE"), {"sid": service.id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Contrato digital no emitido")
    if row["status"] == "ANULADO":
        raise HTTPException(status_code=409, detail="Este contrato está anulado")
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
    user_agent = request.headers.get("user-agent", "unknown")
    accepted_at = datetime.utcnow()
    role = "CLIENTE" if current_user.id == service.client_id else "TRABAJADOR"
    acceptance_payload = f"{row['content_hash']}|{current_user.id}|{role}|{accepted_at.isoformat()}|{ip}|{user_agent}"
    acceptance_hash = hashlib.sha256(acceptance_payload.encode("utf-8")).hexdigest()
    if role == "CLIENTE":
        db.execute(text("UPDATE digital_contracts SET client_accepted_at=COALESCE(client_accepted_at,:at),client_acceptance_ip=COALESCE(client_acceptance_ip,:ip),client_user_agent=COALESCE(client_user_agent,:ua),client_acceptance_hash=COALESCE(client_acceptance_hash,:h),status=CASE WHEN worker_accepted_at IS NOT NULL THEN 'ACEPTADO_POR_AMBOS' ELSE 'ACEPTADO_POR_CLIENTE' END WHERE service_id=:sid"), {"sid":service.id,"at":accepted_at,"ip":ip,"ua":user_agent,"h":acceptance_hash})
    else:
        db.execute(text("UPDATE digital_contracts SET worker_accepted_at=COALESCE(worker_accepted_at,:at),worker_acceptance_ip=COALESCE(worker_acceptance_ip,:ip),worker_user_agent=COALESCE(worker_user_agent,:ua),worker_acceptance_hash=COALESCE(worker_acceptance_hash,:h),status=CASE WHEN client_accepted_at IS NOT NULL THEN 'ACEPTADO_POR_AMBOS' ELSE 'ACEPTADO_POR_TRABAJADOR' END WHERE service_id=:sid"), {"sid":service.id,"at":accepted_at,"ip":ip,"ua":user_agent,"h":acceptance_hash})
    _notify(db, service.worker_id if role == "CLIENTE" else service.client_id, "Contrato digital aceptado", f"{role} aceptó el contrato {row['contract_number']}. Hash de integridad: {row['content_hash']}", "CONTRACT_ACCEPTED", service.id)
    db.commit()
    return {"message":"Aceptación registrada como evidencia electrónica.","contract_number":row["contract_number"],"content_hash":row["content_hash"],"acceptance_hash":acceptance_hash}


@router.get("/{id}/document")
def contract_document(id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    result = get_contract(id, current_user, db)
    document = result["document"]
    return {"contract_number": result["contract"]["contract_number"], "format": "SERVIYA_DIGITAL_CONTRACT_JSON", "sha256": result["integrity"]["sha256"], "document": document}


@router.post("/{id}/confirm-completion")
def confirm_completion(id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service_id = id.removeprefix("contract-")
    service = db.query(Service).filter(Service.id == service_id).with_for_update().first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if service.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solamente el cliente del servicio puede confirmar la finalización.")
    escrow = db.query(Escrow).filter(Escrow.service_id == service.id).order_by(Escrow.created_at.desc()).with_for_update().first()
    if not escrow:
        raise HTTPException(status_code=400, detail="No se encontró pago en custodia para este servicio.")
    if escrow.status == "PENDIENTE_APROBACION":
        return {"message":"La aprobación del cliente ya fue registrada y está pendiente de Administración.","escrow_released":False,"awaiting_admin_release":True,"status":"PENDIENTE_APROBACION"}
    if escrow.status != "RETENIDO":
        raise HTTPException(status_code=409, detail="La custodia no está retenida; no se puede registrar la aprobación del cliente en este estado.")
    escrow.status = "PENDIENTE_APROBACION"
    _notify(db, service.worker_id, "Aprobación del cliente registrada", "El cliente confirmó que el trabajo está terminado y conforme. El pago sigue protegido en Custodia hasta la liberación de Administración.", "CLIENT_APPROVED_RELEASE", service.id)
    admin_ids = db.execute(text("SELECT id FROM users WHERE COALESCE(is_active,true)=true AND (role='ADMIN' OR admin_role IS NOT NULL OR active_role='ADMIN')")).scalars().all()
    for admin_id in admin_ids:
        _notify(db, admin_id, "Liberación pendiente de aprobación", f"El cliente aprobó el servicio y solicita la liberación de RD$ {float(escrow.total_amount_rd or 0):,.2f}. Revisa la evidencia y procesa la liberación administrativa.", "ADMIN_RELEASE_PENDING", service.id)
    db.commit()
    return {"message":"Aprobación registrada. El dinero sigue protegido hasta que Administración confirme y libere los fondos.","escrow_released":False,"awaiting_admin_release":True,"status":"PENDIENTE_APROBACION","service_id":service.id}
