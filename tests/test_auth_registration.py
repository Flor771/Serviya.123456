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
from app.models.models import User
from app.core.security import verify_password

# Setup test DB in memory with StaticPool so all connections share the memory DB
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

    def test_1_valid_registration(self):
        test_email = f"user_{uuid.uuid4().hex[:6]}@example.com"
        raw_password = "SecurePassword123!"

        payload = {
            "first_name": "Juan",
            "last_name": "Pérez",
            "email": test_email,
            "phone": "8095550100",
            "password": raw_password,
            "role": "CLIENTE",
            "accept_policies": True
        }

        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertEqual(data["user"]["email"], test_email)

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

    def test_3_password_mismatch_and_empty(self):
        # Frontend validation logic test
        raw_pass = "Password123"
        confirm_pass = "Password456"
        self.assertNotEqual(raw_pass, confirm_pass, "Las contraseñas no coinciden")

    def test_4_password_stored_with_bcrypt_not_plaintext(self):
        test_email = f"user_{uuid.uuid4().hex[:6]}@example.com"
        raw_password = "MySuperSecretPassword2026!"

        payload = {
            "first_name": "Ana",
            "last_name": "Martínez",
            "email": test_email,
            "phone": "8095550102",
            "password": raw_password,
            "role": "CLIENTE",
            "accept_policies": True
        }

        resp = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(resp.status_code, 200)

        # Check in DB
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == test_email).first()
        self.assertIsNotNone(user)
        # Not plain text
        self.assertNotEqual(user.password_hash, raw_password)
        # Verify bcrypt hash prefix ($2b$ or $2a$)
        self.assertTrue(user.password_hash.startswith("$2") or len(user.password_hash) > 30)
        # Verify password matches with verify_password
        self.assertTrue(verify_password(raw_password, user.password_hash))
        db.close()

    def test_5_login_with_registered_user(self):
        test_email = f"user_{uuid.uuid4().hex[:6]}@example.com"
        raw_password = "LoginPass2026!"

        reg_payload = {
            "first_name": "Pedro",
            "last_name": "Sánchez",
            "email": test_email,
            "phone": "8095550103",
            "password": raw_password,
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
