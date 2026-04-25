"""Quiz ORM model"""

from sqlalchemy import String, Text, Integer, Boolean, ForeignKey, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database.session import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id:            Mapped[int]        = mapped_column(primary_key=True, index=True)
    user_id:       Mapped[int]        = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    document_id:   Mapped[int | None] = mapped_column(ForeignKey("documents.id"), nullable=True)
    question:      Mapped[str]        = mapped_column(Text, nullable=False)
    options:       Mapped[list]       = mapped_column(JSON, nullable=False)
    correct_index: Mapped[int]        = mapped_column(Integer, nullable=False)
    explanation:   Mapped[str | None] = mapped_column(Text)
    # user answer
    selected_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_correct:    Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at:    Mapped[datetime]    = mapped_column(DateTime(timezone=True), server_default=func.now())

    user     = relationship("User",     back_populates="quizzes")
    document = relationship("Document", back_populates="quizzes")
