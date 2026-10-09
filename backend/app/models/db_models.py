from datetime import datetime
from uuid import uuid4

from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="student")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sessions: Mapped[list["ExamSessionRow"]] = relationship(back_populates="user")


class ExamSessionRow(Base):
    __tablename__ = "exam_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    exam_code: Mapped[str] = mapped_column(String(20), nullable=False)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    submitted: Mapped[bool] = mapped_column(Boolean, default=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    score_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    questions_json: Mapped[str] = mapped_column(Text, nullable=False)

    user: Mapped[User | None] = relationship(back_populates="sessions")
    answers: Mapped[list["SessionAnswerRow"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class SessionAnswerRow(Base):
    __tablename__ = "session_answers"
    __table_args__ = (UniqueConstraint("session_id", "question_id", name="uq_session_question"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("exam_sessions.id"), nullable=False, index=True)
    question_id: Mapped[str] = mapped_column(String(36), nullable=False)
    selected_options: Mapped[str] = mapped_column(Text, default="[]")
    time_spent: Mapped[int] = mapped_column(Integer, default=0)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)

    session: Mapped[ExamSessionRow] = relationship(back_populates="answers")


class GeneratedQuestionRow(Base):
    __tablename__ = "generated_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    exam_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    question_json: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
