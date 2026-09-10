"""Merge the remaining admin-role head and normalize legacy user roles.

Revision ID: 018_normalize_legacy_user_roles
Revises: 017_merge_admin_roles_head, 007_admin_roles_access
"""
from typing import Sequence, Union
from alembic import op

revision: str = "018_normalize_legacy_user_roles"
down_revision: Union[str, tuple[str, str], None] = (
    "017_merge_admin_roles_head",
    "007_admin_roles_access",
)
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
