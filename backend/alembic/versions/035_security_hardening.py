"""Security hardening invariants."""
from alembic import op
import sqlalchemy as sa
revision = "035_security_hardening"
down_revision = "034_merge_revisit_history_heads"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind(); inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("users")}
    for name, typ in (("terms_accepted_at", sa.DateTime()), ("terms_version", sa.String(40)), ("privacy_policy_version", sa.String(40))):
        if name not in cols: op.add_column("users", sa.Column(name, typ, nullable=True))
    bind.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS uq_disputes_one_active_per_service ON disputes(service_id) WHERE status IN ('ABIERTA','EN_REVISION')"))
    bind.execute(sa.text("""
        CREATE OR REPLACE FUNCTION serviya_require_contract_signatures() RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE c record;
        BEGIN
          IF NEW.status = 'EN_PROGRESO' AND COALESCE(OLD.status::text,'') <> 'EN_PROGRESO' THEN
            SELECT client_accepted_at, worker_accepted_at INTO c FROM digital_contracts WHERE service_id=NEW.id ORDER BY generated_at DESC NULLS LAST LIMIT 1;
            IF c.client_accepted_at IS NULL OR c.worker_accepted_at IS NULL THEN RAISE EXCEPTION 'DIGITAL_CONTRACT_NOT_FULLY_ACCEPTED'; END IF;
          END IF;
          RETURN NEW;
        END; $$;
    """))
    bind.execute(sa.text("DROP TRIGGER IF EXISTS trg_require_contract_signatures ON services"))
    bind.execute(sa.text("CREATE TRIGGER trg_require_contract_signatures BEFORE UPDATE OF status ON services FOR EACH ROW EXECUTE FUNCTION serviya_require_contract_signatures()"))

def downgrade():
    bind = op.get_bind()
    bind.execute(sa.text("DROP TRIGGER IF EXISTS trg_require_contract_signatures ON services"))
    bind.execute(sa.text("DROP FUNCTION IF EXISTS serviya_require_contract_signatures()"))
    bind.execute(sa.text("DROP INDEX IF EXISTS uq_disputes_one_active_per_service"))
    inspector = sa.inspect(bind); cols = {c["name"] for c in inspector.get_columns("users")}
    for name in ("privacy_policy_version","terms_version","terms_accepted_at"):
        if name in cols: op.drop_column("users", name)
