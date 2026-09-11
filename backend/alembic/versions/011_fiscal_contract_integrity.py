"""Prepare SERVIYA fiscal traceability and lock signed contracts at DB level."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "011_fiscal_contract_integrity"
down_revision: Union[str, None] = "010_unique_service_reviews"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_column_if_missing(bind, table: str, column: sa.Column) -> None:
    inspector = sa.inspect(bind)
    existing = {c["name"] for c in inspector.get_columns(table)} if table in inspector.get_table_names() else set()
    if column.name not in existing:
        op.add_column(table, column)


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())

    if "worker_profiles" in tables:
        _add_column_if_missing(bind, "worker_profiles", sa.Column("rnc", sa.String(length=20), nullable=True))
        _add_column_if_missing(bind, "worker_profiles", sa.Column("fiscal_status", sa.String(length=40), server_default="PENDIENTE"))
        _add_column_if_missing(bind, "worker_profiles", sa.Column("fiscal_service_type", sa.String(length=40), server_default="POR_CLASIFICAR"))

    if "escrows" in tables:
        _add_column_if_missing(bind, "escrows", sa.Column("gross_service_amount_rd", sa.Float(), nullable=True))
        _add_column_if_missing(bind, "escrows", sa.Column("platform_commission_rd", sa.Float(), nullable=True))
        _add_column_if_missing(bind, "escrows", sa.Column("isr_withheld_rd", sa.Float(), server_default="0"))
        _add_column_if_missing(bind, "escrows", sa.Column("itbis_withheld_rd", sa.Float(), server_default="0"))
        _add_column_if_missing(bind, "escrows", sa.Column("net_worker_payout_rd", sa.Float(), nullable=True))
        _add_column_if_missing(bind, "escrows", sa.Column("fiscal_rule_code", sa.String(length=60), server_default="PENDIENTE_CLASIFICACION"))
        _add_column_if_missing(bind, "escrows", sa.Column("tax_mode", sa.String(length=30), server_default="CONFIGURACION"))
        _add_column_if_missing(bind, "escrows", sa.Column("tax_calculated_at", sa.DateTime(), nullable=True))
        op.execute(sa.text("ALTER TABLE escrows ALTER COLUMN commission_rate_percent SET DEFAULT 10.0"))

    if "digital_contracts" in tables:
        _add_column_if_missing(bind, "digital_contracts", sa.Column("locked_at", sa.DateTime(), nullable=True))
        op.execute(sa.text("""
            CREATE OR REPLACE FUNCTION serviya_prevent_locked_contract_mutation()
            RETURNS trigger AS $$
            BEGIN
                IF OLD.locked_at IS NOT NULL THEN
                    RAISE EXCEPTION 'SERVIYA: el contrato digital bloqueado no puede modificarse ni eliminarse';
                END IF;
                RETURN OLD;
            END;
            $$ LANGUAGE plpgsql;
        """))
        op.execute(sa.text("DROP TRIGGER IF EXISTS trg_serviya_locked_contract_update ON digital_contracts"))
        op.execute(sa.text("DROP TRIGGER IF EXISTS trg_serviya_locked_contract_delete ON digital_contracts"))
        op.execute(sa.text("""
            CREATE TRIGGER trg_serviya_locked_contract_update
            BEFORE UPDATE ON digital_contracts
            FOR EACH ROW EXECUTE FUNCTION serviya_prevent_locked_contract_mutation();
        """))
        op.execute(sa.text("""
            CREATE TRIGGER trg_serviya_locked_contract_delete
            BEFORE DELETE ON digital_contracts
            FOR EACH ROW EXECUTE FUNCTION serviya_prevent_locked_contract_mutation();
        """))
    else:
        op.execute(sa.text("""
            CREATE TABLE IF NOT EXISTS digital_contracts (
                id TEXT PRIMARY KEY,
                service_id TEXT NOT NULL UNIQUE,
                escrow_id TEXT NOT NULL,
                contract_number VARCHAR(80) NOT NULL UNIQUE,
                version INTEGER NOT NULL DEFAULT 1,
                status VARCHAR(40) NOT NULL DEFAULT 'EMITIDO',
                content_json JSONB NOT NULL,
                content_text TEXT NOT NULL,
                content_hash VARCHAR(64) NOT NULL,
                generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                generated_by_admin TEXT NOT NULL,
                client_accepted_at TIMESTAMP NULL,
                worker_accepted_at TIMESTAMP NULL,
                client_acceptance_ip VARCHAR(100) NULL,
                worker_acceptance_ip VARCHAR(100) NULL,
                client_user_agent TEXT NULL,
                worker_user_agent TEXT NULL,
                client_acceptance_hash VARCHAR(64) NULL,
                worker_acceptance_hash VARCHAR(64) NULL,
                locked_at TIMESTAMP NULL
            )
        """))
        op.execute(sa.text("""
            CREATE OR REPLACE FUNCTION serviya_prevent_locked_contract_mutation()
            RETURNS trigger AS $$
            BEGIN
                IF OLD.locked_at IS NOT NULL THEN
                    RAISE EXCEPTION 'SERVIYA: el contrato digital bloqueado no puede modificarse ni eliminarse';
                END IF;
                RETURN OLD;
            END;
            $$ LANGUAGE plpgsql;
        """))
        op.execute(sa.text("""
            CREATE TRIGGER trg_serviya_locked_contract_update
            BEFORE UPDATE ON digital_contracts
            FOR EACH ROW EXECUTE FUNCTION serviya_prevent_locked_contract_mutation();
        """))
        op.execute(sa.text("""
            CREATE TRIGGER trg_serviya_locked_contract_delete
            BEFORE DELETE ON digital_contracts
            FOR EACH ROW EXECUTE FUNCTION serviya_prevent_locked_contract_mutation();
        """))

    # Keep fiscal calculation explicitly inactive until the applicable rule is classified.
    if "escrows" in tables:
        op.execute(sa.text("""
            UPDATE escrows
            SET gross_service_amount_rd = COALESCE(gross_service_amount_rd, total_amount_rd),
                platform_commission_rd = COALESCE(platform_commission_rd, commission_amount_rd),
                net_worker_payout_rd = COALESCE(net_worker_payout_rd, worker_payout_rd),
                isr_withheld_rd = COALESCE(isr_withheld_rd, 0),
                itbis_withheld_rd = COALESCE(itbis_withheld_rd, 0),
                fiscal_rule_code = COALESCE(fiscal_rule_code, 'PENDIENTE_CLASIFICACION'),
                tax_mode = COALESCE(tax_mode, 'CONFIGURACION')
        """))


def downgrade() -> None:
    # Intentionally conservative: financial/audit history is not destructively removed.
    pass
