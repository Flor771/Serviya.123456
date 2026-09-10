"""Add persistent work-progress status history for clients and workers."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "020_service_work_status_history"
down_revision: Union[str, None] = "019_worker_bank_accounts_trace"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "service_work_status_history" not in inspector.get_table_names():
        op.create_table(
            "service_work_status_history",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("service_id", sa.String(), sa.ForeignKey("services.id"), nullable=False),
            sa.Column("changed_by_user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("status", sa.String(40), nullable=False),
            sa.Column("note", sa.String(500), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_service_work_status_history_service_id", "service_work_status_history", ["service_id"])


def downgrade() -> None:
    op.drop_index("ix_service_work_status_history_service_id", table_name="service_work_status_history")
    op.drop_table("service_work_status_history")
