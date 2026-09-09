import enum
import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database.database import Base

def generate_uuid(): return str(uuid.uuid4())
class UserRoleEnum(str, enum.Enum): CLIENTE="CLIENTE"; TRABAJADOR="TRABAJADOR"; ADMIN="ADMIN"
class ServiceStatusEnum(str, enum.Enum): PUBLICADA="PUBLICADA"; RECIBIENDO_POSTULACIONES="RECIBIENDO_POSTULACIONES"; TRABAJADOR_SELECCIONADO="TRABAJADOR_SELECCIONADO"; EN_PROGRESO="EN_PROGRESO"; COMPLETADA="COMPLETADA"; CANCELADA="CANCELADA"; EN_DISPUTA="EN_DISPUTA"
class ApplicationStatusEnum(str, enum.Enum): PENDIENTE="PENDIENTE"; SELECCIONADO="SELECCIONADO"; RECHAZADO="RECHAZADO"
class VerificationStatusEnum(str, enum.Enum): SIN_VERIFICAR="SIN_VERIFICAR"; PENDIENTE="PENDIENTE"; VERIFICADO="VERIFICADO"; RECHAZADO="RECHAZADO"
class DisputeStatusEnum(str, enum.Enum): ABIERTA="ABIERTA"; EN_REVISION="EN_REVISION"; RESUELTA="RESUELTA"; CERRADA="CERRADA"
class WithdrawalStatusEnum(str, enum.Enum): PENDIENTE="PENDIENTE"; PROCESANDO="PROCESANDO"; COMPLETADO="COMPLETADO"; RECHAZADO="RECHAZADO"
class User(Base):
 __tablename__="users"; id=Column(String,primary_key=True,default=generate_uuid); first_name=Column(String(100),nullable=False); last_name=Column(String(100),nullable=False); email=Column(String(255),unique=True,index=True,nullable=False); phone=Column(String(50),nullable=False); cedula=Column(String(20)); password_hash=Column(String(255),nullable=False)
 @property
 def hashed_password(self): return self.password_hash
 @hashed_password.setter
 def hashed_password(self,v): self.password_hash=v
 role=Column(Enum(UserRoleEnum),default=UserRoleEnum.CLIENTE); active_role=Column(String(20),default="CLIENTE"); province=Column(String(100),nullable=False,default="Distrito Nacional"); municipality=Column(String(100),nullable=False,default="Santo Domingo de Guzmán (DN)"); bio=Column(Text); avatar_url=Column(Text); is_active=Column(Boolean,default=True,nullable=True); is_verified=Column(Boolean,default=False); rating=Column(Float,default=5.0); jobs_completed=Column(Integer,default=0); created_at=Column(DateTime,default=datetime.utcnow); worker_profile=relationship("WorkerProfile",back_populates="user",uselist=False); wallet=relationship("Wallet",back_populates="worker",uselist=False,foreign_keys="Wallet.worker_id")
class WorkerProfile(Base):
 __tablename__="worker_profiles"; id=Column(Integer,primary_key=True,autoincrement=True); user_id=Column(String,ForeignKey("users.id"),nullable=False,unique=True); cedula=Column(String(20)); bio=Column(Text); specialties=Column(String(255)); has_infotep=Column(Boolean,default=False); rating=Column(Float,default=5.0); review_count=Column(Integer,default=0); hourly_rate=Column(Float); availability=Column(String(50)); is_approved=Column(Boolean,default=False); cedula_front_url=Column(String(500)); cedula_back_url=Column(String(500)); selfie_url=Column(String(500)); certificate_url=Column(String(500)); user=relationship("User",back_populates="worker_profile")
 @property
 def profession(self): return self.specialties
 @profession.setter
 def profession(self,v): self.specialties=v
 @property
 def hourly_rate_rd(self): return self.hourly_rate
 @hourly_rate_rd.setter
 def hourly_rate_rd(self,v): self.hourly_rate=v
 @property
 def experience_years(self): return 1
class Category(Base):
 __tablename__="categories"; id=Column(String,primary_key=True,default=generate_uuid); name=Column(String(100),unique=True,nullable=False); slug=Column(String(100),unique=True,nullable=False); icon=Column(String(50),nullable=False,default="Wrench"); description=Column(Text); subcategories=Column(JSON,default=[])
class Service(Base):
 __tablename__="services"; id=Column(String,primary_key=True,default=generate_uuid); title=Column(String(200),nullable=False); description=Column(Text,nullable=False); category_id=Column(String); category_name=Column(String(100),nullable=False); subcategory=Column(String(100)); price_rd=Column(Float,nullable=False); province=Column(String(100),nullable=False); municipality=Column(String(100),nullable=False); address_approx=Column(String(255)); service_date=Column(String(50),nullable=False); service_time=Column(String(50),nullable=False); estimated_duration=Column(String(50)); images=Column(JSON,default=[]); requirements=Column(JSON,default=[]); completion_photos=Column(JSON,default=[]); payment_type=Column(String(50),default="CUSTODIA_SERVIYA"); negotiated_price_rd=Column(Float); negotiation_status=Column(String(40),default="PENDIENTE"); negotiation_offer_rd=Column(Float); negotiation_offer_by=Column(String(255)); negotiation_offer_note=Column(Text); price_agreed_at=Column(DateTime); completion_submitted=Column(Boolean,default=False); completion_summary=Column(Text); completion_submitted_at=Column(DateTime); status=Column(Enum(ServiceStatusEnum),default=ServiceStatusEnum.PUBLICADA); client_id=Column(String,ForeignKey("users.id"),nullable=False); worker_id=Column(String,ForeignKey("users.id")); created_at=Column(DateTime,default=datetime.utcnow)
class Application(Base):
 __tablename__="applications"; id=Column(String,primary_key=True,default=generate_uuid); service_id=Column(String,ForeignKey("services.id"),nullable=False); worker_id=Column(String,ForeignKey("users.id"),nullable=False); message=Column(Text,nullable=False); offered_price_rd=Column(Float,nullable=False); availability_note=Column(String(255)); status=Column(Enum(ApplicationStatusEnum),default=ApplicationStatusEnum.PENDIENTE); created_at=Column(DateTime,default=datetime.utcnow)
class Wallet(Base):
 __tablename__="wallets"; id=Column(Integer,primary_key=True,autoincrement=True); worker_id=Column(String,ForeignKey("users.id"),nullable=False,unique=True); available_balance=Column(Float,default=0.0); pending_custody_balance=Column(Float,default=0.0); total_earnings=Column(Float,default=0.0); total_commissions=Column(Float,default=0.0); total_withdrawn=Column(Float,default=0.0); worker=relationship("User",back_populates="wallet",foreign_keys=[worker_id])
 @property
 def user(self): return self.worker
 @property
 def user_id(self): return self.worker_id
 @user_id.setter
 def user_id(self,v): self.worker_id=v
 @property
 def available_rd(self): return self.available_balance
 @available_rd.setter
 def available_rd(self,v): self.available_balance=v
 @property
 def escrow_rd(self): return self.pending_custody_balance
 @escrow_rd.setter
 def escrow_rd(self,v): self.pending_custody_balance=v
 @property
 def pending_rd(self): return self.pending_custody_balance
 @pending_rd.setter
 def pending_rd(self,v): self.pending_custody_balance=v
 @property
 def total_received_rd(self): return self.total_earnings
 @property
 def total_spent_rd(self): return self.total_withdrawn
class WalletTransaction(Base):
 __tablename__="wallet_transactions"; id=Column(String,primary_key=True,default=generate_uuid); wallet_id=Column(String,ForeignKey("wallets.id"),nullable=False); user_id=Column(String,ForeignKey("users.id"),nullable=False); type=Column(String(50),nullable=False); amount_rd=Column(Float,nullable=False); description=Column(String(255),nullable=False); reference=Column(String(100),nullable=False); status=Column(String(50),default="EXITOSO"); created_at=Column(DateTime,default=datetime.utcnow)
class BankAccount(Base):
 __tablename__="bank_accounts"; id=Column(Integer,primary_key=True,autoincrement=True); bank_name=Column(String(100),nullable=False); account_number=Column(String(100),nullable=False); account_type=Column(String(50),nullable=False); account_holder=Column(String(200),nullable=False); rnc_cedula=Column(String(50)); is_active=Column(Boolean,default=True); is_primary=Column(Boolean,default=False)
class Escrow(Base):
 __tablename__="escrows"; id=Column(String,primary_key=True,default=generate_uuid); service_id=Column(String,ForeignKey("services.id"),nullable=False); client_id=Column(String,ForeignKey("users.id"),nullable=False); worker_id=Column(String,ForeignKey("users.id"),nullable=False); total_amount_rd=Column(Float,nullable=False); commission_rate_percent=Column(Float,default=8.0); commission_amount_rd=Column(Float,nullable=False); worker_payout_rd=Column(Float,nullable=False); status=Column(String(50),default="RETENIDO"); voucher_url=Column(Text); bank_account_id=Column(Integer); payment_method=Column(String(50)); release_otp=Column(String(10)); otp_verified=Column(Boolean,default=False); created_at=Column(DateTime,default=datetime.utcnow); released_at=Column(DateTime)
class Review(Base):
 __tablename__="reviews"; id=Column(String,primary_key=True,default=generate_uuid); service_id=Column(String,ForeignKey("services.id"),nullable=False); reviewer_id=Column(String,ForeignKey("users.id"),nullable=False); target_user_id=Column(String,ForeignKey("users.id"),nullable=False); rating=Column(Integer,nullable=False); comment=Column(Text,nullable=False); created_at=Column(DateTime,default=datetime.utcnow)
class Notification(Base):
 __tablename__="notifications"; id=Column(String,primary_key=True,default=generate_uuid); user_id=Column(String,ForeignKey("users.id"),nullable=False); title=Column(String(200),nullable=False); message=Column(Text,nullable=False); type=Column(String(50),nullable=False); read=Column(Boolean,default=False); created_at=Column(DateTime,default=datetime.utcnow)
class Message(Base):
 __tablename__="messages"; id=Column(String,primary_key=True,default=generate_uuid); service_id=Column(String,ForeignKey("services.id"),nullable=False); sender_id=Column(String,ForeignKey("users.id"),nullable=False); receiver_id=Column(String,ForeignKey("users.id"),nullable=False); content=Column(Text,nullable=False); created_at=Column(DateTime,default=datetime.utcnow)
class VerificationDocument(Base):
 __tablename__="verification_documents"; id=Column(String,primary_key=True,default=generate_uuid); user_id=Column(String,ForeignKey("users.id"),nullable=False); document_type=Column(String(50),nullable=False); document_url=Column(String(500),nullable=False); status=Column(Enum(VerificationStatusEnum),default=VerificationStatusEnum.PENDIENTE); notes=Column(Text); submitted_at=Column(DateTime,default=datetime.utcnow)
class Dispute(Base):
 __tablename__="disputes"; id=Column(String,primary_key=True,default=generate_uuid); service_id=Column(String,ForeignKey("services.id"),nullable=False); opened_by_user_id=Column(String,ForeignKey("users.id"),nullable=False); against_user_id=Column(String,ForeignKey("users.id"),nullable=False); reason=Column(String(200),nullable=False); description=Column(Text,nullable=False); evidence_urls=Column(JSON,default=[]); status=Column(Enum(DisputeStatusEnum),default=DisputeStatusEnum.ABIERTA); resolution_notes=Column(Text); created_at=Column(DateTime,default=datetime.utcnow)
class Withdrawal(Base):
 __tablename__="withdrawals"; id=Column(Integer,primary_key=True,autoincrement=True); worker_id=Column(String,ForeignKey("users.id"),nullable=False); amount=Column(Float,nullable=False); method=Column(String(100),nullable=False); account_number=Column(String(100),nullable=False); account_type=Column(String(50),nullable=False); status=Column(String(50),default="PENDIENTE"); created_at=Column(DateTime,default=datetime.utcnow)
class AuditLog(Base):
 __tablename__="audit_logs"; id=Column(Integer,primary_key=True,autoincrement=True); admin_id=Column(String,nullable=False); action=Column(String,nullable=False); entity_type=Column(String,nullable=False); entity_id=Column(Integer,nullable=True); details=Column(Text,nullable=True); created_at=Column(DateTime,default=datetime.utcnow)
