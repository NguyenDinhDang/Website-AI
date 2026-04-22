"""Chat history ORM model"""

from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database.session import Base


class Chat(Base):
    __tablename__ = "chats"

    id:          Mapped[int]        = mapped_column(primary_key=True, index=True)
    user_id:     Mapped[int]        = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    document_id: Mapped[int | None] = mapped_column(ForeignKey("documents.id"), nullable=True)
    role:        Mapped[str]        = mapped_column(String(20), nullable=False)   # "user" | "assistant"
    content:     Mapped[str]        = mapped_column(Text, nullable=False)
    created_at:  Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chats")
