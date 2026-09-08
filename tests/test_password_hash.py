import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.core.security import get_password_hash, verify_password, create_access_token

class TestPasswordSecurity(unittest.TestCase):
    def test_password_hashing_and_verification(self):
        password = "Prueba1234!"
        hashed = get_password_hash(password)
        
        self.assertIsNotNone(hashed)
        self.assertTrue(len(hashed) > 10)
        self.assertNotEqual(password, hashed)
        
        # Verify correct password
        is_valid = verify_password("Prueba1234!", hashed)
        self.assertTrue(is_valid, "El hash de la contraseña correcta debe verificar True")
        
        # Verify incorrect password
        is_invalid = verify_password("ContraseñaIncorrecta!", hashed)
        self.assertFalse(is_invalid, "El hash con contraseña incorrecta debe verificar False")

    def test_access_token_creation(self):
        token = create_access_token("test-user-id-123")
        self.assertIsNotNone(token)
        self.assertTrue(len(token) > 20)

if __name__ == "__main__":
    unittest.main()
