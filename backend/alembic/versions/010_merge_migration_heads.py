"""Merge the existing Alembic branches into one permanent head.

Revision ID: 010_merge_migration_heads
Revises: 009_client_wallets, 008_password_reset_tokens, 007_persistent_process_events
"""

from alembic import op

revision = "010_merge_migration_heads"
down_revision = (
    "009_client_wallets",
    "008_password_reset_tokens",
    "007_persistent_process_events",
)
branch_labels = None
depends_on = None


def upgrade():
    # Merge-only migration. The three parent branches already contain
    # their schema changes; this revision only makes Alembic's history linear.
    pass


def downgrade():
    pass
