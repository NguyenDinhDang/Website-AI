"""Progress response schemas"""

from pydantic import BaseModel
from datetime import datetime


class ProgressResponse(BaseModel):
    user_id:         int
    total_documents: int
    total_chats:     int
    total_quizzes:   int
    correct_answers: int
    accuracy:        float
    study_minutes:   int
    updated_at:      datetime

    model_config = {"from_attributes": True}
