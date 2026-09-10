"""Promote the initial SERVIYA admin account to SUPER_ADMIN.

Revision ID: 007_seed_super_admin
Revises: 006_ensure_all_tables_exist
"""
from alembic import op
from sqlalchemy import text

revision = "007_seed_super_admin"
down_revision = "006_ensure_all_tables_exist"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    # Preserve the existing password. This only fixes the authorization role so
    # the existing administrative credentials can access the real admin console.
    bind.execute(text("""
        UPDATE users
        SET role = 'ADMIN', active_role = 'ADMIN', admin_role = 'SUPER_ADMIN',
            is_active = true, is_verified = true, updated_at = CURRENT_TIMESTAMP
        WHERE lower(email) = 'admin@serviya.do'
    """))


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(text("""
        UPDATE users
        SET admin_role = NULL
        WHERE lower(email) = 'admin@serviya.do'
    """))
