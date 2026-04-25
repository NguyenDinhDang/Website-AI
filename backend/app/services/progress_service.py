"""
Progress Service — fetch and reset user learning progress.
Auto-creates a Progress row if one does not exist (e.g. users registered via API).
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.progress import Progress
from app.schemas.progress import ProgressResponse


async def _get_or_create(user_id: int, db: AsyncSession) -> Progress:
    """Return the Progress row for a user, creating it if missing."""
    result = await db.execute(select(Progress).where(Progress.user_id == user_id))
    prog = result.scalar_one_or_none()
    if prog is None:
        prog = Progress(user_id=user_id)
        db.add(prog)
        await db.flush()   # get id without committing
    return prog


async def get_progress(user_id: int, db: AsyncSession) -> ProgressResponse:
    prog = await _get_or_create(user_id, db)
    await db.commit()
    await db.refresh(prog)
    return ProgressResponse.model_validate(prog)


async def reset_progress(user_id: int, db: AsyncSession) -> ProgressResponse:
    prog = await _get_or_create(user_id, db)

    prog.total_documents = 0
    prog.total_chats = 0
    prog.total_quizzes = 0
    prog.correct_answers = 0
    prog.accuracy = 0.0
    prog.study_minutes = 0

    await db.commit()
    await db.refresh(prog)
    return ProgressResponse.model_validate(prog)
