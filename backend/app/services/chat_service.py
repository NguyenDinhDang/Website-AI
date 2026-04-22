"""
Chat Service — save history, call AI, return answer
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.chat import Chat
from app.models.progress import Progress
from app.services import ai_service
from app.services.document_service import get_document
from app.utils.text_splitter import truncate
from app.schemas.ai import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)


async def handle_chat(req: ChatRequest, user_id: int, db: AsyncSession) -> ChatResponse:
    context = ""
    if req.document_id:
        doc = await get_document(req.document_id, user_id, db)
        context = truncate(doc.content or "", max_chars=4000)

    answer = await ai_service.chat_qa(req.message, context)

    # Persist user message + assistant reply
    db.add(Chat(user_id=user_id, document_id=req.document_id, role="user",      content=req.message))
    db.add(Chat(user_id=user_id, document_id=req.document_id, role="assistant", content=answer))

    # Bump progress
    result = await db.execute(select(Progress).where(Progress.user_id == user_id))
    prog = result.scalar_one_or_none()
    if prog:
        prog.total_chats += 1

    await db.commit()
    return ChatResponse(answer=answer, document_id=req.document_id)


async def get_chat_history(user_id: int, document_id: int | None, db: AsyncSession) -> list[dict]:
    q = select(Chat).where(Chat.user_id == user_id).order_by(Chat.created_at)
    if document_id:
        q = q.where(Chat.document_id == document_id)
    result = await db.execute(q)
    return [{"role": c.role, "content": c.content, "created_at": c.created_at} for c in result.scalars()]
