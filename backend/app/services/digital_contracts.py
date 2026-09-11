from sqlalchemy import text
from app.database.database import engine

def ensure_digital_contracts() -> None:
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS digital_contracts (
                id TEXT PRIMARY KEY, service_id TEXT NOT NULL UNIQUE, escrow_id TEXT NOT NULL,
                contract_number VARCHAR(80) NOT NULL UNIQUE, version INTEGER NOT NULL DEFAULT 1,
                status VARCHAR(40) NOT NULL DEFAULT 'EMITIDO', content_json JSONB NOT NULL,
                content_text TEXT NOT NULL, content_hash VARCHAR(64) NOT NULL,
                generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                generated_by_admin TEXT NOT NULL, client_accepted_at TIMESTAMP NULL,
                worker_accepted_at TIMESTAMP NULL, client_acceptance_ip VARCHAR(100) NULL,
                worker_acceptance_ip VARCHAR(100) NULL, client_user_agent TEXT NULL,
                worker_user_agent TEXT NULL, client_acceptance_hash VARCHAR(64) NULL,
                worker_acceptance_hash VARCHAR(64) NULL, locked_at TIMESTAMP NULL
            )
        """))
        conn.execute(text("ALTER TABLE digital_contracts ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP NULL"))
        conn.execute(text("""
            CREATE OR REPLACE FUNCTION serviya_issue_digital_contract() RETURNS trigger AS $$
            DECLARE svc RECORD; client RECORD; worker RECORD; contract_no TEXT; payload JSONB; payload_text TEXT;
            BEGIN
                IF NEW.status='RETENIDO' AND COALESCE(OLD.status,'')<>'RETENIDO' THEN
                    SELECT s.* INTO svc FROM services s WHERE s.id=NEW.service_id;
                    SELECT u.id,u.first_name,u.last_name,u.email,u.phone INTO client FROM users u WHERE u.id=NEW.client_id;
                    SELECT u.id,u.first_name,u.last_name,u.email,u.phone INTO worker FROM users u WHERE u.id=NEW.worker_id;
                    contract_no='SRV-CON-'||UPPER(SUBSTRING(NEW.service_id::text,1,8))||'-'||UPPER(SUBSTRING(NEW.id::text,1,8));
                    payload=jsonb_build_object(
                        'document_type','CONTRATO_DIGITAL_DE_PRESTACION_DE_SERVICIOS_SERVIYA','platform','SERVIYA','version',1,
                        'contract_number',contract_no,'issued_at',CURRENT_TIMESTAMP,
                        'service',jsonb_build_object('id',svc.id,'title',svc.title,'description',svc.description,'category',svc.category_name,'subcategory',svc.subcategory,'province',svc.province,'municipality',svc.municipality,'address_approx',svc.address_approx,'service_date',svc.service_date,'service_time',svc.service_time,'estimated_duration',svc.estimated_duration,'requirements',to_jsonb(COALESCE(svc.requirements,'[]'::json))),
                        'agreement',jsonb_build_object('negotiation_status',svc.negotiation_status,'negotiated_price_rd',svc.negotiated_price_rd,'price_agreed_at',svc.price_agreed_at,'payment_type',svc.payment_type),
                        'parties',jsonb_build_object('client',jsonb_build_object('id',client.id,'name',TRIM(COALESCE(client.first_name,'')||' '||COALESCE(client.last_name,'')),'email',client.email,'phone',client.phone),'worker',jsonb_build_object('id',worker.id,'name',TRIM(COALESCE(worker.first_name,'')||' '||COALESCE(worker.last_name,'')),'email',worker.email,'phone',worker.phone)),
                        'custody',jsonb_build_object('escrow_id',NEW.id,'status',NEW.status,'total_amount_rd',NEW.total_amount_rd,'commission_percent',10.0,'commission_rd',NEW.commission_amount_rd,'worker_payout_rd',NEW.worker_payout_rd,'payment_method',NEW.payment_method,'voucher_received',(NEW.voucher_url IS NOT NULL),'custody_activated_at',CURRENT_TIMESTAMP),
                        'terms',jsonb_build_array('El precio corresponde al precio final acordado entre cliente y trabajador.','El pago corresponde exclusivamente a este trabajo y quedó retenido en Custodia SERVIYA tras verificación administrativa.','El trabajador se obliga a ejecutar el servicio descrito y entregar evidencia de finalización cuando corresponda.','La confirmación del cliente no libera automáticamente los fondos; la liberación final corresponde exclusivamente a Administración SERVIYA.','SERVIYA conserva estados, comprobantes, aprobaciones y eventos relacionados para fines de trazabilidad y prueba.','Las partes deben conservar este documento y sus comprobantes; las controversias se tramitan mediante el procedimiento de disputas de SERVIYA.','La garantía y sus condiciones se rigen por las políticas vigentes de SERVIYA asociadas al servicio.'),
                        'legal_notice','Este documento electrónico constituye un registro de la operación, del acuerdo y de las actuaciones registradas en SERVIYA. Su valor probatorio o fuerza contractual frente a terceros dependerá de la legislación aplicable y de las formalidades que dicha legislación exija; para operaciones que requieran una formalidad especial se recomienda asesoría legal y, cuando corresponda, firma electrónica cualificada o notarización.'
                    );
                    payload_text=payload::text;
                    INSERT INTO digital_contracts(id,service_id,escrow_id,contract_number,version,status,content_json,content_text,content_hash,generated_at,generated_by_admin)
                    VALUES(gen_random_uuid()::text,NEW.service_id,NEW.id,contract_no,1,'EMITIDO',payload,payload_text,encode(digest(payload_text,'sha256'),'hex'),CURRENT_TIMESTAMP,'ADMIN_APPROVE_DEPOSIT')
                    ON CONFLICT(service_id) DO NOTHING;
                    INSERT INTO notifications(id,user_id,title,message,type,related_entity_id,read,created_at)
                    SELECT gen_random_uuid()::text,client.id,'Contrato digital disponible','El pago fue verificado y el contrato digital del servicio ya está disponible para leer y firmar.','CONTRACT_ISSUED',NEW.service_id,false,CURRENT_TIMESTAMP
                    WHERE client.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id=client.id AND n.type='CONTRACT_ISSUED' AND n.related_entity_id=NEW.service_id);
                    INSERT INTO notifications(id,user_id,title,message,type,related_entity_id,read,created_at)
                    SELECT gen_random_uuid()::text,worker.id,'Contrato digital disponible','El pago fue verificado y quedó retenido en Custodia. El contrato digital del servicio ya está disponible para leer y firmar.','CONTRACT_ISSUED',NEW.service_id,false,CURRENT_TIMESTAMP
                    WHERE worker.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id=worker.id AND n.type='CONTRACT_ISSUED' AND n.related_entity_id=NEW.service_id);
                END IF;
                RETURN NEW;
            END; $$ LANGUAGE plpgsql;
        """))
        conn.execute(text("""
            CREATE OR REPLACE FUNCTION serviya_lock_digital_contract() RETURNS trigger AS $$
            BEGIN
                IF OLD.locked_at IS NOT NULL AND (
                    NEW.service_id IS DISTINCT FROM OLD.service_id OR NEW.escrow_id IS DISTINCT FROM OLD.escrow_id OR
                    NEW.contract_number IS DISTINCT FROM OLD.contract_number OR NEW.version IS DISTINCT FROM OLD.version OR
                    NEW.content_json IS DISTINCT FROM OLD.content_json OR NEW.content_text IS DISTINCT FROM OLD.content_text OR
                    NEW.content_hash IS DISTINCT FROM OLD.content_hash OR NEW.generated_at IS DISTINCT FROM OLD.generated_at OR
                    NEW.generated_by_admin IS DISTINCT FROM OLD.generated_by_admin OR NEW.client_accepted_at IS DISTINCT FROM OLD.client_accepted_at OR
                    NEW.worker_accepted_at IS DISTINCT FROM OLD.worker_accepted_at OR NEW.client_acceptance_ip IS DISTINCT FROM OLD.client_acceptance_ip OR
                    NEW.worker_acceptance_ip IS DISTINCT FROM OLD.worker_acceptance_ip OR NEW.client_user_agent IS DISTINCT FROM OLD.client_user_agent OR
                    NEW.worker_user_agent IS DISTINCT FROM OLD.worker_user_agent OR NEW.client_acceptance_hash IS DISTINCT FROM OLD.client_acceptance_hash OR
                    NEW.worker_acceptance_hash IS DISTINCT FROM OLD.worker_acceptance_hash
                ) THEN
                    RAISE EXCEPTION 'CONTRACT_LOCKED: el contrato digital ya fue aceptado por ambas partes y es inmutable';
                END IF;
                RETURN NEW;
            END; $$ LANGUAGE plpgsql;
        """))
        conn.execute(text("DROP TRIGGER IF EXISTS trg_serviya_issue_digital_contract ON escrows"))
        conn.execute(text("CREATE TRIGGER trg_serviya_issue_digital_contract AFTER UPDATE OF status ON escrows FOR EACH ROW EXECUTE FUNCTION serviya_issue_digital_contract()"))
        conn.execute(text("DROP TRIGGER IF EXISTS trg_serviya_lock_digital_contract ON digital_contracts"))
        conn.execute(text("CREATE TRIGGER trg_serviya_lock_digital_contract BEFORE UPDATE ON digital_contracts FOR EACH ROW EXECUTE FUNCTION serviya_lock_digital_contract()"))
        conn.execute(text("UPDATE digital_contracts SET locked_at=CURRENT_TIMESTAMP WHERE status='ACEPTADO_POR_AMBOS' AND locked_at IS NULL"))
