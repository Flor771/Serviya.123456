"""Align notifications schema used by the backend.

The production table uses integer IDs and is_read, while older backend routes
use string UUID IDs plus read/related_entity_id. Keep both read flags during
migration and synchronize them so old and current routes remain compatible.
"""
from alembic import op
import sqlalchemy as sa

revision = "011_align_notifications_schema"
down_revision = "010_unique_service_reviews"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "notifications" not in inspector.get_table_names():
        return

    columns = {c["name"]: c for c in inspector.get_columns("notifications")}

    # The ORM model and older notification writers use string UUID ids.
    if columns.get("id", {}).get("type") is not None:
        id_type = str(columns["id"]["type"]).lower()
        if "integer" in id_type or "bigint" in id_type:
            op.alter_column(
                "notifications", "id",
                existing_type=sa.Integer(),
                type_=sa.String(),
                postgresql_using="id::text",
                existing_nullable=False,
            )

    columns = {c["name"] for c in sa.inspect(bind).get_columns("notifications")}
    if "read" not in columns:
        op.add_column("notifications", sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    if "related_entity_id" not in columns:
        op.add_column("notifications", sa.Column("related_entity_id", sa.String(), nullable=True))

    # Synchronize the legacy is_read field with the ORM's read field.
    op.execute(sa.text("UPDATE notifications SET read = COALESCE(is_read, false)"))
    op.execute(sa.text("""
        CREATE OR REPLACE FUNCTION sync_notification_read_flags()
        RETURNS trigger AS $$
        BEGIN
            IF NEW.read IS DISTINCT FROM OLD.read THEN
                NEW.is_read := NEW.read;
            ELSE
                NEW.read := COALESCE(NEW.is_read, false);
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """))
    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_sync_notification_read_flags ON notifications"))
    op.execute(sa.text("""
        CREATE TRIGGER trg_sync_notification_read_flags
        BEFORE INSERT OR UPDATE ON notifications
        FOR EACH ROW EXECUTE FUNCTION sync_notification_read_flags()
    """))


def downgrade():
    bind = op.get_bind()
    if "notifications" not in sa.inspect(bind).get_table_names():
        return
    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_sync_notification_read_flags ON notifications"))
    op.execute(sa.text("DROP FUNCTION IF EXISTS sync_notification_read_flags()"))
    columns = {c["name"] for c in sa.inspect(bind).get_columns("notifications")}
    if "related_entity_id" in columns:
        op.drop_column("notifications", "related_entity_id")
    if "read" in columns:
        op.drop_column("notifications", "read")
