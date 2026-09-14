"""Persist every warranty revisit lifecycle change.

Revision ID: 033_persist_warranty_revisit_history
Revises: 032_standardize_future_warranty
"""
from typing import Sequence, Union
from alembic import op

revision: str = '033_persist_warranty_revisit_history'
down_revision: Union[str, None] = '032_standardize_future_warranty'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("""
    CREATE OR REPLACE FUNCTION serviya_persist_warranty_revisit_event()
    RETURNS trigger AS $$
    DECLARE
      v_user_id text;
      v_title text;
      v_message text;
      v_next text;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        v_user_id := NEW.requested_by_user_id;
      ELSE
        v_user_id := NEW.requested_by_user_id;
      END IF;

      IF NEW.status = 'SOLICITADA' THEN
        v_title := 'Revisita solicitada';
        v_message := 'La solicitud de revisita de garantía quedó registrada en SERVIYA.';
        v_next := 'El trabajador debe revisar y programar la revisita.';
      ELSIF NEW.status = 'PROGRAMADA' THEN
        v_title := 'Revisita programada';
        v_message := 'La revisita de garantía quedó programada.';
        v_next := 'El trabajador debe iniciar la corrección en la fecha acordada.';
      ELSIF NEW.status = 'CORRECCION_EN_PROCESO' THEN
        v_title := 'Corrección de garantía iniciada';
        v_message := 'La corrección de la revisita quedó registrada como iniciada.';
        v_next := 'El trabajador debe registrar la corrección realizada.';
      ELSIF NEW.status = 'CORRECCION_REALIZADA' THEN
        v_title := 'Corrección realizada';
        v_message := 'El trabajador registró la corrección y el caso quedó pendiente de confirmación del cliente.';
        v_next := 'El cliente debe revisar y confirmar la solución.';
      ELSIF NEW.status = 'CERRADA' THEN
        v_title := 'Revisita cerrada';
        v_message := 'La solución de garantía fue confirmada y la revisita quedó cerrada.';
        v_next := 'Proceso de garantía completado.';
      ELSIF NEW.status = 'ESCALADA_ADMIN' THEN
        v_title := 'Revisita escalada';
        v_message := 'La revisita fue escalada a Administración y el estado quedó guardado.';
        v_next := 'Administración debe revisar el caso.';
      ELSE
        v_title := 'Actualización de revisita';
        v_message := 'El estado de la revisita fue actualizado y guardado.';
        v_next := 'Revisar el siguiente paso del caso.';
      END IF;

      IF to_regclass('process_events') IS NOT NULL AND v_user_id IS NOT NULL THEN
        INSERT INTO process_events (
          id, user_id, process_type, status, title, message, next_step,
          rejection_reason, correction, related_entity_id, created_at
        ) VALUES (
          gen_random_uuid()::text,
          v_user_id,
          'WARRANTY_REVISIT',
          NEW.status,
          v_title,
          v_message,
          v_next,
          NULL,
          NULL,
          NEW.id,
          CURRENT_TIMESTAMP
        );
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    bind.exec_driver_sql("""
    DROP TRIGGER IF EXISTS trg_serviya_persist_warranty_revisit ON warranty_revisits;
    CREATE TRIGGER trg_serviya_persist_warranty_revisit
    AFTER INSERT OR UPDATE OF status ON warranty_revisits
    FOR EACH ROW
    WHEN (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status)
    EXECUTE FUNCTION serviya_persist_warranty_revisit_event();
    """)


def downgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("DROP TRIGGER IF EXISTS trg_serviya_persist_warranty_revisit ON warranty_revisits;")
    bind.exec_driver_sql("DROP FUNCTION IF EXISTS serviya_persist_warranty_revisit_event();")
