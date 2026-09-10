"""Normalize legacy user roles that break SQLAlchemy enum loading.

Revision ID: 018_normalize_legacy_user_roles
Revises: 017_merge_admin_roles_head
"""
from typing import Sequence, Union
from alembic import op

revision: str = "018_normalize_legacy_user_roles"
down_revision: Union[str, None] = "017_merge_admin_roles_head"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Production contains legacy enum values CLIENT and WORKER. The current
    # SQLAlchemy model only accepts CLIENTE and TRABAJADOR, so normalize them.
    op.execute("UPDATE users SET role = 'CLIENTE', active_role = 'CLIENTE' WHERE role::text = 'CLIENT'")
    op.execute("UPDATE users SET role = 'TRABAJADOR', active_role = 'TRABAJADOR' WHERE role::text = 'WORKER'")
    op.execute("UPDATE users SET active_role = 'ADMIN' WHERE role::text = 'ADMIN'")


def downgrade() -> None:
    pass
