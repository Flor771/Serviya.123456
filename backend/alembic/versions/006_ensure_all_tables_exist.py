"""Ensure all model tables exist in database

Revision ID: 006_ensure_all_tables_exist
Revises: 005_sync_password_hash_column
Create Date: 2026-09-09 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.database.base import Base

revision: str = '006_ensure_all_tables_exist'
down_revision: Union[str, None] = '005_sync_password_hash_column'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)

def downgrade() -> None:
    pass
