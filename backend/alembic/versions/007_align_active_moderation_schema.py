"""Align active disputes and reviews with services/applications flow.

Revision ID: 007_align_moderation_schema
Revises: 006_ensure_all_tables_exist
Create Date: 2026-09-09
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "007_align_moderation_schema"
down_revision: Union[str, None] = "006_ensure_all_tables_exist"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(bind, table):
    return {c["name"] for c in sa.inspect(bind).get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "disputes" in tables:
        cols = _columns(bind, "disputes")
        for col in ("job_request_id", "contract_id"):
            if col in cols:
                op.alter_column("disputes", col, nullable=True)
        if "service_id" not in cols:
            op.add_column("disputes", sa.Column("service_id", sa.String(), nullable=True))
        if "opened_by_user_id" not in cols:
            op.add_column("disputes", sa.Column("opened_by_user_id", sa.String(), nullable=True))
        if "against_user_id" not in cols:
            op.add_column("disputes", sa.Column("against_user_id", sa.String(), nullable=True))
        if "evidence_urls" not in cols:
            op.add_column("disputes", sa.Column("evidence_urls", sa.JSON(), nullable=True))
        if "resolution_notes" not in cols:
            op.add_column("disputes", sa.Column("resolution_notes", sa.Text(), nullable=True))

    if "reviews" in tables:
        cols = _columns(bind, "reviews")
        if "contract_id" in cols:
            op.alter_column("reviews", "contract_id", nullable=True)
        if "service_id" not in cols:
            op.add_column("reviews", sa.Column("service_id", sa.String(), nullable=True))
        if "target_user_id" not in cols:
            op.add_column("reviews", sa.Column("target_user_id", sa.String(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())

    if "reviews" in tables:
        cols = _columns(bind, "reviews")
        if "target_user_id" in cols:
            op.drop_column("reviews", "target_user_id")
        if "service_id" in cols:
            op.drop_column("reviews", "service_id")
        if "contract_id" in cols:
            op.alter_column("reviews", "contract_id", nullable=False)

    if "disputes" in tables:
        cols = _columns(bind, "disputes")
        for col in ("resolution_notes", "evidence_urls", "against_user_id", "opened_by_user_id", "service_id"):
            if col in cols:
                op.drop_column("disputes", col)
        for col in ("job_request_id", "contract_id"):
            if col in cols:
                op.alter_column("disputes", col, nullable=False)
