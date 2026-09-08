"""Sync user id schema to VARCHAR for UUID compatibility

Revision ID: 003_sync_user_id_schema
Revises: 002_sync_users_schema
Create Date: 2026-09-08 03:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_sync_user_id_schema'
down_revision: Union[str, None] = '002_sync_users_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'users' not in tables:
        return

    # 1. Inspect all foreign keys referencing users(id) dynamically across all tables
    fks_to_drop = []
    fks_referencing_users = {}

    for tbl in tables:
        try:
            fks = inspector.get_foreign_keys(tbl)
            for fk in fks:
                if fk.get('referred_table') == 'users':
                    fk_name = fk.get('name')
                    constrained_cols = fk.get('constrained_columns', [])
                    referred_cols = fk.get('referred_columns', [])

                    if fk_name:
                        fks_to_drop.append({
                            'table': tbl,
                            'name': fk_name,
                            'constrained_columns': constrained_cols,
                            'referred_columns': referred_cols
                        })

                    if tbl not in fks_referencing_users:
                        fks_referencing_users[tbl] = set()
                    fks_referencing_users[tbl].update(constrained_cols)
        except Exception as e:
            print(f"Notice inspecting foreign keys on {tbl}: {e}")

    # Comprehensive list of known tables & foreign key columns referencing users.id
    known_user_fk_columns = {
        'worker_profiles': ['user_id'],
        'services': ['client_id', 'worker_id'],
        'applications': ['worker_id'],
        'wallets': ['user_id'],
        'wallet_transactions': ['user_id'],
        'escrows': ['client_id', 'worker_id'],
        'reviews': ['reviewer_id', 'target_user_id'],
        'notifications': ['user_id'],
        'messages': ['sender_id', 'receiver_id'],
        'verification_documents': ['user_id'],
        'disputes': ['opened_by_user_id', 'against_user_id'],
        'withdrawals': ['user_id'],
        'audit_logs': ['user_id'],
        'contracts': ['client_id', 'worker_id'],
        'payments': ['user_id', 'client_id', 'worker_id'],
    }

    for tbl, cols in known_user_fk_columns.items():
        if tbl in tables:
            if tbl not in fks_referencing_users:
                fks_referencing_users[tbl] = set()
            fks_referencing_users[tbl].update(cols)

    # 2. Drop all foreign keys referencing users(id)
    for fk in fks_to_drop:
        tbl = fk['table']
        fk_name = fk['name']
        try:
            op.execute(f'ALTER TABLE "{tbl}" DROP CONSTRAINT IF EXISTS "{fk_name}" CASCADE;')
        except Exception as e:
            print(f"Notice dropping FK {fk_name} on {tbl}: {e}")

    # Also drop common named FK constraints explicitly if CASCADE missed any
    for tbl, cols in fks_referencing_users.items():
        for col_name in cols:
            try:
                op.execute(f'ALTER TABLE "{tbl}" DROP CONSTRAINT IF EXISTS "{tbl}_{col_name}_fkey" CASCADE;')
            except Exception:
                pass

    # 3. Convert users.id to VARCHAR safely
    try:
        op.execute('ALTER TABLE users ALTER COLUMN id DROP DEFAULT;')
    except Exception as e:
        print(f"Notice dropping default on users.id: {e}")

    try:
        op.execute('ALTER TABLE users ALTER COLUMN id TYPE VARCHAR USING id::varchar;')
    except Exception as e:
        print(f"Notice converting users.id to VARCHAR: {e}")

    # 4. Convert all FK columns in referencing tables to VARCHAR safely
    for tbl, cols in fks_referencing_users.items():
        if tbl not in tables:
            continue
        table_cols = {col['name']: col for col in inspector.get_columns(tbl)}
        for col_name in cols:
            if col_name in table_cols:
                try:
                    op.execute(f'ALTER TABLE "{tbl}" ALTER COLUMN "{col_name}" DROP DEFAULT;')
                except Exception:
                    pass
                try:
                    op.execute(f'ALTER TABLE "{tbl}" ALTER COLUMN "{col_name}" TYPE VARCHAR USING "{col_name}"::varchar;')
                except Exception as e:
                    print(f"Notice converting column {col_name} on {tbl}: {e}")

    # 5. Recreate dropped foreign keys safely
    for fk in fks_to_drop:
        tbl = fk['table']
        fk_name = fk['name']
        constrained_cols = fk['constrained_columns']
        referred_cols = fk['referred_columns']
        try:
            op.create_foreign_key(
                constraint_name=fk_name,
                source_table=tbl,
                referencing_table='users',
                local_cols=constrained_cols,
                remote_cols=referred_cols,
            )
        except Exception as e:
            print(f"Notice recreating FK {fk_name} on {tbl}: {e}")

def downgrade() -> None:
    pass
