"""Ensure the persistent process history table exists on the canonical production head.

Some production databases reached the merged Alembic head without the
process_events table even though the persistent-process migration is part of
the historical graph. This idempotent repair recreates only the missing table.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "031_recreate_process_events"
down_revision: Union[str, None] = "030_withdrawal_admin_alerts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "process_events" not in inspector.get_table_names():
        op.create_table(
            "process_events",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("process_type", sa.String(length=80), nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("next_step", sa.Text(), nullable=True),
            sa.Column("rejection_reason", sa.Text(), nullable=True),
            sa.Column("correction", sa.Text(), nullable=True),
            sa.Column("related_entity_id", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_process_events_user_id", "process_events", ["user_id"])
        op.create_index("ix_process_events_process_type", "process_events", ["process_type"])
        op.create_index("ix_process_events_status", "process_events", ["status"])
        op.create_index("ix_process_events_related_entity_id", "process_events", ["related_entity_id"])


def downgrade() -> None:
    pass
