"""Add bank-transfer voucher fields used by simulated Custodia SERVIYA payments."""
from alembic import op
import sqlalchemy as sa

revision = "014_escrow_voucher_fields"
down_revision = "013_service_completion_photos"
branch_labels = None
depends_on = None


def _columns(bind, table):
    return {c["name"] for c in sa.inspect(bind).get_columns(table)} if table in sa.inspect(bind).get_table_names() else set()


def upgrade():
    bind = op.get_bind()
    if "escrows" in sa.inspect(bind).get_table_names():
        cols = _columns(bind, "escrows")
        if "voucher_url" not in cols: op.add_column("escrows", sa.Column("voucher_url", sa.Text(), nullable=True))
        if "bank_account_id" not in cols: op.add_column("escrows", sa.Column("bank_account_id", sa.Integer(), nullable=True))
        if "payment_method" not in cols: op.add_column("escrows", sa.Column("payment_method", sa.String(50), nullable=True))
    if "transactions" in sa.inspect(bind).get_table_names():
        cols = _columns(bind, "transactions")
        if "voucher_url" not in cols: op.add_column("transactions", sa.Column("voucher_url", sa.Text(), nullable=True))
        if "bank_account_id" not in cols: op.add_column("transactions", sa.Column("bank_account_id", sa.Integer(), nullable=True))


def downgrade():
    bind = op.get_bind()
    if "transactions" in sa.inspect(bind).get_table_names():
        cols = _columns(bind, "transactions")
        if "bank_account_id" in cols: op.drop_column("transactions", "bank_account_id")
        if "voucher_url" in cols: op.drop_column("transactions", "voucher_url")
    if "escrows" in sa.inspect(bind).get_table_names():
        cols = _columns(bind, "escrows")
        if "payment_method" in cols: op.drop_column("escrows", "payment_method")
        if "bank_account_id" in cols: op.drop_column("escrows", "bank_account_id")
        if "voucher_url" in cols: op.drop_column("escrows", "voucher_url")
