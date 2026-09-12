"""Reset SERVIYA transactional/user data while preserving admin access and static configuration.

This is a one-time test-environment cleanup migration. It intentionally removes
existing user-generated marketplace and financial records, but keeps ADMIN users
and platform configuration/catalog tables intact.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "028_clean_test_data"
down_revision: Union[str, None] = "027_contract_issue_on_escrow_create"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    # Remove user-generated/transactional records first, respecting the
    # foreign-key graph. Static catalog/configuration tables are preserved.
    cleanup_order = [
        "messages",
        "notifications",
        "password_reset_tokens",
        "policy_acceptances",
        "favorites",
        "reports",
        "support_tickets",
        "reviews",
        "warranty_revisits",
        "service_warranties",
        "service_work_status_history",
        "worker_bank_accounts",
        "worker_profiles",
        "professional_profiles",
        "portfolio_items",
        "verification_documents",
        "verifications",
        "applications",
        "job_applications",
        "proposals",
        "job_photos",
        "job_categories",
        "conversations",
        "disputes",
        "financial_movements",
        "wallet_transactions",
        "withdrawals",
        "payments",
        "transactions",
        "escrows",
        "digital_contracts",
        "contracts",
        "services",
        "jobs",
        "job_requests",
        "client_wallets",
        "wallets",
        "audit_logs",
        "admin_audit_logs",
    ]

    for table in cleanup_order:
        if table in tables:
            op.execute(sa.text(f'DELETE FROM "{table}"'))

    # Keep the administrative account(s) so the admin panel remains usable.
    # Remove every non-admin account and any unexpected user rows that do not
    # carry an administrative role.
    if "users" in tables:
        op.execute(
            sa.text(
                "DELETE FROM users "
                "WHERE COALESCE(UPPER(role), '') <> 'ADMIN' "
                "AND admin_role IS NULL"
            )
        )


def downgrade() -> None:
    # Data reset migrations are intentionally irreversible.
    pass
