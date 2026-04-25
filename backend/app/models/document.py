"""Document ORM model"""

from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database.session import Base


class Document(Base):
    __tablename__ = "documents"

    id:         Mapped[int]        = mapped_column(primary_key=True, index=True)
    owner_id:   Mapped[int]        = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title:      Mapped[str]        = mapped_column(String(255), nullable=False)
    filename:   Mapped[str]        = mapped_column(String(255), nullable=False)
    file_path:  Mapped[str]        = mapped_column(String(512), nullable=False)
    file_type:  Mapped[str]        = mapped_column(String(10),  nullable=False)
    file_size:  Mapped[int]        = mapped_column(Integer, default=0)
    content:    Mapped[str | None] = mapped_column(Text)
    summary:    Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner   = relationship("User",  back_populates="documents")
    chats   = relationship("Chat",  back_populates="document", cascade="all, delete-orphan")
    quizzes = relationship("Quiz",  back_populates="document", cascade="all, delete-orphan")
