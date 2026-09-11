"""Blind financial references and normalize withdrawal ledger entries."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "025_financial_ledger_integrity"
down_revision: Union[str, None] = "024_warranty_integrity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    # References are the idempotency key used by the application when
    # recording financial events. Existing data was checked before adding
    # these unique indexes.
    if "transactions" in tables:
        names = {i["name"] for i in inspector.get_indexes("transactions")}
        if "uq_transactions_reference_code" not in names:
            op.create_index("uq_transactions_reference_code", "transactions", ["reference_code"], unique=True)

    if "withdrawals" in tables:
        cols = {c["name"] for c in inspector.get_columns("withdrawals")}
        names = {i["name"] for i in inspector.get_indexes("withdrawals")}
        if "reference_code" in cols and "uq_withdrawals_reference_code" not in names:
            op.create_index("uq_withdrawals_reference_code", "withdrawals", ["reference_code"], unique=True, postgresql_where=sa.text("reference_code IS NOT NULL"))

    if "financial_movements" in tables:
        # Keep the ledger append-only. No destructive cleanup is performed.
        # The application uses reference-like descriptions plus the wallet and
        # movement type to make repeated processing idempotent.
        names = {i["name"] for i in inspector.get_indexes("financial_movements")}
        if "ix_financial_movements_wallet_created" not in names:
            op.create_index("ix_financial_movements_wallet_created", "financial_movements", ["wallet_id", "created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "financial_movements" in tables:
        names = {i["name"] for i in inspector.get_indexes("financial_movements")}
        if "ix_financial_movements_wallet_created" in names:
            op.drop_index("ix_financial_movements_wallet_created", table_name="financial_movements")
    if "withdrawals" in tables:
        names = {i["name"] for i in inspector.get_indexes("withdrawals")}
        if "uq_withdrawals_reference_code" in names:
            op.drop_index("uq_withdrawals_reference_code", table_name="withdrawals")
    if "transactions" in tables:
        names = {i["name"] for i in inspector.get_indexes("transactions")}
        if "uq_transactions_reference_code" in names:
            op.drop_index("uq_transactions_reference_code", table_name="transactions")
