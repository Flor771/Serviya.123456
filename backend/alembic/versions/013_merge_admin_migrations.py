"""Merge the three active Alembic heads into one canonical SERVIYA head.

This migration is intentionally a no-op. The three parent revisions contain
schema changes already used by the application; this revision only joins their
history so Render can run ``alembic upgrade head`` deterministically.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "013_merge_admin_migrations"
down_revision: Union[str, Sequence[str], None] = (
    "012_admin_audit_logs",
    "012_profile_avatar_text",
    "012_repair_admin_role_schema",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
