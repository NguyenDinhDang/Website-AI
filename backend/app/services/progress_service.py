"""
Progress Service — fetch and reset user learning progress
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.progress import Progress
from app.schemas.progress import ProgressResponse
from app.core.exceptions import NotFoundError


async def get_progress(user_id: int, db: AsyncSession) -> ProgressResponse:
    result = await db.execute(select(Progress).where(Progress.user_id == user_id))
    prog = result.scalar_one_or_none()
    if not prog:
        raise NotFoundError("Progress")
    return ProgressResponse.model_validate(prog)


async def reset_progress(user_id: int, db: AsyncSession) -> ProgressResponse:
    result = await db.execute(select(Progress).where(Progress.user_id == user_id))
    prog = result.scalar_one_or_none()
    if not prog:
        raise NotFoundError("Progress")

    prog.total_documents = 0
    prog.total_chats = 0
    prog.total_quizzes = 0
    prog.correct_answers = 0
    prog.accuracy = 0.0
    prog.study_minutes = 0

    await db.commit()
    await db.refresh(prog)
    return ProgressResponse.model_validate(prog)
