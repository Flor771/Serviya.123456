"""Keep technician verification state synchronized.

Revision ID: 012_verification_profile_sync
Revises: 011_align_notifications_schema
"""
from alembic import op

revision = "012_verification_profile_sync"
down_revision = "011_align_notifications_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
    CREATE OR REPLACE FUNCTION sync_verification_profile()
    RETURNS trigger AS $$
    BEGIN
        IF NEW.status = 'VERIFICADO' THEN
            UPDATE users
            SET is_verified = TRUE
            WHERE id = NEW.worker_id;

            UPDATE worker_profiles
            SET is_approved = TRUE
            WHERE user_id = NEW.worker_id;
        ELSIF NEW.status = 'RECHAZADO' THEN
            UPDATE users
            SET is_verified = FALSE
            WHERE id = NEW.worker_id;

            UPDATE worker_profiles
            SET is_approved = FALSE
            WHERE user_id = NEW.worker_id;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    op.execute("""
    DROP TRIGGER IF EXISTS trg_sync_verification_profile ON verifications;
    CREATE TRIGGER trg_sync_verification_profile
    AFTER INSERT OR UPDATE OF status ON verifications
    FOR EACH ROW
    EXECUTE FUNCTION sync_verification_profile();
    """)

    # Synchronize existing already-verified records as well.
    op.execute("""
    UPDATE worker_profiles wp
    SET is_approved = TRUE
    WHERE EXISTS (
        SELECT 1 FROM verifications v
        WHERE v.worker_id = wp.user_id AND v.status = 'VERIFICADO'
    );
    """)


def downgrade():
    op.execute("DROP TRIGGER IF EXISTS trg_sync_verification_profile ON verifications;")
    op.execute("DROP FUNCTION IF EXISTS sync_verification_profile();")
