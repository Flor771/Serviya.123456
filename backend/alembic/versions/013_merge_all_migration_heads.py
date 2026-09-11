"""Merge the actual Alembic heads into one final head."""
from typing import Sequence, Union
from alembic import op

revision: str = "013_merge_all_migration_heads"
down_revision: Union[str, tuple[str, str, str, str], None] = (
    "011_admin_roles",
    "011_align_notifications_schema",
    "011_wallet_transactions",
    "012_admin_audit_logs",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
