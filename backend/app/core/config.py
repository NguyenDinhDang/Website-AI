"""
Central configuration — reads from .env via pydantic-settings
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import secrets


class Settings(BaseSettings):
    APP_NAME: str = "AI Learning Assistant"
    ENV: str = "development"
    DEBUG: bool = False
    PORT: int = 8000
    CORS_ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
    ]
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/ai_learning"
    JWT_SECRET_KEY: str = secrets.token_hex(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL_NAME: str = "gpt-4o-mini"
    AI_MAX_RETRIES: int = 3
    AI_RETRY_DELAY: float = 1.0
    AI_REQUEST_TIMEOUT: int = 60
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 20
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "txt", "md", "docx"]

    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
