"""Compatibility migration for databases that previously recorded this revision."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001_ensure_user_columns"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Kept as a compatibility bridge. The original schema work is now handled
    # by the canonical migration chain starting at 001_initial_schema.
    bind = op.get_bind()
    if "users" in sa.inspect(bind).get_table_names():
        return

def downgrade() -> None:
    pass
