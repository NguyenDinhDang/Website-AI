"""
Progress router — /api/v1/progress
GET    /     — get learning stats
DELETE /     — reset stats
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.schemas.progress import ProgressResponse
from app.services import progress_service
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=ProgressResponse)
async def get_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's learning progress statistics."""
    return await progress_service.get_progress(current_user.id, db)


@router.delete("/", response_model=ProgressResponse)
async def reset_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reset all learning statistics to zero."""
    return await progress_service.reset_progress(current_user.id, db)
