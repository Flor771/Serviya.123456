"""Add multi-administrator roles.

Revision ID: 011_admin_roles
Revises: 010_unique_service_reviews
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "011_admin_roles"
down_revision: Union[str, None] = "010_unique_service_reviews"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("users")}
    if "admin_role" not in columns:
        op.add_column("users", sa.Column("admin_role", sa.String(length=50), nullable=True))
    bind.execute(sa.text("UPDATE users SET admin_role = 'SUPER_ADMIN' WHERE role = 'ADMIN' AND admin_role IS NULL"))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("users")}
    if "admin_role" in columns:
        op.drop_column("users", "admin_role")
