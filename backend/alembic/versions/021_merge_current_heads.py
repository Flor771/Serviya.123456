"""Merge the remaining Alembic heads into one canonical head."""
from typing import Sequence, Union

revision: str = "021_merge_current_heads"
down_revision: Union[str, tuple[str, str], None] = (
    "013_merge_all_migration_heads",
    "020_service_work_status_history",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
