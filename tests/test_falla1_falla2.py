import sys
import os
import unittest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.main import app
from app.database.database import Base
from app.core.deps import get_db
from app.models.models import User, Wallet, WorkerProfile, Service, ServiceStatusEnum
from app.core.security import verify_password

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

class TestFalla1AndFalla2(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)

    def test_falla_1_trabajador_registration_no_bank_required(self):
        # 1. Register CLIENTE without bank
        cliente_email = f"cliente_{uuid.uuid4().hex[:6]}@example.com"
        pwd = "SecurePassword123!"
        resp_c = self.client.post("/api/v1/auth/register", json={
            "first_name": "Ana",
            "last_name": "Martínez",
            "email": cliente_email,
            "phone": "8095550100",
            "password": pwd,
            "confirm_password": pwd,
            "role": "CLIENTE",
            "accept_policies": True
        })
        self.assertEqual(resp_c.status_code, 200)

        # 2. Register TRABAJADOR without bank
        worker_email = f"worker_{uuid.uuid4().hex[:6]}@example.com"
        resp_w = self.client.post("/api/v1/auth/register", json={
            "first_name": "Carlos",
            "last_name": "Rosario",
            "email": worker_email,
            "phone": "8095550200",
            "password": pwd,
            "confirm_password": pwd,
            "role": "TRABAJADOR",
            "cedula": "001-1234567-8",
            "accept_policies": True
        })
        self.assertEqual(resp_w.status_code, 200, f"Worker registration without bank failed: {resp_w.text}")
        w_token = resp_w.json()["token"]

        # 3. Login of created worker
        resp_login = self.client.post("/api/v1/auth/login", json={
            "email": worker_email,
            "password": pwd
        })
        self.assertEqual(resp_login.status_code, 200)

        # 4. Check worker wallet initial balance == RD$0.00
        headers_w = {"Authorization": f"Bearer {w_token}"}
        resp_wallet = self.client.get("/api/v1/wallet", headers=headers_w)
        self.assertEqual(resp_wallet.status_code, 200)
        wallet_data = resp_wallet.json()["wallet"]
        self.assertEqual(wallet_data["available_rd"], 0.0)

        # 5. CLIENTE does not get worker wallet and cannot withdraw (403)
        c_token = resp_c.json()["token"]
        headers_c = {"Authorization": f"Bearer {c_token}"}
        resp_withdraw_c = self.client.post("/api/v1/wallet/withdraw", json={
            "amount_rd": 500.0,
            "bank_name": "Banco Popular",
            "account_type": "AHORROS",
            "account_number": "123456789",
            "account_holder_name": "Ana Martínez",
            "account_holder_cedula": "00112345678"
        }, headers=headers_c)
        self.assertEqual(resp_withdraw_c.status_code, 403)

        # 6. Worker deposit simulation so balance > 0 to test withdrawals
        self.client.post("/api/v1/wallet/deposit", json={"amount_rd": 5000.0}, headers=headers_w)

        # 7. Valid bank withdrawal (Banco Popular, BHD, Banreservas)
        resp_w_pop = self.client.post("/api/v1/wallet/withdraw", json={
            "amount_rd": 1000.0,
            "bank_name": "Banco Popular",
            "account_type": "AHORROS",
            "account_number": "123456789",
            "confirm_account_number": "123456789",
            "account_holder_name": "Carlos Rosario",
            "account_holder_cedula": "00112345678"
        }, headers=headers_w)
        self.assertEqual(resp_w_pop.status_code, 200)

        # 8. Mismatched account numbers -> rejected (400)
        resp_mismatch = self.client.post("/api/v1/wallet/withdraw", json={
            "amount_rd": 1000.0,
            "bank_name": "Banco Popular",
            "account_type": "AHORROS",
            "account_number": "123456789",
            "confirm_account_number": "999999999",
            "account_holder_name": "Carlos Rosario",
            "account_holder_cedula": "00112345678"
        }, headers=headers_w)
        self.assertEqual(resp_mismatch.status_code, 400)

        # 9. Invalid bank name -> rejected (400)
        resp_bad_bank = self.client.post("/api/v1/wallet/withdraw", json={
            "amount_rd": 1000.0,
            "bank_name": "Banco Ficticio Inexistente",
            "account_type": "AHORROS",
            "account_number": "123456789",
            "confirm_account_number": "123456789",
            "account_holder_name": "Carlos Rosario",
            "account_holder_cedula": "00112345678"
        }, headers=headers_w)
        self.assertEqual(resp_bad_bank.status_code, 400)

    def test_falla_2_cliente_publish_and_service_lifecycle(self):
        # 1. Create CLIENTE and TRABAJADOR
        pwd = "SecurePassword123!"
        c_resp = self.client.post("/api/v1/auth/register", json={
            "first_name": "María",
            "last_name": "Pérez",
            "email": f"client_svc_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "8095550300",
            "password": pwd,
            "role": "CLIENTE",
            "accept_policies": True
        })
        c_token = c_resp.json()["token"]
        headers_c = {"Authorization": f"Bearer {c_token}"}

        w_resp = self.client.post("/api/v1/auth/register", json={
            "first_name": "Juan",
            "last_name": "Gómez",
            "email": f"worker_svc_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "8095550400",
            "password": pwd,
            "role": "TRABAJADOR",
            "cedula": "001-9999999-9",
            "accept_policies": True
        })
        w_token = w_resp.json()["token"]
        headers_w = {"Authorization": f"Bearer {w_token}"}

        # 2. CLIENTE publishes a service
        service_payload = {
            "title": "Reparación de Tubería en Cocina",
            "description": "Fuga de agua urgente debajo del fregadero de la cocina.",
            "category_name": "Plomería",
            "price_rd": 2500.0,
            "province": "Distrito Nacional",
            "municipality": "Santo Domingo de Guzmán (DN)",
            "service_date": "2026-09-10",
            "service_time": "10:00 AM"
        }

        pub_resp = self.client.post("/api/v1/services", json=service_payload, headers=headers_c)
        self.assertEqual(pub_resp.status_code, 200, f"Publish service failed: {pub_resp.text}")
        pub_data = pub_resp.json()
        self.assertIn("service", pub_data)
        service_id = pub_data["service"]["id"]

        # 3. List services (verify no relation "services" does not exist error)
        list_resp = self.client.get("/api/v1/services")
        self.assertEqual(list_resp.status_code, 200)
        services = list_resp.json()["services"]
        self.assertTrue(any(s["id"] == service_id for s in services))

        # 4. Get service details
        detail_resp = self.client.get(f"/api/v1/services/{service_id}")
        self.assertEqual(detail_resp.status_code, 200)
        self.assertEqual(detail_resp.json()["service"]["title"], "Reparación de Tubería en Cocina")

        # 5. Worker can view the service and apply
        app_resp = self.client.post("/api/v1/applications", json={
            "service_id": service_id,
            "offered_price_rd": 2400.0,
            "message": "Puedo llegar hoy en la mañana con mis herramientas."
        }, headers=headers_w)
        self.assertEqual(app_resp.status_code, 200)

        # 6. Verify applications for service
        apps_resp = self.client.get(f"/api/v1/services/{service_id}/applications", headers=headers_c)
        self.assertEqual(apps_resp.status_code, 200)
        apps_list = apps_resp.json()["applications"]
        self.assertEqual(len(apps_list), 1)
        self.assertEqual(apps_list[0]["offered_price_rd"], 2400.0)

if __name__ == "__main__":
    unittest.main()
