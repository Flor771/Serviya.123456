"""Add private map location fields to services."""
from alembic import op
import sqlalchemy as sa

revision = "036_service_locations"
down_revision = "035_security_hardening"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("services")}
    additions = [
        ("location_lat", sa.Float(), True),
        ("location_lng", sa.Float(), True),
        ("location_address", sa.String(500), True),
    ]
    for name, typ, nullable in additions:
        if name not in cols:
            op.add_column("services", sa.Column(name, typ, nullable=nullable))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("services")}
    for name in ("location_address", "location_lng", "location_lat"):
        if name in cols:
            op.drop_column("services", name)
