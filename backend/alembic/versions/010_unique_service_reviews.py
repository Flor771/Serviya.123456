"""Prevent duplicate reviews for the same service and reviewer."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "010_unique_service_reviews"
down_revision: Union[str, None] = "009_client_wallets"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "reviews" not in tables:
        return
    # Clean only exact duplicate rows, preserving the oldest review.
    op.execute(sa.text("""
        DELETE FROM reviews r
        USING reviews older
        WHERE r.service_id IS NOT NULL
          AND r.reviewer_id IS NOT NULL
          AND r.service_id = older.service_id
          AND r.reviewer_id = older.reviewer_id
          AND r.id > older.id
    """))
    indexes = {i["name"] for i in inspector.get_indexes("reviews")}
    if "uq_reviews_service_reviewer" not in indexes:
        op.create_index(
            "uq_reviews_service_reviewer",
            "reviews",
            ["service_id", "reviewer_id"],
            unique=True,
            postgresql_where=sa.text("service_id IS NOT NULL AND reviewer_id IS NOT NULL"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    if "reviews" in set(sa.inspect(bind).get_table_names()):
        indexes = {i["name"] for i in sa.inspect(bind).get_indexes("reviews")}
        if "uq_reviews_service_reviewer" in indexes:
            op.drop_index("uq_reviews_service_reviewer", table_name="reviews")
