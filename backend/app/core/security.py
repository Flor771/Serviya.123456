from datetime import datetime, timedelta
from typing import Any, Union
import bcrypt

try:
    from jose import jwt
except ImportError:
    import json
    import base64
    import hashlib
    import hmac
    class FallbackJWT:
        @staticmethod
        def encode(claims, key, algorithm="HS256"):
            claims_copy = {}
            for k, v in claims.items():
                if isinstance(v, datetime):
                    claims_copy[k] = int(v.timestamp())
                else:
                    claims_copy[k] = v
            header = base64.urlsafe_b64encode(json.dumps({"alg": algorithm, "typ": "JWT"}).encode()).decode().rstrip("=")
            payload = base64.urlsafe_b64encode(json.dumps(claims_copy).encode()).decode().rstrip("=")
            signature = base64.urlsafe_b64encode(hmac.new(key.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()).decode().rstrip("=")
            return f"{header}.{payload}.{signature}"
    jwt = FallbackJWT

from app.core.config import settings

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    try:
        pwd_bytes = plain_password.encode("utf-8")
        if len(pwd_bytes) > 72:
            pwd_bytes = pwd_bytes[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    if len(pwd_bytes) > 72:
        pwd_bytes = pwd_bytes[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")
