"""Merge all Alembic branches currently present in SERVIYA.

The repository accumulated several independent migrations from parallel
feature work. Render runs `alembic upgrade head`, which requires exactly one
head. This revision is intentionally a no-op and only joins the existing
heads into a single migration graph without changing application data.
"""
from typing import Sequence, Union
from alembic import op

revision: str = "013_merge_all_migration_heads"
down_revision: Union[str, tuple[str, ...], None] = (
    "012_admin_audit_logs",
    "011_admin_roles",
    "011_align_notifications_schema",
    "012_merge_migration_heads",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
