"""Normalize legacy user roles so the admin panel can load all users safely.

Revision ID: 007_normalize_user_roles
Revises: 006_ensure_all_tables_exist
"""
from typing import Sequence, Union
from alembic import op

revision: str = "007_normalize_user_roles"
down_revision: Union[str, None] = "006_ensure_all_tables_exist"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE users SET role = 'CLIENTE', active_role = 'CLIENTE' WHERE role::text = 'CLIENT'")
    op.execute("UPDATE users SET role = 'TRABAJADOR', active_role = 'TRABAJADOR' WHERE role::text = 'WORKER'")
    op.execute("UPDATE users SET active_role = 'ADMIN' WHERE role::text = 'ADMIN'")
    op.execute("UPDATE users SET admin_role = 'SUPER_ADMIN' WHERE role::text = 'ADMIN' AND lower(email) = 'admin@serviya.do'")


def downgrade() -> None:
    pass
