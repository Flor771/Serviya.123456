"""Align message storage with SERVIYA service-based chat."""
from alembic import op
import sqlalchemy as sa

# Alembic's production version_num column is VARCHAR(32).
revision = "016_msg_service_compat"
down_revision = "015_negotiation_flow"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "messages" not in inspector.get_table_names():
        return

    cols = {c["name"] for c in inspector.get_columns("messages")}
    if "service_id" not in cols:
        op.add_column("messages", sa.Column("service_id", sa.String(), nullable=True))
    if "receiver_id" not in cols:
        op.add_column("messages", sa.Column("receiver_id", sa.String(), nullable=True))
    if "content" not in cols:
        op.add_column("messages", sa.Column("content", sa.Text(), nullable=True))

    op.execute(sa.text("UPDATE messages SET content = text WHERE content IS NULL"))
    try:
        op.alter_column("messages", "conversation_id", existing_type=sa.Integer(), nullable=True)
    except Exception:
        pass


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "messages" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("messages")}
    for name in ["content", "receiver_id", "service_id"]:
        if name in cols:
            op.drop_column("messages", name)
