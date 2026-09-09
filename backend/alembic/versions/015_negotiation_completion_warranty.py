"""Add negotiated pricing, completion review state, OTP and warranty storage."""
from alembic import op
import sqlalchemy as sa

revision = "015_negotiation_completion_warranty"
down_revision = "014_escrow_deposit_voucher"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if "services" in tables:
        cols = {c["name"] for c in inspector.get_columns("services")}
        additions = [
            ("negotiated_price_rd", sa.Numeric(12, 2), None),
            ("negotiation_status", sa.String(40), "PENDIENTE"),
            ("negotiation_offer_rd", sa.Numeric(12, 2), None),
            ("negotiation_offer_by", sa.String(255), None),
            ("negotiation_offer_note", sa.Text(), None),
            ("price_agreed_at", sa.DateTime(), None),
            ("completion_submitted", sa.Boolean(), False),
            ("completion_summary", sa.Text(), None),
            ("completion_submitted_at", sa.DateTime(), None),
        ]
        for name, typ, default in additions:
            if name not in cols:
                kwargs = {"nullable": True}
                if default is not None:
                    kwargs["server_default"] = sa.text("false" if default is False else f"'{default}'")
                op.add_column("services", sa.Column(name, typ, **kwargs))
    if "escrows" in tables:
        cols = {c["name"] for c in inspector.get_columns("escrows")}
        for name, typ in [("release_otp", sa.String(10)), ("otp_verified", sa.Boolean())]:
            if name not in cols:
                op.add_column("escrows", sa.Column(name, typ, nullable=True, server_default=sa.text("false") if name == "otp_verified" else None))
    if "service_warranties" not in tables:
        op.create_table(
            "service_warranties",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("service_id", sa.String(), sa.ForeignKey("services.id"), nullable=False, unique=True),
            sa.Column("client_id", sa.String(), nullable=False),
            sa.Column("worker_id", sa.String(), nullable=False),
            sa.Column("coverage_days", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("status", sa.String(30), nullable=False, server_default="ACTIVA"),
            sa.Column("activated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.Column("certificate_ref", sa.String(120), nullable=False),
        )


def downgrade():
    bind = op.get_bind(); inspector = sa.inspect(bind)
    if "service_warranties" in inspector.get_table_names():
        op.drop_table("service_warranties")
    if "escrows" in inspector.get_table_names():
        cols = {c["name"] for c in inspector.get_columns("escrows")}
        for name in ["otp_verified", "release_otp"]:
            if name in cols: op.drop_column("escrows", name)
    if "services" in inspector.get_table_names():
        cols = {c["name"] for c in inspector.get_columns("services")}
        for name in ["completion_submitted_at", "completion_summary", "completion_submitted", "price_agreed_at", "negotiation_offer_note", "negotiation_offer_by", "negotiation_offer_rd", "negotiation_status", "negotiated_price_rd"]:
            if name in cols: op.drop_column("services", name)
