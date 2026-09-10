"""Add administrative roles and designate the configured super administrator.

Revision ID: 007_admin_roles_access
Revises: 008_password_reset_tokens
"""
import os
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "007_admin_roles_access"
down_revision: Union[str, None] = "008_password_reset_tokens"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "users" not in tables:
        return

    columns = {c["name"] for c in inspector.get_columns("users")}
    if "admin_role" not in columns:
        op.add_column("users", sa.Column("admin_role", sa.String(length=50), nullable=True))
        op.create_index("ix_users_admin_role", "users", ["admin_role"], unique=False)

    op.execute("UPDATE users SET admin_role = 'ADMIN_OPERACIONES' WHERE role = 'ADMIN' AND (admin_role IS NULL OR admin_role = '')")
    superadmin_email = (os.getenv("SUPERADMIN_EMAIL") or os.getenv("ADMIN_EMAIL") or "admin@serviya.do").strip().lower()
    op.execute(sa.text("UPDATE users SET admin_role = 'SUPER_ADMIN', active_role = 'ADMIN', is_active = TRUE, is_verified = TRUE WHERE role = 'ADMIN' AND lower(email) = :email").bindparams(email=superadmin_email))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("users")}
    if "admin_role" in columns:
        try:
            op.drop_index("ix_users_admin_role", table_name="users")
        except Exception:
            pass
        op.drop_column("users", "admin_role")
