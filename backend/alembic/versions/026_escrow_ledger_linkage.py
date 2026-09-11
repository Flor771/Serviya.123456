"""Link financial movements to escrow lifecycle and make them idempotent."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "026_escrow_ledger_linkage"
down_revision: Union[str, None] = "025_financial_ledger_integrity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "financial_movements" not in tables or "escrows" not in tables:
        return

    cols = {c["name"] for c in inspector.get_columns("financial_movements")}
    if "escrow_id" not in cols:
        op.add_column("financial_movements", sa.Column("escrow_id", sa.String(255), nullable=True))
    if "reference" not in cols:
        op.add_column("financial_movements", sa.Column("reference", sa.String(255), nullable=True))

    names = {i["name"] for i in inspector.get_indexes("financial_movements")}
    if "ix_financial_movements_escrow" not in names:
        op.create_index("ix_financial_movements_escrow", "financial_movements", ["escrow_id"])
    if "uq_financial_movements_reference" not in names:
        op.create_index(
            "uq_financial_movements_reference",
            "financial_movements",
            ["reference"],
            unique=True,
            postgresql_where=sa.text("reference IS NOT NULL"),
        )

    # Future escrow settlements automatically create the worker-side ledger
    # counterpart. Existing historical rows are intentionally preserved.
    op.execute("""
    CREATE OR REPLACE FUNCTION serviya_escrow_financial_ledger()
    RETURNS trigger AS $$
    DECLARE
        v_wallet_id BIGINT;
        v_amount DOUBLE PRECISION;
        v_reference VARCHAR(255);
        v_type VARCHAR(80);
    BEGIN
        IF NEW.status = OLD.status THEN
            RETURN NEW;
        END IF;

        SELECT id INTO v_wallet_id FROM wallets WHERE worker_id = NEW.worker_id FOR UPDATE;
        IF v_wallet_id IS NULL THEN
            RETURN NEW;
        END IF;

        IF NEW.status = 'RETENIDO' THEN
            v_amount := COALESCE(NEW.gross_service_amount_rd, NEW.total_amount_rd, 0);
            v_type := 'CUSTODIA_RETENIDA';
            v_reference := 'ESCROW-HOLD-' || NEW.id;
        ELSIF NEW.status = 'LIBERADO' THEN
            v_amount := COALESCE(NEW.net_worker_payout_rd, NEW.worker_payout_rd, 0);
            v_type := 'LIBERACION_ESCROW';
            v_reference := 'ESCROW-RELEASE-' || NEW.id;
        ELSIF NEW.status = 'REEMBOLSADO' THEN
            v_amount := -COALESCE(NEW.gross_service_amount_rd, NEW.total_amount_rd, 0);
            v_type := 'REEMBOLSO_ESCROW';
            v_reference := 'ESCROW-REFUND-' || NEW.id;
        ELSE
            RETURN NEW;
        END IF;

        INSERT INTO financial_movements
            (wallet_id, escrow_id, reference, movement_type, amount_dop, description, created_at)
        SELECT v_wallet_id, NEW.id, v_reference, v_type, v_amount,
               'Contrapartida automática del escrow ' || NEW.id,
               CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
            SELECT 1 FROM financial_movements WHERE reference = v_reference
        );

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    op.execute("DROP TRIGGER IF EXISTS trg_escrow_financial_ledger ON escrows")
    op.execute("""
    CREATE TRIGGER trg_escrow_financial_ledger
    AFTER UPDATE OF status ON escrows
    FOR EACH ROW
    EXECUTE FUNCTION serviya_escrow_financial_ledger();
    """)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "escrows" in tables:
        op.execute("DROP TRIGGER IF EXISTS trg_escrow_financial_ledger ON escrows")
        op.execute("DROP FUNCTION IF EXISTS serviya_escrow_financial_ledger()")
    if "financial_movements" in tables:
        names = {i["name"] for i in inspector.get_indexes("financial_movements")}
        if "uq_financial_movements_reference" in names:
            op.drop_index("uq_financial_movements_reference", table_name="financial_movements")
        if "ix_financial_movements_escrow" in names:
            op.drop_index("ix_financial_movements_escrow", table_name="financial_movements")
        cols = {c["name"] for c in inspector.get_columns("financial_movements")}
        if "reference" in cols:
            op.drop_column("financial_movements", "reference")
        if "escrow_id" in cols:
            op.drop_column("financial_movements", "escrow_id")
