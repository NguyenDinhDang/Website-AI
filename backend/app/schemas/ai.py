"""AI feature request/response schemas"""

from pydantic import BaseModel
from typing import Optional


class SummarizeRequest(BaseModel):
    document_id: int


class SummarizeResponse(BaseModel):
    document_id: int
    summary:     str


class QuizRequest(BaseModel):
    document_id:  Optional[int] = None
    topic:        Optional[str] = None
    num_questions: int = 5


class QuizQuestion(BaseModel):
    question:      str
    options:       list[str]
    correct_index: int
    explanation:   str


class QuizResponse(BaseModel):
    questions: list[QuizQuestion]


class ChatRequest(BaseModel):
    message:     str
    document_id: Optional[int] = None


class ChatResponse(BaseModel):
    answer:      str
    document_id: Optional[int] = None


class ExplainRequest(BaseModel):
    text:        str
    document_id: Optional[int] = None


class ExplainResponse(BaseModel):
    explanation: str


class GradeRequest(BaseModel):
    quiz_id:        int
    selected_index: int


class GradeResponse(BaseModel):
    is_correct:  bool
    explanation: str
    correct_index: int
