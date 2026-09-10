"""Create persistent worker bank accounts and withdrawal trace fields on the live canonical head."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "019_worker_bank_accounts_trace"
down_revision: Union[str, None] = "018_normalize_legacy_user_roles"
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
        additions = [
            ("bank_account_id", sa.Integer(), None),
            ("account_holder_name", sa.String(200), None),
            ("account_holder_cedula", sa.String(50), None),
            ("reference_code", sa.String(100), None),
        ]
        for name, column_type, default in additions:
            if name not in columns:
                op.add_column("withdrawals", sa.Column(name, column_type, nullable=True, server_default=default))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "withdrawals" in inspector.get_table_names():
        columns = {c["name"] for c in inspector.get_columns("withdrawals")}
        for name in ["reference_code", "account_holder_cedula", "account_holder_name", "bank_account_id"]:
            if name in columns:
                op.drop_column("withdrawals", name)
    if "worker_bank_accounts" in inspector.get_table_names():
        op.drop_table("worker_bank_accounts")
