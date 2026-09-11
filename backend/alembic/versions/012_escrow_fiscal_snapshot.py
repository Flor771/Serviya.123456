"""Keep an auditable fiscal snapshot on escrow without hardcoding tax withholding."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "012_escrow_fiscal_snapshot"
down_revision: Union[str, None] = "011_fiscal_contract_integrity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "escrows" not in tables:
        return

    op.execute(sa.text("""
        CREATE OR REPLACE FUNCTION serviya_snapshot_escrow_fiscal_state()
        RETURNS trigger AS $$
        BEGIN
            IF NEW.status IN ('RETENIDO','PENDIENTE_APROBACION','LIBERADO','REEMBOLSADO','DISPUTADO') THEN
                NEW.gross_service_amount_rd := COALESCE(NEW.gross_service_amount_rd, NEW.total_amount_rd);
                NEW.platform_commission_rd := COALESCE(NEW.platform_commission_rd, NEW.commission_amount_rd);
                NEW.net_worker_payout_rd := COALESCE(NEW.net_worker_payout_rd, NEW.worker_payout_rd);
                NEW.isr_withheld_rd := COALESCE(NEW.isr_withheld_rd, 0);
                NEW.itbis_withheld_rd := COALESCE(NEW.itbis_withheld_rd, 0);
                NEW.fiscal_rule_code := COALESCE(NEW.fiscal_rule_code, 'PENDIENTE_CLASIFICACION');
                NEW.tax_mode := COALESCE(NEW.tax_mode, 'CONFIGURACION');
                NEW.tax_calculated_at := COALESCE(NEW.tax_calculated_at, CURRENT_TIMESTAMP);
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """))
    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_serviya_snapshot_escrow_fiscal_state ON escrows"))
    op.execute(sa.text("""
        CREATE TRIGGER trg_serviya_snapshot_escrow_fiscal_state
        BEFORE INSERT OR UPDATE OF status,total_amount_rd,commission_amount_rd,worker_payout_rd
        ON escrows
        FOR EACH ROW EXECUTE FUNCTION serviya_snapshot_escrow_fiscal_state();
    """))

    op.execute(sa.text("""
        UPDATE escrows
        SET gross_service_amount_rd = COALESCE(gross_service_amount_rd, total_amount_rd),
            platform_commission_rd = COALESCE(platform_commission_rd, commission_amount_rd),
            net_worker_payout_rd = COALESCE(net_worker_payout_rd, worker_payout_rd),
            isr_withheld_rd = COALESCE(isr_withheld_rd, 0),
            itbis_withheld_rd = COALESCE(itbis_withheld_rd, 0),
            fiscal_rule_code = COALESCE(fiscal_rule_code, 'PENDIENTE_CLASIFICACION'),
            tax_mode = COALESCE(tax_mode, 'CONFIGURACION'),
            tax_calculated_at = COALESCE(tax_calculated_at, CURRENT_TIMESTAMP)
    """))


def downgrade() -> None:
    bind = op.get_bind()
    if "escrows" in set(sa.inspect(bind).get_table_names()):
        op.execute(sa.text("DROP TRIGGER IF EXISTS trg_serviya_snapshot_escrow_fiscal_state ON escrows"))
        op.execute(sa.text("DROP FUNCTION IF EXISTS serviya_snapshot_escrow_fiscal_state()"))
