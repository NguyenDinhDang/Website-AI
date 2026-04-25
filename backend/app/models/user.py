"""User ORM model"""

from sqlalchemy import Boolean, String, DateTime, func, event
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from app.database.session import Base


class User(Base):
    __tablename__ = "users"

    id:              Mapped[int]  = mapped_column(primary_key=True, index=True)
    email:           Mapped[str]  = mapped_column(String(255), unique=True, index=True, nullable=False)
    username:        Mapped[str]  = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str]  = mapped_column(String(255), nullable=False)
    full_name:       Mapped[str]  = mapped_column(String(200), default="")
    is_active:       Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )

    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    chats     = relationship("Chat",     back_populates="user",  cascade="all, delete-orphan")
    quizzes   = relationship("Quiz",     back_populates="user",  cascade="all, delete-orphan")
    progress  = relationship("Progress", back_populates="user",  cascade="all, delete-orphan")


@event.listens_for(User, "before_update")
def _user_touch(mapper, connection, target):
    target.updated_at = datetime.now(timezone.utc)
