"""Merge the two existing Alembic heads into one.

This is a no-op merge revision. It allows Render's existing
`alembic upgrade head` command to upgrade both migration branches,
including the wallet transaction ledger required by custody release.
"""
from typing import Sequence, Union
from alembic import op

revision: str = "012_merge_migration_heads"
down_revision: Union[str, tuple[str, str], None] = (
    "007_align_moderation_schema",
    "011_wallet_transactions",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
