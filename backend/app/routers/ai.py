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
from app.schemas.ai import (
    SummarizeRequest, SummarizeResponse,
    QuizRequest, QuizResponse,
    ChatRequest, ChatResponse,
    ExplainRequest, ExplainResponse,
    GradeRequest, GradeResponse,
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


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(
    req: SummarizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Summarize a document. Result is cached after first call."""
    return await summarize_service.summarize_document(req.document_id, current_user.id, db)


@router.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(
    req: QuizRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate multiple-choice quiz questions from a document or topic."""
    return await quiz_service.generate_quiz(req, current_user.id, db)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ask a question, optionally grounded in a specific document."""
    return await chat_service.handle_chat(req, current_user.id, db)


@router.post("/explain", response_model=ExplainResponse)
async def explain(
    req: ExplainRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
):
    """Submit a quiz answer and receive feedback."""
    return await quiz_service.grade_quiz(req, current_user.id, db)


@router.get("/chat/history")
async def chat_history(
    document_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve chat history, optionally filtered by document."""
    return await chat_service.get_chat_history(current_user.id, document_id, db)
