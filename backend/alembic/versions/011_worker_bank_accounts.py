"""Add persistent bank account details for workers and withdrawal traceability."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "011_worker_bank_accounts"
down_revision: Union[str, None] = "010_unique_service_reviews"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "worker_bank_accounts" not in tables:
        op.create_table(
            "worker_bank_accounts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("worker_id", sa.String(), sa.ForeignKey("users.id"), nullable=False, unique=True),
            sa.Column("bank_name", sa.String(100), nullable=False),
            sa.Column("account_type", sa.String(50), nullable=False),
            sa.Column("account_number", sa.String(100), nullable=False),
            sa.Column("account_holder_name", sa.String(200), nullable=False),
            sa.Column("account_holder_cedula", sa.String(50), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
    if "withdrawals" in tables:
        columns = {c["name"] for c in inspector.get_columns("withdrawals")}
        if "bank_account_id" not in columns:
            op.add_column("withdrawals", sa.Column("bank_account_id", sa.Integer(), nullable=True))
        if "account_holder_name" not in columns:
            op.add_column("withdrawals", sa.Column("account_holder_name", sa.String(200), nullable=True))
        if "account_holder_cedula" not in columns:
            op.add_column("withdrawals", sa.Column("account_holder_cedula", sa.String(50), nullable=True))
        if "reference_code" not in columns:
            op.add_column("withdrawals", sa.Column("reference_code", sa.String(100), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "withdrawals" in set(inspector.get_table_names()):
        columns = {c["name"] for c in inspector.get_columns("withdrawals")}
        for name in ["reference_code", "account_holder_cedula", "account_holder_name", "bank_account_id"]:
            if name in columns:
                op.drop_column("withdrawals", name)
    if "worker_bank_accounts" in set(inspector.get_table_names()):
        op.drop_table("worker_bank_accounts")
