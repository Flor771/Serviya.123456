"""add bank transfer voucher to escrow and transactions

Revision ID: 014_escrow_deposit_voucher
Revises: 013_service_completion_photos
"""
from alembic import op
import sqlalchemy as sa

revision = "014_escrow_deposit_voucher"
down_revision = "013_service_completion_photos"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if "escrows" in tables:
        cols = {c["name"] for c in inspector.get_columns("escrows")}
        if "voucher_url" not in cols:
            op.add_column("escrows", sa.Column("voucher_url", sa.Text(), nullable=True))
        if "bank_account_id" not in cols:
            op.add_column("escrows", sa.Column("bank_account_id", sa.Integer(), nullable=True))
        if "payment_method" not in cols:
            op.add_column("escrows", sa.Column("payment_method", sa.String(50), nullable=True))
    if "transactions" in tables:
        cols = {c["name"] for c in inspector.get_columns("transactions")}
        if "voucher_url" not in cols:
            op.add_column("transactions", sa.Column("voucher_url", sa.Text(), nullable=True))
        if "bank_account_id" not in cols:
            op.add_column("transactions", sa.Column("bank_account_id", sa.Integer(), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "transactions" in inspector.get_table_names():
        cols = {c["name"] for c in inspector.get_columns("transactions")}
        if "bank_account_id" in cols:
            op.drop_column("transactions", "bank_account_id")
        if "voucher_url" in cols:
            op.drop_column("transactions", "voucher_url")
    if "escrows" in inspector.get_table_names():
        cols = {c["name"] for c in inspector.get_columns("escrows")}
        if "payment_method" in cols:
            op.drop_column("escrows", "payment_method")
        if "bank_account_id" in cols:
            op.drop_column("escrows", "bank_account_id")
        if "voucher_url" in cols:
            op.drop_column("escrows", "voucher_url")
