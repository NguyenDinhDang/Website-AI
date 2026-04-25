"""User progress ORM model"""

from sqlalchemy import Integer, Float, ForeignKey, DateTime, func, event
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from app.database.session import Base


class Progress(Base):
    __tablename__ = "progress"

    id:              Mapped[int]      = mapped_column(primary_key=True, index=True)
    user_id:         Mapped[int]      = mapped_column(ForeignKey("users.id"), nullable=False, unique=True, index=True)
    total_documents: Mapped[int]      = mapped_column(Integer, default=0)
    total_chats:     Mapped[int]      = mapped_column(Integer, default=0)
    total_quizzes:   Mapped[int]      = mapped_column(Integer, default=0)
    correct_answers: Mapped[int]      = mapped_column(Integer, default=0)
    accuracy:        Mapped[float]    = mapped_column(Float, default=0.0)
    study_minutes:   Mapped[int]      = mapped_column(Integer, default=0)
    # server_default for INSERT; Python-side onupdate for SQLite compatibility
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="progress")


@event.listens_for(Progress, "before_update")
def _progress_touch(mapper, connection, target):
    """Update updated_at in Python so it works on both SQLite and PostgreSQL."""
    target.updated_at = datetime.now(timezone.utc)
