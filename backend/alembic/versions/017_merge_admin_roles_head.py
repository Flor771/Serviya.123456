"""Merge the administrator-role schema branch with the main migration branch.

Revision ID: 017_merge_admin_roles_head
Revises: 012_repair_admin_role_schema, 016_msg_service_compat
"""
from typing import Sequence, Union

revision: str = "017_merge_admin_roles_head"
down_revision: Union[str, tuple[str, str], None] = (
    "012_repair_admin_role_schema",
    "016_msg_service_compat",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
