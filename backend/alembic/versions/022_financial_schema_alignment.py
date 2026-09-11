"""Align financial schema and normalize active custody balances/commission."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "022_financial_schema_alignment"
down_revision: Union[str, None] = "021_merge_current_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "admin_audit_logs" in tables:
        cols = {c["name"]: c for c in inspector.get_columns("admin_audit_logs")}
        if "target_id" in cols and str(cols["target_id"]["type"]).lower() not in {"varchar", "text", "character varying"}:
            op.execute("ALTER TABLE admin_audit_logs ALTER COLUMN target_id TYPE VARCHAR(255) USING target_id::text")

    if "wallet_transactions" in tables:
        op.execute("ALTER TABLE wallet_transactions ALTER COLUMN id SET DEFAULT (gen_random_uuid()::text)")

    if "escrows" in tables:
        # SERVIYA's configured platform commission is 10%. Keep already released
        # historical escrows unchanged; normalize only money still in the flow.
        op.execute("""
            UPDATE escrows
            SET commission_rate_percent = 10.0,
                commission_amount_rd = ROUND(total_amount_rd * 0.10, 2),
                worker_payout_rd = ROUND(total_amount_rd * 0.90, 2)
            WHERE status IN ('PENDIENTE_VERIFICACION','RETENIDO','PENDIENTE_APROBACION','EN_DISPUTA')
        """)

        if "wallets" in tables:
            # Rebuild custody balances from the authoritative escrow ledger.
            op.execute("UPDATE wallets SET pending_custody_balance = 0")
            op.execute("""
                UPDATE wallets w
                SET pending_custody_balance = x.total_custody
                FROM (
                    SELECT worker_id, ROUND(SUM(total_amount_rd)::numeric, 2)::double precision AS total_custody
                    FROM escrows
                    WHERE status IN ('RETENIDO','PENDIENTE_APROBACION','EN_DISPUTA')
                    GROUP BY worker_id
                ) x
                WHERE w.worker_id = x.worker_id
            """)


def downgrade() -> None:
    # Financial data normalization is intentionally not reversed.
    pass
