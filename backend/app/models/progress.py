"""User progress ORM model"""

from sqlalchemy import Integer, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database.session import Base


class Progress(Base):
    __tablename__ = "progress"

    id:              Mapped[int]   = mapped_column(primary_key=True, index=True)
    user_id:         Mapped[int]   = mapped_column(ForeignKey("users.id"), nullable=False, unique=True, index=True)
    total_documents: Mapped[int]   = mapped_column(Integer, default=0)
    total_chats:     Mapped[int]   = mapped_column(Integer, default=0)
    total_quizzes:   Mapped[int]   = mapped_column(Integer, default=0)
    correct_answers: Mapped[int]   = mapped_column(Integer, default=0)
    accuracy:        Mapped[float] = mapped_column(Float, default=0.0)   # percent
    study_minutes:   Mapped[int]   = mapped_column(Integer, default=0)
    updated_at:      Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="progress")
