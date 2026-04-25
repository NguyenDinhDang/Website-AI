"""
AI router — /api/v1/ai
POST /summarize       — summarize document
POST /generate-quiz   — generate quiz questions
POST /chat            — chat Q&A
POST /explain         — explain a passage
POST /grade           — grade a quiz answer
GET  /chat/history    — retrieve chat history
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.core.rate_limit import ai_rate_limit
from app.schemas.ai import (
    SummarizeRequest, SummarizeResponse,
    QuizRequest, QuizResponse,
    ChatRequest, ChatResponse,
    ExplainRequest, ExplainResponse,
    GradeRequest, GradeResponse,
    ChatHistoryResponse, ChatHistoryItem,
)
from app.services import (
    summarize_service,
    quiz_service,
    chat_service,
    ai_service,
)
from app.services.document_service import get_document
from app.utils.text_splitter import truncate
from app.models.user import User

router = APIRouter()

# Shared rate-limit dependencies — defined once, reused across endpoints.
# Adjust the numbers in config if needed; these are conservative defaults.
_chat_limit    = ai_rate_limit(max_calls=20, window_seconds=60)   # 20 msg/min
_quiz_limit    = ai_rate_limit(max_calls=10, window_seconds=60)   # 10 quizzes/min
_summary_limit = ai_rate_limit(max_calls=10, window_seconds=60)   # 10 summaries/min
_explain_limit = ai_rate_limit(max_calls=20, window_seconds=60)   # 20 explains/min
_grade_limit   = ai_rate_limit(max_calls=30, window_seconds=60)   # 30 grades/min


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(
    req: SummarizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(_summary_limit),
):
    """Summarize a document. Result is cached after first call."""
    return await summarize_service.summarize_document(req.document_id, current_user.id, db)


@router.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(
    req: QuizRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(_quiz_limit),
):
    """Generate multiple-choice quiz questions from a document or topic."""
    return await quiz_service.generate_quiz(req, current_user.id, db)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(_chat_limit),
):
    """Ask a question, optionally grounded in a specific document."""
    return await chat_service.handle_chat(req, current_user.id, db)


@router.post("/explain", response_model=ExplainResponse)
async def explain(
    req: ExplainRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(_explain_limit),
):
    """Explain a text passage in simple terms."""
    context = ""
    if req.document_id:
        doc = await get_document(req.document_id, current_user.id, db)
        context = truncate(doc.content or "", max_chars=3000)

    explanation = await ai_service.explain(req.text, context)
    return ExplainResponse(explanation=explanation)


@router.post("/grade", response_model=GradeResponse)
async def grade(
    req: GradeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(_grade_limit),
):
    """Submit a quiz answer and receive feedback."""
    return await quiz_service.grade_quiz(req, current_user.id, db)


@router.get("/chat/history", response_model=ChatHistoryResponse)
async def chat_history(
    document_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve chat history, optionally filtered by document."""
    items = await chat_service.get_chat_history(current_user.id, document_id, db)
    return ChatHistoryResponse(
        items=[ChatHistoryItem(**i) for i in items],
        total=len(items),
    )
