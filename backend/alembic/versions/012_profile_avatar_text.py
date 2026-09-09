"""Allow profile photos to be stored without varchar truncation."""
from alembic import op
import sqlalchemy as sa

revision = "012_profile_avatar_text"
down_revision = "011_align_notifications_schema"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in inspector.get_table_names():
        return
    columns = {c["name"]: c for c in inspector.get_columns("users")}
    if "avatar_url" in columns:
        op.alter_column(
            "users", "avatar_url",
            existing_type=sa.String(length=500),
            type_=sa.Text(),
            existing_nullable=True,
        )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in inspector.get_table_names():
        return
    columns = {c["name"]: c for c in inspector.get_columns("users")}
    if "avatar_url" in columns:
        op.alter_column(
            "users", "avatar_url",
            existing_type=sa.Text(),
            type_=sa.String(length=500),
            existing_nullable=True,
        )
