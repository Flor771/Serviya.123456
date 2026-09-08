"""Ensure user columns and initial setup

Revision ID: 001_ensure_user_columns
Revises: 
Create Date: 2026-09-07 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.database.base import Base


# revision identifiers, used by Alembic.
revision: str = '001_ensure_user_columns'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    pass
