"""
Auth Service — register, login, token refresh
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.progress import Progress
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import ConflictError, UnauthorizedError
from app.schemas.auth import RegisterRequest, TokenResponse, UserResponse

logger = logging.getLogger(__name__)


async def register(req: RegisterRequest, db: AsyncSession) -> UserResponse:
    # Check duplicates
    existing = await db.execute(
        select(User).where((User.email == req.email) | (User.username == req.username))
    )
    if existing.scalar_one_or_none():
        raise ConflictError("Email or username already registered")

    user = User(
        email=req.email,
        username=req.username,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
    )
    db.add(user)
    await db.flush()   # get user.id before commit

    # Create default progress row
    db.add(Progress(user_id=user.id))
    await db.commit()
    await db.refresh(user)

    logger.info("New user registered: %s (id=%d)", user.email, user.id)
    return UserResponse.model_validate(user)


async def login(email: str, password: str, db: AsyncSession) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        raise UnauthorizedError("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedError("Account is disabled")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


async def refresh_tokens(refresh_token: str, db: AsyncSession) -> TokenResponse:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedError("Invalid refresh token")

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise UnauthorizedError("User not found")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )
