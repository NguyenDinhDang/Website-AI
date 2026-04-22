from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.schemas.document import DocumentResponse, DocumentListResponse
from app.schemas.ai import (
    SummarizeRequest, SummarizeResponse,
    QuizRequest, QuizResponse, QuizQuestion,
    ChatRequest, ChatResponse,
    ExplainRequest, ExplainResponse,
    GradeRequest, GradeResponse,
)
from app.schemas.progress import ProgressResponse
