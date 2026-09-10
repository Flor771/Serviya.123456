from alembic import op
import sqlalchemy as sa

revision = '011_admin_roles'
down_revision = '010_unique_service_reviews'
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c['name'] for c in inspector.get_columns('users')}
    if 'admin_role' not in cols:
        op.add_column('users', sa.Column('admin_role', sa.String(length=50), nullable=True))
        op.create_index('ix_users_admin_role', 'users', ['admin_role'], unique=False)
    count = int(bind.execute(sa.text("SELECT COUNT(*) FROM users WHERE role = 'ADMIN'")).scalar() or 0)
    if count == 1:
        bind.execute(sa.text("UPDATE users SET admin_role='SUPER_ADMIN', active_role='ADMIN', is_active=true WHERE role='ADMIN' AND (admin_role IS NULL OR admin_role='')"))
    else:
        bind.execute(sa.text("UPDATE users SET admin_role='ADMINISTRADOR_GENERAL' WHERE role='ADMIN' AND (admin_role IS NULL OR admin_role='')"))

def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c['name'] for c in inspector.get_columns('users')}
    if 'admin_role' in cols:
        try:
            op.drop_index('ix_users_admin_role', table_name='users')
        except Exception:
            pass
        op.drop_column('users', 'admin_role')
