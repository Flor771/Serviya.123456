"""Ensure the administrative audit log table exists.

Revision ID: 012_admin_audit_logs
Revises: 011_worker_bank_accounts
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "012_admin_audit_logs"
down_revision: Union[str, None] = "011_worker_bank_accounts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "admin_audit_logs" not in set(inspector.get_table_names()):
        op.create_table(
            "admin_audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("admin_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("action", sa.String(100), nullable=False),
            sa.Column("resource", sa.String(100), nullable=False),
            sa.Column("target_id", sa.Integer(), nullable=True),
            sa.Column("details", sa.Text(), nullable=True),
            sa.Column("timestamp", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_admin_audit_logs_timestamp", "admin_audit_logs", ["timestamp"])
        op.create_index("ix_admin_audit_logs_resource", "admin_audit_logs", ["resource"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "admin_audit_logs" in set(inspector.get_table_names()):
        try:
            op.drop_index("ix_admin_audit_logs_resource", table_name="admin_audit_logs")
        except Exception:
            pass
        try:
            op.drop_index("ix_admin_audit_logs_timestamp", table_name="admin_audit_logs")
        except Exception:
            pass
        op.drop_table("admin_audit_logs")
