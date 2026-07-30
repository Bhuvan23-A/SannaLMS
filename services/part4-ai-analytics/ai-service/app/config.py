import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Enterprise LMS - Advanced Analytics, Proctoring & Gamification Unit"
    DEBUG: bool = True
    
    # MongoDB Settings
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "lms_production_db")
    
    # Redis Settings
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))
    REDIS_DB: int = 0
    
    # Gemini API Settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # Security / Keys
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-lms-key-2026")
    RSA_KEY_PATH: str = os.path.join(os.path.dirname(__file__), "rsa_keys")
    
    # Base Verification URL for Certificates
    CERTIFICATE_VERIFY_BASE_URL: str = os.getenv("CERT_VERIFY_URL", "http://localhost:8000/api/placements/verify-certificate")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
