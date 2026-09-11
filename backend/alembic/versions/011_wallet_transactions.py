"""Create the wallet transaction ledger used by custody releases.

Revision ID: 011_wallet_transactions
Revises: 010_unique_service_reviews
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "011_wallet_transactions"
down_revision: Union[str, None] = "010_unique_service_reviews"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "wallet_transactions" not in tables:
        op.create_table(
            "wallet_transactions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("wallet_id", sa.Integer(), sa.ForeignKey("wallets.id"), nullable=False),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("type", sa.String(length=50), nullable=False),
            sa.Column("amount_rd", sa.Float(), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=False),
            sa.Column("reference", sa.String(length=100), nullable=False),
            sa.Column("status", sa.String(length=50), server_default="EXITOSO"),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        )
        op.create_index("ix_wallet_transactions_reference", "wallet_transactions", ["reference"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "wallet_transactions" in inspector.get_table_names():
        op.drop_index("ix_wallet_transactions_reference", table_name="wallet_transactions")
        op.drop_table("wallet_transactions")
