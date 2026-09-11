from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.services import router as services_router
from app.api.v1.applications import router as applications_router
from app.api.v1.contracts import router as contracts_router
from app.api.v1.wallet import router as wallet_router
from app.api.v1.payments import router as payments_router
from app.api.v1.client_funds import router as client_funds_router
from app.api.v1.negotiation import router as negotiation_router
from app.api.v1.completion import router as completion_router
from app.api.v1.warranty import router as warranty_router
from app.api.v1.payment_receipts import router as payment_receipts_router
from app.api.v1.disputes import router as disputes_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.messages import router as messages_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.verification import router as verification_router
from app.api.v1.portfolio_support import router as portfolio_support_router
from app.api.v1.admin import router as admin_router
from app.api.v1.admin_detailed import router as admin_detailed_router
from app.api.v1.admin_financial import router as admin_financial_router
from app.api.v1.admin_release import router as admin_release_router
from app.api.v1.admin_roles import router as admin_roles_router
from app.api.v1.admin_withdrawal_compat import router as admin_withdrawal_compat_router
from app.api.v1.admin_verification_compat import router as admin_verification_compat_router
from app.api.v1.admin_trace import router as admin_trace_router
from app.api.v1.admin_disputes import router as admin_disputes_router
from app.api.v1.worker_bank_account import router as worker_bank_account_router
from app.api.v1.work_status import router as work_status_router
api_router=APIRouter(prefix='/api/v1')
api_router.include_router(auth_router); api_router.include_router(users_router); api_router.include_router(services_router); api_router.include_router(applications_router); api_router.include_router(contracts_router); api_router.include_router(wallet_router); api_router.include_router(negotiation_router); api_router.include_router(completion_router); api_router.include_router(warranty_router); api_router.include_router(payment_receipts_router); api_router.include_router(payments_router); api_router.include_router(client_funds_router); api_router.include_router(disputes_router); api_router.include_router(notifications_router); api_router.include_router(messages_router); api_router.include_router(reviews_router); api_router.include_router(verification_router); api_router.include_router(portfolio_support_router); api_router.include_router(admin_withdrawal_compat_router); api_router.include_router(admin_router); api_router.include_router(admin_detailed_router); api_router.include_router(admin_financial_router); api_router.include_router(admin_release_router); api_router.include_router(admin_roles_router); api_router.include_router(admin_verification_compat_router); api_router.include_router(admin_trace_router); api_router.include_router(admin_disputes_router); api_router.include_router(worker_bank_account_router); api_router.include_router(work_status_router)
