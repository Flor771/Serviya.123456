"""Align message storage with SERVIYA service-based chat.

The production database still has the legacy conversation schema. The current
SERVIYA chat is keyed by service_id and needs an explicit receiver_id, while
legacy messages remain readable through the existing text column.
"""
from alembic import op
import sqlalchemy as sa

revision = "016_messages_service_compatibility"
down_revision = "015_negotiation_flow"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if "messages" not in tables:
        return

    cols = {c["name"] for c in inspector.get_columns("messages")}
    if "service_id" not in cols:
        op.add_column("messages", sa.Column("service_id", sa.String(), nullable=True))
    if "receiver_id" not in cols:
        op.add_column("messages", sa.Column("receiver_id", sa.String(), nullable=True))
    if "content" not in cols:
        op.add_column("messages", sa.Column("content", sa.Text(), nullable=True))

    # Keep legacy messages readable through the new field.
    op.execute(sa.text("UPDATE messages SET content = text WHERE content IS NULL"))

    # New service messages do not require the legacy conversation relation.
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
