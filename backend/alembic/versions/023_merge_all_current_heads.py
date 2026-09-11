"""Merge all remaining Alembic heads into one canonical head.

This migration is intentionally empty. It only reconciles the historical
branches that were created independently so Render can safely run
``alembic upgrade head`` with a single head revision.
"""
from typing import Sequence, Union

revision: str = "023_merge_all_current_heads"
down_revision: Union[str, tuple[str, ...], None] = (
    "022_financial_schema_alignment",
    "012_profile_avatar_text",
    "012_verification_profile_sync",
    "012_escrow_fiscal_snapshot",
    "011_worker_bank_accounts",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
