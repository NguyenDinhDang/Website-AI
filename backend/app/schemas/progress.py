"""Progress response schemas"""

from pydantic import BaseModel, field_validator
from datetime import datetime, timezone
from typing import Optional


class ProgressResponse(BaseModel):
    user_id:         int
    total_documents: int
    total_chats:     int
    total_quizzes:   int
    correct_answers: int
    accuracy:        float
    study_minutes:   int
    updated_at:      Optional[datetime] = None

    model_config = {"from_attributes": True}

    @field_validator("updated_at", mode="before")
    @classmethod
    def ensure_tz(cls, v):
        """Ensure updated_at is always a valid datetime (SQLite may return None)."""
        if v is None:
            return datetime.now(timezone.utc)
        return v
