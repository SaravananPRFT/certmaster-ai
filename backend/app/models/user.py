import uuid
from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    practice_sessions = relationship("PracticeSession", back_populates="user")
    mock_exams = relationship("MockExam", back_populates="user")
    bookmarks = relationship("Bookmark", back_populates="user")
    chat_history = relationship("ChatHistory", back_populates="user")
    study_plans = relationship("StudyPlan", back_populates="user")
    progress = relationship("UserProgress", back_populates="user")
