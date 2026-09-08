"""Sync password_hash column in users table

Revision ID: 005_sync_password_hash_column
Revises: 004_restore_users_foreign_keys
Create Date: 2026-09-08 03:59:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '005_sync_password_hash_column'
down_revision: Union[str, None] = '004_restore_users_foreign_keys'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if 'users' in tables:
        columns = {col['name'] for col in inspector.get_columns('users')}
        if 'password_hash' not in columns:
            try:
                op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT '';")
            except Exception as e:
                print(f"Notice adding password_hash column: {e}")

        # Sync existing password hashes from hashed_password or password columns if present
        if 'hashed_password' in columns:
            try:
                op.execute("UPDATE users SET password_hash = hashed_password WHERE (password_hash IS NULL OR password_hash = '') AND hashed_password IS NOT NULL AND hashed_password != '';")
            except Exception as e:
                print(f"Notice copying hashed_password to password_hash: {e}")

        if 'password' in columns:
            try:
                op.execute("UPDATE users SET password_hash = password WHERE (password_hash IS NULL OR password_hash = '') AND password IS NOT NULL AND password != '';")
            except Exception as e:
                print(f"Notice copying password to password_hash: {e}")

        try:
            op.execute("UPDATE users SET password_hash = '' WHERE password_hash IS NULL;")
        except Exception as e:
            print(f"Notice setting fallback on password_hash: {e}")

def downgrade() -> None:
    pass
