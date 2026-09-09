"""Ensure all model tables exist in database safely and explicitly

Revision ID: 006_ensure_all_tables_exist
Revises: 005_sync_password_hash_column
Create Date: 2026-09-09 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '006_ensure_all_tables_exist'
down_revision: Union[str, None] = '005_sync_password_hash_column'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Ensure services table exists safely without category_id FK constraint
    if 'wallets' not in tables:
        op.create_table(
            'wallets',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('worker_id', sa.String(), sa.ForeignKey('users.id'), nullable=False, unique=True),
            sa.Column('available_balance', sa.Float(), server_default='0.0'),
            sa.Column('pending_custody_balance', sa.Float(), server_default='0.0'),
            sa.Column('total_earnings', sa.Float(), server_default='0.0'),
            sa.Column('total_commissions', sa.Float(), server_default='0.0'),
            sa.Column('total_withdrawn', sa.Float(), server_default='0.0')
        )

    if 'services' not in tables:
        op.create_table(
            'services',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('category_id', sa.String(), nullable=True),
            sa.Column('category_name', sa.String(length=100), nullable=False),
            sa.Column('subcategory', sa.String(length=100), nullable=True),
            sa.Column('price_rd', sa.Float(), nullable=False),
            sa.Column('province', sa.String(length=100), nullable=False),
            sa.Column('municipality', sa.String(length=100), nullable=False),
            sa.Column('address_approx', sa.String(length=255), nullable=True),
            sa.Column('service_date', sa.String(length=50), nullable=False),
            sa.Column('service_time', sa.String(length=50), nullable=False),
            sa.Column('estimated_duration', sa.String(length=50), nullable=True),
            sa.Column('images', sa.JSON(), nullable=True),
            sa.Column('requirements', sa.JSON(), nullable=True),
            sa.Column('payment_type', sa.String(length=50), server_default='CUSTODIA_SERVIYA'),
            sa.Column('status', sa.String(length=50), server_default='PUBLICADA'),
            sa.Column('client_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('worker_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
        )

    # 2. Ensure applications table exists
    if 'applications' not in tables:
        op.create_table(
            'applications',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('service_id', sa.String(), sa.ForeignKey('services.id'), nullable=False),
            sa.Column('worker_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('offered_price_rd', sa.Float(), nullable=False),
            sa.Column('availability_note', sa.String(length=255), nullable=True),
            sa.Column('status', sa.String(length=50), server_default='PENDIENTE'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
        )

    # 3. Ensure escrows table exists
    if 'escrows' not in tables:
        op.create_table(
            'escrows',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('service_id', sa.String(), sa.ForeignKey('services.id'), nullable=False),
            sa.Column('client_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('worker_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('total_amount_rd', sa.Float(), nullable=False),
            sa.Column('commission_rate_percent', sa.Float(), server_default='8.0'),
            sa.Column('commission_amount_rd', sa.Float(), nullable=False),
            sa.Column('worker_payout_rd', sa.Float(), nullable=False),
            sa.Column('status', sa.String(length=50), server_default='RETENIDO'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
            sa.Column('released_at', sa.DateTime(), nullable=True)
        )

    # 4. Ensure reviews table exists
    if 'reviews' not in tables:
        op.create_table(
            'reviews',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('service_id', sa.String(), sa.ForeignKey('services.id'), nullable=False),
            sa.Column('reviewer_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('target_user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('rating', sa.Integer(), nullable=False),
            sa.Column('comment', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
        )

    # 5. Ensure notifications table exists
    if 'notifications' not in tables:
        op.create_table(
            'notifications',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('type', sa.String(length=50), nullable=False),
            sa.Column('read', sa.Boolean(), server_default='false'),
            sa.Column('related_entity_id', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
        )

    # 6. Ensure messages table exists
    if 'messages' not in tables:
        op.create_table(
            'messages',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('service_id', sa.String(), sa.ForeignKey('services.id'), nullable=False),
            sa.Column('sender_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('receiver_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
        )

    # 7. Ensure verification_documents table exists
    if 'verification_documents' not in tables:
        op.create_table(
            'verification_documents',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('document_type', sa.String(length=50), nullable=False),
            sa.Column('document_url', sa.String(length=500), nullable=False),
            sa.Column('status', sa.String(length=50), server_default='PENDIENTE'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('submitted_at', sa.DateTime(), server_default=sa.func.now())
        )

    # 8. Ensure disputes table exists
    if 'disputes' not in tables:
        op.create_table(
            'disputes',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('service_id', sa.String(), sa.ForeignKey('services.id'), nullable=False),
            sa.Column('opened_by_user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('against_user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('reason', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('evidence_urls', sa.JSON(), nullable=True),
            sa.Column('status', sa.String(length=50), server_default='ABIERTA'),
            sa.Column('resolution_notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
        )

    # 9. Ensure withdrawals table exists
    if 'withdrawals' not in tables:
        op.create_table(
            'withdrawals',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('amount_rd', sa.Float(), nullable=False),
            sa.Column('bank_name', sa.String(length=100), nullable=False),
            sa.Column('account_type', sa.String(length=50), nullable=False),
            sa.Column('account_number', sa.String(length=50), nullable=False),
            sa.Column('account_holder_name', sa.String(length=150), nullable=False),
            sa.Column('account_holder_cedula', sa.String(length=20), nullable=False),
            sa.Column('status', sa.String(length=50), server_default='PENDIENTE'),
            sa.Column('requested_at', sa.DateTime(), server_default=sa.func.now()),
            sa.Column('processed_at', sa.DateTime(), nullable=True)
        )

    # 10. Ensure bank_accounts table exists
    if 'bank_accounts' not in tables:
        op.create_table(
            'bank_accounts',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('bank_name', sa.String(length=100), nullable=False),
            sa.Column('account_number', sa.String(length=100), nullable=False),
            sa.Column('account_type', sa.String(length=50), nullable=True),
            sa.Column('account_holder', sa.String(length=150), nullable=True),
            sa.Column('rnc_cedula', sa.String(length=50), nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='true'),
            sa.Column('is_primary', sa.Boolean(), server_default='false'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
        )

    # 11. Ensure audit_logs table exists
    if 'audit_logs' not in tables:
        op.create_table(
            'audit_logs',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('user_id', sa.String(), nullable=True),
            sa.Column('action', sa.String(length=100), nullable=False),
            sa.Column('details', sa.Text(), nullable=False),
            sa.Column('ip_address', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
        )

def downgrade() -> None:
    pass
