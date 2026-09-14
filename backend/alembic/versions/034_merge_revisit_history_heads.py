"""Merge Alembic heads after warranty revisit history.

Revision ID: 034_merge_revisit_history_heads
Revises: 033_full_worker_verification, 033_revisit_history
"""
from typing import Sequence, Union
from alembic import op

revision: str = "034_merge_revisit_history_heads"
down_revision: Union[str, Sequence[str], None] = (
    "033_full_worker_verification",
    "033_revisit_history",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
