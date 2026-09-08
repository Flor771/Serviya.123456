"""Ensure user columns and initial setup

Revision ID: 001_ensure_user_columns
Revises: 
Create Date: 2026-09-07 11:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine import reflection
from app.database.base import Base

revision: str = '001_ensure_user_columns'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def run_schema_migration():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Check categories table and fix id type if it was BIGINT / INT
    if 'categories' in tables:
        columns = {col['name']: col for col in inspector.get_columns('categories')}
        if 'id' in columns:
            id_type = str(columns['id']['type']).upper()
            if 'INT' in id_type or 'SERIAL' in id_type or 'BIGINT' in id_type or 'NUMERIC' in id_type:
                # Drop existing foreign keys referencing categories(id)
                for tbl in tables:
                    try:
                        fks = inspector.get_foreign_keys(tbl)
                        for fk in fks:
                            if fk.get('referred_table') == 'categories':
                                fk_name = fk.get('name')
                                if fk_name:
                                    op.execute(f'ALTER TABLE "{tbl}" DROP CONSTRAINT IF EXISTS "{fk_name}" CASCADE;')
                    except Exception as e:
                        print(f"Notice dropping FK on {tbl}: {e}")

                try:
                    op.execute('ALTER TABLE categories ALTER COLUMN id DROP DEFAULT;')
                except Exception:
                    pass
                op.execute('ALTER TABLE categories ALTER COLUMN id TYPE VARCHAR USING id::varchar;')

    # 2. Check services table and fix category_id if it was INT / BIGINT
    if 'services' in tables:
        columns = {col['name']: col for col in inspector.get_columns('services')}
        if 'category_id' in columns:
            cat_id_type = str(columns['category_id']['type']).upper()
            if 'INT' in cat_id_type or 'SERIAL' in cat_id_type or 'BIGINT' in cat_id_type:
                op.execute('ALTER TABLE services ALTER COLUMN category_id TYPE VARCHAR USING category_id::varchar;')

    # 3. Ensure users columns if users table exists
    if 'users' in tables:
        user_cols = {col['name'] for col in inspector.get_columns('users')}
        alter_sqls = []
        if 'cedula' not in user_cols:
            alter_sqls.append('ADD COLUMN IF NOT EXISTS cedula VARCHAR(20)')
        if 'active_role' not in user_cols:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS active_role VARCHAR(20) DEFAULT 'CLIENTE'")
        if 'province' not in user_cols:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS province VARCHAR(100) DEFAULT 'Distrito Nacional'")
        if 'municipality' not in user_cols:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS municipality VARCHAR(100) DEFAULT 'Santo Domingo de Guzmán (DN)'")
        if 'bio' not in user_cols:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS bio TEXT")
        if 'avatar_url' not in user_cols:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)")
        if 'is_verified' not in user_cols:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE")
        if 'rating' not in user_cols:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 5.0")
        if 'jobs_completed' not in user_cols:
            alter_sqls.append("ADD COLUMN IF NOT EXISTS jobs_completed INTEGER DEFAULT 0")

        if alter_sqls:
            op.execute(f"ALTER TABLE users {', '.join(alter_sqls)};")

    # 4. Create all tables defined in Base.metadata
    Base.metadata.create_all(bind=bind)

def upgrade() -> None:
    run_schema_migration()

def downgrade() -> None:
    pass
