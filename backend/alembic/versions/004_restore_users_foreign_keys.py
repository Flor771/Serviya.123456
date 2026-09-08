"""Restore foreign keys pointing to users in production

Revision ID: 004_restore_users_foreign_keys
Revises: 003_sync_user_id_schema
Create Date: 2026-09-08 03:48:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '004_restore_users_foreign_keys'
down_revision: Union[str, None] = '003_sync_user_id_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# List of foreign key definitions pointing to users(id)
# (source_table, local_col, constraint_name)
USER_FK_DEFINITIONS = [
    ('worker_profiles', 'user_id', 'fk_worker_profiles_user_id_users'),
    ('services', 'client_id', 'fk_services_client_id_users'),
    ('services', 'worker_id', 'fk_services_worker_id_users'),
    ('applications', 'worker_id', 'fk_applications_worker_id_users'),
    ('wallets', 'worker_id', 'fk_wallets_worker_id_users'),
    ('wallets', 'user_id', 'fk_wallets_user_id_users'),
    ('wallet_transactions', 'user_id', 'fk_wallet_transactions_user_id_users'),
    ('escrows', 'client_id', 'fk_escrows_client_id_users'),
    ('escrows', 'worker_id', 'fk_escrows_worker_id_users'),
    ('reviews', 'reviewer_id', 'fk_reviews_reviewer_id_users'),
    ('reviews', 'target_user_id', 'fk_reviews_target_user_id_users'),
    ('notifications', 'user_id', 'fk_notifications_user_id_users'),
    ('messages', 'sender_id', 'fk_messages_sender_id_users'),
    ('messages', 'receiver_id', 'fk_messages_receiver_id_users'),
    ('verification_documents', 'user_id', 'fk_verification_documents_user_id_users'),
    ('disputes', 'opened_by_user_id', 'fk_disputes_opened_by_user_id_users'),
    ('disputes', 'against_user_id', 'fk_disputes_against_user_id_users'),
    ('withdrawals', 'user_id', 'fk_withdrawals_user_id_users'),
    ('audit_logs', 'user_id', 'fk_audit_logs_user_id_users'),
    ('contracts', 'client_id', 'fk_contracts_client_id_users'),
    ('contracts', 'worker_id', 'fk_contracts_worker_id_users'),
    ('payments', 'user_id', 'fk_payments_user_id_users'),
    ('payments', 'client_id', 'fk_payments_client_id_users'),
    ('payments', 'worker_id', 'fk_payments_worker_id_users'),
]

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if 'users' not in tables:
        return

    for table_name, col_name, constraint_name in USER_FK_DEFINITIONS:
        if table_name not in tables:
            continue

        try:
            # Check existing columns and foreign keys on table
            cols = {col['name'] for col in inspector.get_columns(table_name)}
            if col_name not in cols:
                continue

            existing_fks = inspector.get_foreign_keys(table_name)
            already_exists = False
            for fk in existing_fks:
                if fk.get('referred_table') == 'users' and col_name in fk.get('constrained_columns', []):
                    already_exists = True
                    break

            if not already_exists:
                op.create_foreign_key(
                    constraint_name=constraint_name,
                    source_table=table_name,
                    referent_table='users',
                    local_cols=[col_name],
                    remote_cols=['id'],
                )
        except Exception as e:
            print(f"Notice creating FK {constraint_name} on {table_name}: {e}")

def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    for table_name, _, constraint_name in USER_FK_DEFINITIONS:
        if table_name not in tables:
            continue
        try:
            op.drop_constraint(constraint_name, table_name, type_='foreignkey')
        except Exception as e:
            print(f"Notice dropping FK {constraint_name} on {table_name}: {e}")
