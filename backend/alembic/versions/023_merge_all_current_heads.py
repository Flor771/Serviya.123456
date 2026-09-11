"""Merge the two actual remaining Alembic heads into one canonical head."""
from typing import Sequence, Union

revision: str = "023_merge_all_current_heads"
down_revision: Union[str, tuple[str, str], None] = (
    "022_financial_schema_alignment",
    "012_escrow_fiscal_snapshot",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
