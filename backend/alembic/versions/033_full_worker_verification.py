"""Add full worker verification levels without changing other SERVIYA flows."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "033_full_worker_verification"
down_revision: Union[str, None] = "032_standardize_future_warranty"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "verifications" not in tables:
        op.create_table(
            "verifications",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("worker_id", sa.String(), sa.ForeignKey("users.id"), nullable=False, index=True),
            sa.Column("document_type", sa.String(length=80), nullable=False),
            sa.Column("document_url", sa.String(length=1000), nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="PENDIENTE"),
            sa.Column("admin_feedback", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # These columns are additive and safe for the existing verification records.
    columns = {c["name"] for c in inspector.get_columns("verifications")}
    if "verification_category" not in columns:
        op.add_column("verifications", sa.Column("verification_category", sa.String(length=50), nullable=True))
    if "document_name" not in columns:
        op.add_column("verifications", sa.Column("document_name", sa.String(length=255), nullable=True))
    if "mime_type" not in columns:
        op.add_column("verifications", sa.Column("mime_type", sa.String(length=100), nullable=True))
    if "reviewed_at" not in columns:
        op.add_column("verifications", sa.Column("reviewed_at", sa.DateTime(), nullable=True))
    if "reviewed_by" not in columns:
        op.add_column("verifications", sa.Column("reviewed_by", sa.String(), nullable=True))

    # Normalize the base Cédula records and optional categories already stored.
    bind.execute(sa.text("""
        UPDATE verifications
        SET verification_category = CASE
            WHEN UPPER(document_type) IN ('CEDULA_RD','CEDULA_FRONT','CEDULA_BACK') THEN 'CEDULA'
            WHEN UPPER(document_type) IN ('INFOTEP','INFOTEP_CERTIFICATE','CERTIFICACION_TECNICA') THEN 'CERTIFICACION_TECNICA'
            WHEN UPPER(document_type) = 'DIPLOMADO' THEN 'DIPLOMADO'
            WHEN UPPER(document_type) IN ('EXPERIENCIA_ACREDITADA','EXPERIENCIA') THEN 'EXPERIENCIA_ACREDITADA'
            WHEN UPPER(document_type) IN ('LICENCIA_ESPECIALIDAD','LICENCIA','ESPECIALIDAD') THEN 'LICENCIA_ESPECIALIDAD'
            ELSE COALESCE(verification_category, 'CERTIFICACION_TECNICA')
        END
        WHERE verification_category IS NULL
    """))

    # Only a verified Cédula can grant the base verification flag.
    bind.execute(sa.text("""
        CREATE OR REPLACE FUNCTION sync_verification_profile()
        RETURNS trigger AS $$
        DECLARE
            has_cedula BOOLEAN;
        BEGIN
            SELECT EXISTS(
                SELECT 1 FROM verifications v
                WHERE v.worker_id = NEW.worker_id
                  AND v.status = 'VERIFICADO'
                  AND COALESCE(v.verification_category,
                      CASE WHEN UPPER(v.document_type) IN ('CEDULA_RD','CEDULA_FRONT','CEDULA_BACK')
                           THEN 'CEDULA' ELSE UPPER(v.document_type) END
                  ) = 'CEDULA'
            ) INTO has_cedula;

            UPDATE users SET is_verified = has_cedula WHERE id = NEW.worker_id;
            UPDATE worker_profiles SET is_approved = has_cedula WHERE user_id = NEW.worker_id;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """))
    bind.execute(sa.text("DROP TRIGGER IF EXISTS trg_sync_verification_profile ON verifications"))
    bind.execute(sa.text("""
        CREATE TRIGGER trg_sync_verification_profile
        AFTER INSERT OR UPDATE OF status, verification_category ON verifications
        FOR EACH ROW EXECUTE FUNCTION sync_verification_profile()
    """))

    # Recalculate every existing worker from the Cédula rule.
    bind.execute(sa.text("""
        UPDATE users u
        SET is_verified = EXISTS(
            SELECT 1 FROM verifications v
            WHERE v.worker_id = u.id
              AND v.status = 'VERIFICADO'
              AND COALESCE(v.verification_category,
                  CASE WHEN UPPER(v.document_type) IN ('CEDULA_RD','CEDULA_FRONT','CEDULA_BACK')
                       THEN 'CEDULA' ELSE UPPER(v.document_type) END
              ) = 'CEDULA'
        )
        WHERE u.role = 'TRABAJADOR'
    """))
    bind.execute(sa.text("""
        UPDATE worker_profiles wp
        SET is_approved = EXISTS(
            SELECT 1 FROM verifications v
            WHERE v.worker_id = wp.user_id
              AND v.status = 'VERIFICADO'
              AND COALESCE(v.verification_category,
                  CASE WHEN UPPER(v.document_type) IN ('CEDULA_RD','CEDULA_FRONT','CEDULA_BACK')
                       THEN 'CEDULA' ELSE UPPER(v.document_type) END
              ) = 'CEDULA'
        )
    """))


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DROP TRIGGER IF EXISTS trg_sync_verification_profile ON verifications"))
    bind.execute(sa.text("DROP FUNCTION IF EXISTS sync_verification_profile()"))
    for column in ("reviewed_by", "reviewed_at", "mime_type", "document_name", "verification_category"):
        try:
            op.drop_column("verifications", column)
        except Exception:
            pass
