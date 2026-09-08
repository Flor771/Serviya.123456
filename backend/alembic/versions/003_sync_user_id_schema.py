"""Sync user id schema to VARCHAR for UUID compatibility and restore foreign keys

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

# List of known tables and columns that reference users(id)
KNOWN_USER_FK_MAP = {
    'worker_profiles': ['user_id'],
    'services': ['client_id', 'worker_id'],
    'applications': ['worker_id'],
    'wallets': ['worker_id', 'user_id'],
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

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'users' not in tables:
        return

    # 1. Inspect existing foreign keys referencing users(id)
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
                            'referred_columns': referred_cols or ['id']
                        })

                    if tbl not in fks_referencing_users:
                        fks_referencing_users[tbl] = set()
                    fks_referencing_users[tbl].update(constrained_cols)
        except Exception as e:
            print(f"Notice inspecting foreign keys on {tbl}: {e}")

    # Merge known user FK columns
    for tbl, cols in KNOWN_USER_FK_MAP.items():
        if tbl in tables:
            if tbl not in fks_referencing_users:
                fks_referencing_users[tbl] = set()
            fks_referencing_users[tbl].update(cols)

    # 2. Drop all existing foreign keys referencing users(id)
    for fk in fks_to_drop:
        tbl = fk['table']
        fk_name = fk['name']
        try:
            op.execute(f'ALTER TABLE "{tbl}" DROP CONSTRAINT IF EXISTS "{fk_name}" CASCADE;')
        except Exception as e:
            print(f"Notice dropping FK {fk_name} on {tbl}: {e}")

    # Drop potential default-named FK constraints
    for tbl, cols in fks_referencing_users.items():
        for col_name in cols:
            for constraint_suffix in [f'{tbl}_{col_name}_fkey', f'fk_{tbl}_{col_name}_users']:
                try:
                    op.execute(f'ALTER TABLE "{tbl}" DROP CONSTRAINT IF EXISTS "{constraint_suffix}" CASCADE;')
                except Exception:
                    pass

    # 3. Convert users.id to VARCHAR if needed
    try:
        op.execute('ALTER TABLE users ALTER COLUMN id DROP DEFAULT;')
    except Exception as e:
        print(f"Notice dropping default on users.id: {e}")

    try:
        op.execute('ALTER TABLE users ALTER COLUMN id TYPE VARCHAR USING id::varchar;')
    except Exception as e:
        print(f"Notice converting users.id to VARCHAR: {e}")

    # 4. Convert all FK columns in referencing tables to VARCHAR
    for tbl, cols in fks_referencing_users.items():
        if tbl not in tables:
            continue
        try:
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
        except Exception as e:
            print(f"Notice inspecting columns for {tbl}: {e}")

    # 5. Recreate foreign keys correctly using referent_table='users'
    created_fks = set()

    # Recreate dynamically found FKs
    for fk in fks_to_drop:
        tbl = fk['table']
        fk_name = fk['name']
        constrained_cols = fk['constrained_columns']
        referred_cols = fk['referred_columns'] or ['id']
        try:
            op.create_foreign_key(
                constraint_name=fk_name,
                source_table=tbl,
                referent_table='users',
                local_cols=constrained_cols,
                remote_cols=referred_cols,
            )
            created_fks.add((tbl, tuple(constrained_cols)))
        except Exception as e:
            print(f"Notice recreating FK {fk_name} on {tbl}: {e}")

    # Ensure all known FK columns pointing to users(id) have an active foreign key constraint
    for tbl, cols in KNOWN_USER_FK_MAP.items():
        if tbl not in tables:
            continue
        try:
            table_cols = {col['name'] for col in inspector.get_columns(tbl)}
            for col_name in cols:
                if col_name in table_cols and (tbl, (col_name,)) not in created_fks:
                    constraint_name = f'fk_{tbl}_{col_name}_users'
                    try:
                        op.create_foreign_key(
                            constraint_name=constraint_name,
                            source_table=tbl,
                            referent_table='users',
                            local_cols=[col_name],
                            remote_cols=['id'],
                        )
                        created_fks.add((tbl, (col_name,)))
                    except Exception as e:
                        print(f"Notice creating fallback FK {constraint_name} on {tbl}: {e}")
        except Exception as e:
            print(f"Notice ensuring FK for {tbl}: {e}")

def downgrade() -> None:
    pass
