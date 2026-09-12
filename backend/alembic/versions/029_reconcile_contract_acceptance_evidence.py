"""Reconcile contract acceptance columns from acceptance notifications."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "029_reconcile_contract_acceptance"
down_revision: Union[str, None] = "028_clean_test_data"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("""
        WITH client_events AS (
            SELECT n.related_entity_id AS service_id, MIN(n.created_at) AS accepted_at
            FROM notifications n
            WHERE n.type = 'CONTRACT_ACCEPTED'
              AND n.message LIKE 'CLIENTE aceptó el contrato %'
              AND n.related_entity_id IS NOT NULL
            GROUP BY n.related_entity_id
        )
        UPDATE digital_contracts dc
        SET client_accepted_at = ce.accepted_at,
            client_acceptance_hash = encode(
                digest(dc.content_hash || '|' || s.client_id || '|CLIENTE|' || ce.accepted_at::text || '|RECOVERED', 'sha256'), 'hex'
            )
        FROM client_events ce
        JOIN services s ON s.id = ce.service_id
        WHERE dc.service_id = ce.service_id AND dc.client_accepted_at IS NULL
    """))

    op.execute(sa.text("""
        WITH worker_events AS (
            SELECT n.related_entity_id AS service_id, MIN(n.created_at) AS accepted_at
            FROM notifications n
            WHERE n.type = 'CONTRACT_ACCEPTED'
              AND n.message LIKE 'TRABAJADOR aceptó el contrato %'
              AND n.related_entity_id IS NOT NULL
            GROUP BY n.related_entity_id
        )
        UPDATE digital_contracts dc
        SET worker_accepted_at = we.accepted_at,
            worker_acceptance_hash = encode(
                digest(dc.content_hash || '|' || s.worker_id || '|TRABAJADOR|' || we.accepted_at::text || '|RECOVERED', 'sha256'), 'hex'
            )
        FROM worker_events we
        JOIN services s ON s.id = we.service_id
        WHERE dc.service_id = we.service_id AND dc.worker_accepted_at IS NULL
    """))

    op.execute(sa.text("""
        UPDATE digital_contracts
        SET status = 'ACEPTADO_POR_AMBOS', locked_at = COALESCE(locked_at, CURRENT_TIMESTAMP)
        WHERE client_accepted_at IS NOT NULL
          AND worker_accepted_at IS NOT NULL
          AND status <> 'ANULADO'
    """))


def downgrade() -> None:
    pass
