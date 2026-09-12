"""Add complete admin notifications for worker withdrawals.

Revision ID: 030_withdrawal_admin_alerts
Revises: 029_reconcile_acceptance
"""
from alembic import op

revision = "030_withdrawal_admin_alerts"
down_revision = "029_reconcile_acceptance"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
    CREATE OR REPLACE FUNCTION notify_admin_withdrawal_request() RETURNS trigger AS $$
    DECLARE
        admin_id text;
        worker_name text;
        service_title text;
        client_name text;
        details text;
    BEGIN
        SELECT concat_ws(' ', u.first_name, u.last_name)
          INTO worker_name
          FROM users u WHERE u.id = NEW.worker_id;

        SELECT s.title, concat_ws(' ', c.first_name, c.last_name)
          INTO service_title, client_name
          FROM escrows e
          JOIN services s ON s.id = e.service_id
          LEFT JOIN users c ON c.id = s.client_id
         WHERE e.worker_id = NEW.worker_id
           AND e.status = 'LIBERADO'
         ORDER BY e.released_at DESC NULLS LAST, e.created_at DESC
         LIMIT 1;

        details := 'Nuevo retiro pendiente. Trabajador: ' || coalesce(worker_name,'—')
            || ' | Monto: RD$ ' || to_char(NEW.amount,'FM999G999G990D00')
            || ' | Banco: ' || coalesce(NEW.method,'—')
            || ' | Cuenta: ' || coalesce(NEW.account_number,'—')
            || ' | Tipo: ' || coalesce(NEW.account_type,'—')
            || ' | Titular: ' || coalesce(NEW.account_holder_name,'—')
            || ' | Cédula titular: ' || coalesce(NEW.account_holder_cedula,'—')
            || ' | Trabajo: ' || coalesce(service_title,'No identificado')
            || ' | Cliente: ' || coalesce(client_name,'—')
            || ' | Referencia: ' || coalesce(NEW.reference_code, NEW.id::text);

        FOR admin_id IN SELECT id FROM users WHERE role = 'ADMIN' LOOP
            INSERT INTO notifications (id,user_id,title,message,type,read,related_entity_id,created_at)
            SELECT gen_random_uuid()::text, admin_id, 'Retiro pendiente de aprobación', details,
                   'RETIRO_PENDIENTE', false, NEW.id::text, CURRENT_TIMESTAMP
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications n
                 WHERE n.user_id = admin_id
                   AND n.type = 'RETIRO_PENDIENTE'
                   AND n.related_entity_id = NEW.id::text
            );
        END LOOP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_notify_admin_withdrawal_request ON withdrawals;
    CREATE TRIGGER trg_notify_admin_withdrawal_request
    AFTER INSERT ON withdrawals
    FOR EACH ROW EXECUTE FUNCTION notify_admin_withdrawal_request();
    """)

    op.execute("""
    INSERT INTO notifications (id,user_id,title,message,type,read,related_entity_id,created_at)
    SELECT gen_random_uuid()::text, a.id, 'Retiro pendiente de aprobación',
           'Nuevo retiro pendiente. Trabajador: ' || coalesce(concat_ws(' ',u.first_name,u.last_name),'—')
           || ' | Monto: RD$ ' || to_char(w.amount,'FM999G999G990D00')
           || ' | Banco: ' || coalesce(w.method,'—')
           || ' | Cuenta: ' || coalesce(w.account_number,'—')
           || ' | Titular: ' || coalesce(w.account_holder_name,'—')
           || ' | Trabajo: ' || coalesce((SELECT s.title FROM escrows e JOIN services s ON s.id=e.service_id WHERE e.worker_id=w.worker_id AND e.status='LIBERADO' ORDER BY e.released_at DESC NULLS LAST,e.created_at DESC LIMIT 1),'No identificado')
           || ' | Referencia: ' || coalesce(w.reference_code,w.id::text),
           'RETIRO_PENDIENTE', false, w.id::text, CURRENT_TIMESTAMP
      FROM withdrawals w
      JOIN users u ON u.id=w.worker_id
      CROSS JOIN users a
     WHERE w.status='PENDIENTE' AND a.role='ADMIN'
       AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id=a.id AND n.type='RETIRO_PENDIENTE' AND n.related_entity_id=w.id::text);
    """)


def downgrade():
    op.execute("DROP TRIGGER IF EXISTS trg_notify_admin_withdrawal_request ON withdrawals;")
    op.execute("DROP FUNCTION IF EXISTS notify_admin_withdrawal_request();")
