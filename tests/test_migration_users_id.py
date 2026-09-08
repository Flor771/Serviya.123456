import sys
import os
import unittest
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.database.database import Base
from app.models.models import User, UserRoleEnum

class TestUsersUUIDInsertion(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite engine for fast transactional verification
        self.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.session = self.Session()

    def tearDown(self):
        self.session.close()

    def test_user_uuid_insertion_and_retrieval(self):
        user_uuid = str(uuid.uuid4())
        new_user = User(
            id=user_uuid,
            first_name="Juan",
            last_name="Pérez",
            email=f"juan_{uuid.uuid4().hex[:6]}@example.com",
            phone="8095550199",
            hashed_password="hashed_password_sample",
            role=UserRoleEnum.CLIENTE
        )

        self.session.add(new_user)
        self.session.commit()

        retrieved_user = self.session.query(User).filter_by(id=user_uuid).first()
        self.assertIsNotNone(retrieved_user)
        self.assertEqual(retrieved_user.id, user_uuid)
        self.assertEqual(retrieved_user.first_name, "Juan")
        self.assertEqual(type(retrieved_user.id), str)

        # Cleanup test user from session
        self.session.delete(retrieved_user)
        self.session.commit()

if __name__ == "__main__":
    unittest.main()
