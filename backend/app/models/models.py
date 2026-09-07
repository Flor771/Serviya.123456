import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class UserRoleEnum(str, enum.Enum):
    CLIENTE = "CLIENTE"
    TRABAJADOR = "TRABAJADOR"
    ADMIN = "ADMIN"

class ServiceStatusEnum(str, enum.Enum):
    PUBLICADA = "PUBLICADA"
    RECIBIENDO_POSTULACIONES = "RECIBIENDO_POSTULACIONES"
    TRABAJADOR_SELECCIONADO = "TRABAJADOR_SELECCIONADO"
    EN_PROGRESO = "EN_PROGRESO"
    COMPLETADA = "COMPLETADA"
    CANCELADA = "CANCELADA"
    EN_DISPUTA = "EN_DISPUTA"

class ApplicationStatusEnum(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    SELECCIONADO = "SELECCIONADO"
    RECHAZADO = "RECHAZADO"

class VerificationStatusEnum(str, enum.Enum):
    SIN_VERIFICAR = "SIN_VERIFICAR"
    PENDIENTE = "PENDIENTE"
    VERIFICADO = "VERIFICADO"
    RECHAZADO = "RECHAZADO"

class DisputeStatusEnum(str, enum.Enum):
    ABIERTA = "ABIERTA"
    EN_REVISION = "EN_REVISION"
    RESUELTA = "RESUELTA"
    CERRADA = "CERRADA"

class WithdrawalStatusEnum(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    PROCESANDO = "PROCESANDO"
    COMPLETADO = "COMPLETADO"
    RECHAZADO = "RECHAZADO"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=False)
    cedula = Column(String(20), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRoleEnum), default=UserRoleEnum.CLIENTE)
    active_role = Column(String(20), default="CLIENTE")
    province = Column(String(100), nullable=False, default="Distrito Nacional")
    municipality = Column(String(100), nullable=False, default="Santo Domingo de Guzmán (DN)")
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_verified = Column(Boolean, default=False)
    rating = Column(Float, default=5.0)
    jobs_completed = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    worker_profile = relationship("WorkerProfile", back_populates="user", uselist=False)
    wallet = relationship("Wallet", back_populates="user", uselist=False)

class WorkerProfile(Base):
    __tablename__ = "worker_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    profession = Column(String(150), nullable=False)
    specialties = Column(JSON, default=[])
    experience_years = Column(Integer, default=1)
    hourly_rate_rd = Column(Float, default=500.0)
    availability = Column(String(50), default="TIEMPO_COMPLETO")
    portfolio_images = Column(JSON, default=[])
    certifications = Column(JSON, default=[])
    verification_status = Column(Enum(VerificationStatusEnum), default=VerificationStatusEnum.SIN_VERIFICAR)

    user = relationship("User", back_populates="worker_profile")

class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    icon = Column(String(50), nullable=False, default="Wrench")
    description = Column(Text, nullable=True)
    subcategories = Column(JSON, default=[])

class Service(Base):
    __tablename__ = "services"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=True)
    category_name = Column(String(100), nullable=False)
    subcategory = Column(String(100), nullable=True)
    price_rd = Column(Float, nullable=False)
    province = Column(String(100), nullable=False)
    municipality = Column(String(100), nullable=False)
    address_approx = Column(String(255), nullable=True)
    service_date = Column(String(50), nullable=False)
    service_time = Column(String(50), nullable=False)
    estimated_duration = Column(String(50), nullable=True)
    images = Column(JSON, default=[])
    requirements = Column(JSON, default=[])
    payment_type = Column(String(50), default="CUSTODIA_SERVIYA")
    status = Column(Enum(ServiceStatusEnum), default=ServiceStatusEnum.PUBLICADA)
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    worker_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=generate_uuid)
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    worker_id = Column(String, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    offered_price_rd = Column(Float, nullable=False)
    availability_note = Column(String(255), nullable=True)
    status = Column(Enum(ApplicationStatusEnum), default=ApplicationStatusEnum.PENDIENTE)
    created_at = Column(DateTime, default=datetime.utcnow)

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    available_rd = Column(Float, default=0.0)
    escrow_rd = Column(Float, default=0.0)
    pending_rd = Column(Float, default=0.0)
    total_received_rd = Column(Float, default=0.0)
    total_spent_rd = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="wallet")

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    wallet_id = Column(String, ForeignKey("wallets.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False) # depósito, pago, comisión, liberación, retiro
    amount_rd = Column(Float, nullable=False)
    description = Column(String(255), nullable=False)
    reference = Column(String(100), nullable=False)
    status = Column(String(50), default="EXITOSO")
    created_at = Column(DateTime, default=datetime.utcnow)

class Escrow(Base):
    __tablename__ = "escrows"

    id = Column(String, primary_key=True, default=generate_uuid)
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    worker_id = Column(String, ForeignKey("users.id"), nullable=False)
    total_amount_rd = Column(Float, nullable=False)
    commission_rate_percent = Column(Float, default=8.0)
    commission_amount_rd = Column(Float, nullable=False)
    worker_payout_rd = Column(Float, nullable=False)
    status = Column(String(50), default="RETENIDO") # RETENIDO, LIBERADO, REEMBOLSADO, EN_DISPUTA
    created_at = Column(DateTime, default=datetime.utcnow)
    released_at = Column(DateTime, nullable=True)

class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, default=generate_uuid)
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    reviewer_id = Column(String, ForeignKey("users.id"), nullable=False)
    target_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)
    read = Column(Boolean, default=False)
    related_entity_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class VerificationDocument(Base):
    __tablename__ = "verification_documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    document_type = Column(String(50), nullable=False)
    document_url = Column(String(500), nullable=False)
    status = Column(Enum(VerificationStatusEnum), default=VerificationStatusEnum.PENDIENTE)
    notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(String, primary_key=True, default=generate_uuid)
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    opened_by_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    against_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    reason = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    evidence_urls = Column(JSON, default=[])
    status = Column(Enum(DisputeStatusEnum), default=DisputeStatusEnum.ABIERTA)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount_rd = Column(Float, nullable=False)
    bank_name = Column(String(100), nullable=False)
    account_type = Column(String(50), nullable=False)
    account_number = Column(String(50), nullable=False)
    account_holder_name = Column(String(150), nullable=False)
    account_holder_cedula = Column(String(20), nullable=False)
    status = Column(Enum(WithdrawalStatusEnum), default=WithdrawalStatusEnum.PENDIENTE)
    requested_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=False)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
