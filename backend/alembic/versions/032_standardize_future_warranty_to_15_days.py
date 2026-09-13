"""Standardize all future SERVIYA warranties to 15 days."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "032_standardize_future_warranty"
down_revision: Union[str, None] = "031_recreate_process_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "service_warranties" in tables:
        bind.execute(sa.text("""
            CREATE OR REPLACE FUNCTION serviya_enforce_future_warranty_15_days()
            RETURNS trigger AS $$
            BEGIN
                NEW.coverage_days := 15;
                NEW.expires_at := COALESCE(NEW.activated_at, CURRENT_TIMESTAMP) + INTERVAL '15 days';
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """))
        bind.execute(sa.text("DROP TRIGGER IF EXISTS trg_serviya_future_warranty_15_days ON service_warranties"))
        bind.execute(sa.text("""
            CREATE TRIGGER trg_serviya_future_warranty_15_days
            BEFORE INSERT ON service_warranties
            FOR EACH ROW
            EXECUTE FUNCTION serviya_enforce_future_warranty_15_days()
        """))

    if "notifications" in tables:
        bind.execute(sa.text("""
            CREATE OR REPLACE FUNCTION serviya_fix_warranty_notification_15_days()
            RETURNS trigger AS $$
            BEGIN
                IF NEW.type = 'PAYMENT_ADMIN_APPROVED' AND NEW.message ILIKE '%60 días%' THEN
                    NEW.message := REPLACE(NEW.message, '60 días', '15 días');
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """))
        bind.execute(sa.text("DROP TRIGGER IF EXISTS trg_serviya_warranty_notification_15_days ON notifications"))
        bind.execute(sa.text("""
            CREATE TRIGGER trg_serviya_warranty_notification_15_days
            BEFORE INSERT ON notifications
            FOR EACH ROW
            EXECUTE FUNCTION serviya_fix_warranty_notification_15_days()
        """))


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DROP TRIGGER IF EXISTS trg_serviya_future_warranty_15_days ON service_warranties"))
    bind.execute(sa.text("DROP FUNCTION IF EXISTS serviya_enforce_future_warranty_15_days()"))
    bind.execute(sa.text("DROP TRIGGER IF EXISTS trg_serviya_warranty_notification_15_days ON notifications"))
    bind.execute(sa.text("DROP FUNCTION IF EXISTS serviya_fix_warranty_notification_15_days()"))
