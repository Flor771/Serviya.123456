"""Issue SERVIYA digital contracts when escrow enters RETENIDO, including INSERTs."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "027_contract_issue_on_escrow_create"
down_revision: Union[str, None] = "026_escrow_ledger_linkage"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "escrows" not in tables or "digital_contracts" not in tables:
        return

    op.execute(sa.text("""
    CREATE OR REPLACE FUNCTION serviya_issue_digital_contract()
    RETURNS trigger AS $$
    DECLARE
        svc RECORD;
        client RECORD;
        worker RECORD;
        contract_no TEXT;
        payload JSONB;
        payload_text TEXT;
    BEGIN
        IF NEW.status <> 'RETENIDO' THEN
            RETURN NEW;
        END IF;
        IF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') = 'RETENIDO' THEN
            RETURN NEW;
        END IF;

        SELECT s.* INTO svc FROM services s WHERE s.id = NEW.service_id;
        SELECT u.id,u.first_name,u.last_name,u.email,u.phone INTO client
        FROM users u WHERE u.id = NEW.client_id;
        SELECT u.id,u.first_name,u.last_name,u.email,u.phone INTO worker
        FROM users u WHERE u.id = NEW.worker_id;

        IF svc.id IS NULL OR client.id IS NULL OR worker.id IS NULL THEN
            RETURN NEW;
        END IF;

        contract_no = 'SRV-CON-' || UPPER(SUBSTRING(NEW.service_id::text,1,8)) || '-' || UPPER(SUBSTRING(NEW.id::text,1,8));
        payload = jsonb_build_object(
            'document_type','CONTRATO_DIGITAL_DE_PRESTACION_DE_SERVICIOS_SERVIYA',
            'platform','SERVIYA',
            'version',1,
            'contract_number',contract_no,
            'issued_at',CURRENT_TIMESTAMP,
            'issued_by_admin_id','ADMIN_APPROVE_DEPOSIT',
            'service',jsonb_build_object(
                'id',svc.id,'title',svc.title,'description',svc.description,
                'category',svc.category_name,'subcategory',svc.subcategory,
                'province',svc.province,'municipality',svc.municipality,
                'address_approx',svc.address_approx,'service_date',svc.service_date,
                'service_time',svc.service_time,'estimated_duration',svc.estimated_duration,
                'requirements',to_jsonb(COALESCE(svc.requirements,'[]'::json))
            ),
            'agreement',jsonb_build_object(
                'negotiation_status',svc.negotiation_status,
                'negotiated_price_rd',svc.negotiated_price_rd,
                'price_agreed_at',svc.price_agreed_at,
                'payment_type',svc.payment_type
            ),
            'parties',jsonb_build_object(
                'client',jsonb_build_object('id',client.id,'name',TRIM(COALESCE(client.first_name,'')||' '||COALESCE(client.last_name,'')),'email',client.email,'phone',client.phone),
                'worker',jsonb_build_object('id',worker.id,'name',TRIM(COALESCE(worker.first_name,'')||' '||COALESCE(worker.last_name,'')),'email',worker.email,'phone',worker.phone)
            ),
            'custody',jsonb_build_object(
                'escrow_id',NEW.id,'status',NEW.status,'total_amount_rd',NEW.total_amount_rd,
                'commission_percent',COALESCE(NEW.commission_rate_percent,10.0),
                'commission_rd',NEW.commission_amount_rd,'worker_payout_rd',NEW.worker_payout_rd,
                'payment_method',NEW.payment_method,'voucher_received',(NEW.voucher_url IS NOT NULL),
                'custody_activated_at',CURRENT_TIMESTAMP
            ),
            'terms',jsonb_build_array(
                'El precio corresponde al precio final acordado entre cliente y trabajador.',
                'El pago corresponde exclusivamente a este trabajo y quedó retenido en Custodia SERVIYA tras verificación administrativa.',
                'El trabajador se obliga a ejecutar el servicio descrito y entregar evidencia de finalización cuando corresponda.',
                'La confirmación del cliente no libera automáticamente los fondos; la liberación final corresponde exclusivamente a Administración SERVIYA.',
                'SERVIYA conserva estados, comprobantes, aprobaciones y eventos relacionados para fines de trazabilidad y prueba.',
                'Las partes deben conservar este documento y sus comprobantes; las controversias se tramitan mediante el procedimiento de disputas de SERVIYA.',
                'La garantía y sus condiciones se rigen por las políticas vigentes de SERVIYA asociadas al servicio.'
            ),
            'legal_notice','Este documento electrónico constituye un registro de la operación, del acuerdo y de las actuaciones registradas en SERVIYA. Su valor probatorio o fuerza contractual frente a terceros dependerá de la legislación aplicable y de las formalidades que dicha legislación exija; para operaciones que requieran una formalidad especial se recomienda asesoría legal y, cuando corresponda, firma electrónica cualificada o notarización.'
        );
        payload_text = payload::text;

        INSERT INTO digital_contracts(
            id,service_id,escrow_id,contract_number,version,status,content_json,
            content_text,content_hash,generated_at,generated_by_admin
        )
        VALUES(
            gen_random_uuid()::text,NEW.service_id,NEW.id,contract_no,1,'EMITIDO',payload,
            payload_text,encode(digest(payload_text,'sha256'),'hex'),CURRENT_TIMESTAMP,'ADMIN_APPROVE_DEPOSIT'
        )
        ON CONFLICT(service_id) DO NOTHING;

        INSERT INTO notifications(id,user_id,title,message,type,related_entity_id,read,created_at)
        SELECT gen_random_uuid()::text,client.id,'Contrato digital disponible',
            'El pago fue verificado y el contrato digital del servicio ya está disponible para leer y firmar.',
            'CONTRACT_ISSUED',NEW.service_id,false,CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
            SELECT 1 FROM notifications n WHERE n.user_id=client.id
            AND n.type='CONTRACT_ISSUED' AND n.related_entity_id=NEW.service_id
        );

        INSERT INTO notifications(id,user_id,title,message,type,related_entity_id,read,created_at)
        SELECT gen_random_uuid()::text,worker.id,'Contrato digital disponible',
            'El pago fue verificado y quedó retenido en Custodia. El contrato digital del servicio ya está disponible para leer y firmar.',
            'CONTRACT_ISSUED',NEW.service_id,false,CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
            SELECT 1 FROM notifications n WHERE n.user_id=worker.id
            AND n.type='CONTRACT_ISSUED' AND n.related_entity_id=NEW.service_id
        );

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """))

    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_serviya_issue_digital_contract ON escrows"))
    op.execute(sa.text("""
        CREATE TRIGGER trg_serviya_issue_digital_contract
        AFTER INSERT OR UPDATE OF status ON escrows
        FOR EACH ROW EXECUTE FUNCTION serviya_issue_digital_contract();
    """))

    # Backfill every existing RETENIDO escrow that has no contract.
    op.execute(sa.text("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN
                SELECT e.id
                FROM escrows e
                LEFT JOIN digital_contracts dc ON dc.service_id=e.service_id
                WHERE e.status='RETENIDO' AND dc.id IS NULL
                ORDER BY e.created_at
            LOOP
                UPDATE escrows SET status='RETENIDO' WHERE id=r.id;
            END LOOP;
        END $$;
    """))


def downgrade() -> None:
    bind = op.get_bind()
    if "escrows" in set(sa.inspect(bind).get_table_names()):
        op.execute(sa.text("DROP TRIGGER IF EXISTS trg_serviya_issue_digital_contract ON escrows"))
