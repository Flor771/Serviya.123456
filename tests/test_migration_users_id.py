import sys
import os
import unittest
import uuid
import sqlalchemy as sa
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.database.database import Base
from app.models.models import User, WorkerProfile, Wallet, Service, UserRoleEnum

class TestUsersUUIDAndForeignKeys(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.session = self.Session()

    def tearDown(self):
        self.session.close()

    def test_user_uuid_and_fk_relations(self):
        user_uuid = str(uuid.uuid4())
        new_user = User(
            id=user_uuid,
            first_name="María",
            last_name="Rodríguez",
            email=f"maria_{uuid.uuid4().hex[:6]}@example.com",
            phone="8095550200",
            hashed_password="hashed_password_sample",
            role=UserRoleEnum.TRABAJADOR
        )

        worker_profile = WorkerProfile(
            user_id=user_uuid,
            specialties="Electricista Certificado"
        )

        wallet = Wallet(
            worker_id=user_uuid,
            available_balance=1500.0
        )

        self.session.add(new_user)
        self.session.add(worker_profile)
        self.session.add(wallet)
        self.session.commit()

        # Retrieve and assert types
        retrieved_user = self.session.query(User).filter_by(id=user_uuid).first()
        self.assertIsNotNone(retrieved_user)
        self.assertEqual(retrieved_user.id, user_uuid)
        self.assertIsInstance(retrieved_user.id, str)

        retrieved_profile = self.session.query(WorkerProfile).filter_by(user_id=user_uuid).first()
        self.assertIsNotNone(retrieved_profile)
        self.assertEqual(retrieved_profile.user_id, user_uuid)
        self.assertIsInstance(retrieved_profile.user_id, str)

        # Inspect inspector foreign keys
        inspector = sa.inspect(self.engine)
        fks_worker = inspector.get_foreign_keys("worker_profiles")
        referred_tables_worker = [fk["referred_table"] for fk in fks_worker]
        self.assertIn("users", referred_tables_worker)

        fks_wallet = inspector.get_foreign_keys("wallets")
        referred_tables_wallet = [fk["referred_table"] for fk in fks_wallet]
        self.assertIn("users", referred_tables_wallet)

        fks_services = inspector.get_foreign_keys("services")
        referred_tables_services = [fk["referred_table"] for fk in fks_services]
        self.assertIn("users", referred_tables_services)

        # Cleanup
        self.session.delete(wallet)
        self.session.delete(worker_profile)
        self.session.delete(retrieved_user)
        self.session.commit()

if __name__ == "__main__":
    unittest.main()
