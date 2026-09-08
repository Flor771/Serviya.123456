"""Sync users schema columns

Revision ID: 002_sync_users_schema
Revises: 001_initial_schema
Create Date: 2026-09-08 02:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_sync_users_schema'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'users' in tables:
        columns = {col['name'] for col in inspector.get_columns('users')}
        alter_sqls = []

        if 'first_name' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NOT NULL DEFAULT ''")
        if 'last_name' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NOT NULL DEFAULT ''")
        if 'email' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS email VARCHAR(255)")
        if 'phone' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NOT NULL DEFAULT ''")
        if 'cedula' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS cedula VARCHAR(20)")
        if 'hashed_password' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(255) DEFAULT ''")
        if 'role' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'CLIENTE'")
        if 'active_role' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS active_role VARCHAR(20) DEFAULT 'CLIENTE'")
        if 'province' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS province VARCHAR(100) DEFAULT 'Distrito Nacional'")
        if 'municipality' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS municipality VARCHAR(100) DEFAULT 'Santo Domingo de Guzmán (DN)'")
        if 'bio' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS bio TEXT")
        if 'avatar_url' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)")
        if 'is_verified' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE")
        if 'rating' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 5.0")
        if 'jobs_completed' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS jobs_completed INTEGER DEFAULT 0")
        if 'created_at' not in columns:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()")

        for sql_stmt in alter_sqls:
            try:
                op.execute(f"ALTER TABLE users {sql_stmt};")
            except Exception as e:
                print(f"Notice applying '{sql_stmt}': {e}")

        # If old 'password' column exists, migrate non-empty values to 'hashed_password'
        if 'password' in columns and 'hashed_password' in columns:
            try:
                op.execute("UPDATE users SET hashed_password = password WHERE (hashed_password IS NULL OR hashed_password = '') AND password IS NOT NULL AND password != '';")
            except Exception as e:
                print(f"Notice migrating password column: {e}")
    else:
        from app.database.base import Base
        Base.metadata.create_all(bind=bind)

def downgrade() -> None:
    pass
