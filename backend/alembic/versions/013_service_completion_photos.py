"""Store worker completion photos separately from client request photos."""
from alembic import op
import sqlalchemy as sa

revision = "013_service_completion_photos"
down_revision = "012_profile_avatar_text"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "services" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("services")}
    if "completion_photos" not in columns:
        op.add_column("services", sa.Column("completion_photos", sa.JSON(), nullable=True, server_default=sa.text("'[]'::json")))

def downgrade():
    bind = op.get_bind()
    if "services" not in sa.inspect(bind).get_table_names():
        return
    columns = {c["name"] for c in sa.inspect(bind).get_columns("services")}
    if "completion_photos" in columns:
        op.drop_column("services", "completion_photos")
