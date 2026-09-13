"""Add persistent process confirmations and outcomes.

Revision ID: 007_persistent_process_events
Revises: 006_ensure_all_tables_exist
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '007_persistent_process_events'
down_revision: Union[str, None] = '006_ensure_all_tables_exist'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if 'process_events' not in tables:
        op.create_table(
            'process_events',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('process_type', sa.String(length=80), nullable=False, index=True),
            sa.Column('status', sa.String(length=30), nullable=False, index=True),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('next_step', sa.Text(), nullable=True),
            sa.Column('rejection_reason', sa.Text(), nullable=True),
            sa.Column('correction', sa.Text(), nullable=True),
            sa.Column('related_entity_id', sa.String(), nullable=True, index=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table('process_events')
