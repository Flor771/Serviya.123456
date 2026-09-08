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
from app.models.models import User, Wallet, WorkerProfile
from app.core.security import verify_password

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class TestRegistrationAndAuth(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.client = TestClient(app)

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)

    def test_1_cliente_registration_no_wallet(self):
        test_email = f"cliente_{uuid.uuid4().hex[:6]}@example.com"
        raw_password = "SecurePassword123!"

        payload = {
            "first_name": "Juan",
            "last_name": "Pérez",
            "email": test_email,
            "phone": "8095550100",
            "password": raw_password,
            "confirm_password": raw_password,
            "role": "CLIENTE",
            "accept_policies": True
        }

        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertEqual(data["user"]["email"], test_email)

        # Check DB: User created with password_hash, NO Wallet created
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == test_email).first()
        self.assertIsNotNone(user)
        self.assertTrue(verify_password(raw_password, user.password_hash))
        wallet = db.query(Wallet).filter(Wallet.worker_id == user.id).first()
        self.assertIsNone(wallet, "CLIENTE must NOT have a Wallet")
        db.close()

    def test_2_policies_not_accepted(self):
        test_email = f"user_{uuid.uuid4().hex[:6]}@example.com"
        payload = {
            "first_name": "Carlos",
            "last_name": "Gómez",
            "email": test_email,
            "phone": "8095550101",
            "password": "SecurePassword123!",
            "role": "CLIENTE",
            "accept_policies": False
        }

        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("politicas", response.json()["detail"].lower().replace("í", "i"))

    def test_3_password_mismatch(self):
        test_email = f"user_{uuid.uuid4().hex[:6]}@example.com"
        payload = {
            "first_name": "Carlos",
            "last_name": "Gómez",
            "email": test_email,
            "phone": "8095550101",
            "password": "SecurePassword123!",
            "confirm_password": "DifferentPassword123!",
            "role": "CLIENTE",
            "accept_policies": True
        }

        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("no coinciden", response.json()["detail"].lower())

    def test_4_cliente_cannot_withdraw(self):
        # Register cliente and log in
        test_email = f"cliente_withdraw_{uuid.uuid4().hex[:6]}@example.com"
        payload = {
            "first_name": "Laura",
            "last_name": "Díaz",
            "email": test_email,
            "phone": "8095550105",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "CLIENTE",
            "accept_policies": True
        }
        resp = self.client.post("/api/v1/auth/register", json=payload)
        token = resp.json()["token"]

        headers = {"Authorization": f"Bearer {token}"}
        withdraw_payload = {
            "amount_rd": 500.0,
            "bank_name": "Banco Popular",
            "account_type": "AHORROS",
            "account_number": "123456789",
            "account_holder_name": "Laura Díaz",
            "account_holder_cedula": "00112345678"
        }
        w_resp = self.client.post("/api/v1/wallet/withdraw", json=withdraw_payload, headers=headers)
        self.assertEqual(w_resp.status_code, 403)
        self.assertIn("solamente los usuarios con rol trabajador", w_resp.json()["detail"].lower().replace("é", "e"))

    def test_5_trabajador_registration_bancos_and_accounts(self):
        allowed_banks = ["Banco Popular", "BHD", "Banreservas"]
        for bank in allowed_banks:
            test_email = f"worker_{bank.replace(' ', '_').lower()}_{uuid.uuid4().hex[:4]}@example.com"
            payload = {
                "first_name": "Pedro",
                "last_name": "Ramírez",
                "email": test_email,
                "phone": "8095550200",
                "password": "WorkerPassword123!",
                "confirm_password": "WorkerPassword123!",
                "role": "TRABAJADOR",
                "cedula": "00112345678",
                "bank_name": bank,
                "account_number": "9876543210",
                "confirm_account_number": "9876543210",
                "accept_policies": True
            }
            response = self.client.post("/api/v1/auth/register", json=payload)
            self.assertEqual(response.status_code, 200, f"Registration failed for bank {bank}: {response.text}")

            # Verify in DB
            db = TestingSessionLocal()
            user = db.query(User).filter(User.email == test_email).first()
            self.assertIsNotNone(user)
            wp = db.query(WorkerProfile).filter(WorkerProfile.user_id == user.id).first()
            self.assertIsNotNone(wp)
            self.assertEqual(wp.bank_name, bank)
            self.assertEqual(wp.account_number, "9876543210")

            # Worker Wallet created with worker_id and initial balance 0
            wallet = db.query(Wallet).filter(Wallet.worker_id == user.id).first()
            self.assertIsNotNone(wallet)
            self.assertEqual(wallet.worker_id, user.id)
            self.assertEqual(wallet.available_balance, 0.0)
            self.assertEqual(wallet.pending_custody_balance, 0.0)
            db.close()

    def test_6_trabajador_account_mismatch_rejected(self):
        test_email = f"worker_mismatch_{uuid.uuid4().hex[:4]}@example.com"
        payload = {
            "first_name": "José",
            "last_name": "Santos",
            "email": test_email,
            "phone": "8095550201",
            "password": "WorkerPassword123!",
            "confirm_password": "WorkerPassword123!",
            "role": "TRABAJADOR",
            "cedula": "00112345679",
            "bank_name": "Banco Popular",
            "account_number": "1112223334",
            "confirm_account_number": "1112223335",
            "accept_policies": True
        }
        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("no coinciden", response.json()["detail"].lower())

    def test_7_trabajador_invalid_bank_rejected(self):
        test_email = f"worker_badbank_{uuid.uuid4().hex[:4]}@example.com"
        payload = {
            "first_name": "José",
            "last_name": "Santos",
            "email": test_email,
            "phone": "8095550201",
            "password": "WorkerPassword123!",
            "confirm_password": "WorkerPassword123!",
            "role": "TRABAJADOR",
            "cedula": "00112345679",
            "bank_name": "Banco Ficticio",
            "account_number": "1112223334",
            "confirm_account_number": "1112223334",
            "accept_policies": True
        }
        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, 400)

    def test_8_login_after_registration(self):
        test_email = f"user_login_{uuid.uuid4().hex[:6]}@example.com"
        raw_password = "LoginPass2026!"

        reg_payload = {
            "first_name": "Pedro",
            "last_name": "Sánchez",
            "email": test_email,
            "phone": "8095550103",
            "password": raw_password,
            "confirm_password": raw_password,
            "role": "CLIENTE",
            "accept_policies": True
        }
        reg_resp = self.client.post("/api/v1/auth/register", json=reg_payload)
        self.assertEqual(reg_resp.status_code, 200)

        login_payload = {
            "email": test_email,
            "password": raw_password
        }
        login_resp = self.client.post("/api/v1/auth/login", json=login_payload)
        self.assertEqual(login_resp.status_code, 200)
        login_data = login_resp.json()
        self.assertIn("token", login_data)
        self.assertEqual(login_data["user"]["email"], test_email)

if __name__ == "__main__":
    unittest.main()
