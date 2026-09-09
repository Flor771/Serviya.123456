"""Add client wallet balances for deposits and refunds.

Revision ID: 009_client_wallets
Revises: 008_password_reset_tokens
"""
from alembic import op
import sqlalchemy as sa

revision = "009_client_wallets"
down_revision = "008_password_reset_tokens"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "client_wallets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.String(), nullable=False),
        sa.Column("available_balance", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("total_deposited", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("total_spent", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("total_refunded", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("client_id", name="uq_client_wallets_client_id"),
    )
    op.create_index("ix_client_wallets_client_id", "client_wallets", ["client_id"], unique=True)


def downgrade():
    op.drop_index("ix_client_wallets_client_id", table_name="client_wallets")
    op.drop_table("client_wallets")
