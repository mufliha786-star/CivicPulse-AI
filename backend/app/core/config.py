"""
CivicPulse AI — Backend Configuration & Settings
"""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicPulse AI"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "civicpulse_secret_key_2026_super_secure")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./civicpulse.db"
    )

    # AI & Google Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-3.8-flash"

    # Authority Routing SLA defaults
    DEFAULT_ACK_SLA_HOURS: int = 24
    DEFAULT_RESOLUTION_SLA_HOURS: int = 72

    class Config:
        case_sensitive = True


settings = Settings()
