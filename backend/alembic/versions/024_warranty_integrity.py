"""Persist warranty tables and enforce one active revisit per service.

Revision ID: 024_warranty_integrity
Revises: 023_merge_all_current_heads
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "024_warranty_integrity"
down_revision: Union[str, None] = "023_merge_all_current_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "service_warranties" not in tables:
        op.create_table(
            "service_warranties",
            sa.Column("id", sa.String(length=64), primary_key=True),
            sa.Column("service_id", sa.String(), sa.ForeignKey("services.id"), nullable=False),
            sa.Column("client_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("worker_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("coverage_days", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("status", sa.String(length=40), nullable=False, server_default="ACTIVA"),
            sa.Column("activated_at", sa.DateTime(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("certificate_ref", sa.String(length=120), nullable=True),
        )

    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_service_warranties_service
        ON service_warranties(service_id)
    """)

    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_warranty_active_revisit_service
        ON warranty_revisits(service_id)
        WHERE status IN (
            'SOLICITADA',
            'PROGRAMADA',
            'CORRECCION_EN_PROCESO',
            'CORRECCION_REALIZADA',
            'ESCALADA_ADMIN'
        )
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_warranty_active_revisit_service")
    op.execute("DROP INDEX IF EXISTS uq_service_warranties_service")
    # Keep historical warranty records if this migration is rolled back.
