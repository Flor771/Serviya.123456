import os
try:
    from pydantic_settings import BaseSettings
except ImportError:
    try:
        from pydantic import BaseSettings
    except ImportError:
        class BaseSettings: pass

class Settings(BaseSettings):
    PROJECT_NAME: str = "SERVIYA.do"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENV: str = os.getenv("ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://serviya_user:password123@localhost:5432/serviya_db")
    PLATFORM_COMMISSION_PERCENT: float = float(os.getenv("PLATFORM_COMMISSION_PERCENT", "10.0"))
    MIN_WITHDRAWAL_RD: float = 500.0
    MIN_SERVICE_PRICE_RD: float = 300.0
    class Config:
        case_sensitive = True

settings = Settings()
if settings.ENV.lower() == "production" and not settings.SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be configured in production")
if not settings.SECRET_KEY:
    settings.SECRET_KEY = "dev-only-serviya-secret-change-me"
