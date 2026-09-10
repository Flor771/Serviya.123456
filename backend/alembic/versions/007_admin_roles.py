"""Add administrative role support and protect the super administrator.

Revision ID: 007_admin_roles
Revises: 006_ensure_all_tables_exist
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "007_admin_roles"
down_revision: Union[str, None] = "006_ensure_all_tables_exist"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "users" not in tables:
        return

    columns = {c["name"] for c in inspector.get_columns("users")}
    if "admin_role" not in columns:
        op.add_column("users", sa.Column("admin_role", sa.String(length=50), nullable=True))
        op.create_index("ix_users_admin_role", "users", ["admin_role"], unique=False)

    # Existing administrative access belongs to the first administrator.
    # This also repairs the current admin account when admin_role was previously null.
    op.execute("""
        UPDATE users
        SET admin_role = 'SUPER_ADMIN'
        WHERE id = (
            SELECT id FROM users
            WHERE role::text = 'ADMIN' AND (admin_role IS NULL OR admin_role = '')
            ORDER BY created_at NULLS FIRST, id
            LIMIT 1
        )
    """)

    # Only one SUPER_ADMIN may exist. Other administrative roles may be assigned freely.
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ux_users_one_super_admin
        ON users (admin_role)
        WHERE admin_role = 'SUPER_ADMIN'
    """)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" in inspector.get_table_names():
        op.execute("DROP INDEX IF EXISTS ux_users_one_super_admin")
        op.execute("DROP INDEX IF EXISTS ix_users_admin_role")
        columns = {c["name"] for c in inspector.get_columns("users")}
        if "admin_role" in columns:
            op.drop_column("users", "admin_role")
