import uuid
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    certification_id: Mapped[str] = mapped_column(String, ForeignKey("certifications.id"), nullable=False)
    difficulty: Mapped[str] = mapped_column(String, nullable=True)
    skill_area: Mapped[str] = mapped_column(String, nullable=True)
    questions_attempted: Mapped[int] = mapped_column(Integer, default=0)
    questions_correct: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="practice_sessions")


class MockExam(Base):
    __tablename__ = "mock_exams"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    certification_id: Mapped[str] = mapped_column(String, ForeignKey("certifications.id"), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    question_count: Mapped[int] = mapped_column(Integer, default=20)
    score_percentage: Mapped[float] = mapped_column(Float, nullable=True)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    question_ids: Mapped[str] = mapped_column(String, nullable=True)

    user = relationship("User", back_populates="mock_exams")
    results = relationship("MockExamResult", back_populates="mock_exam", cascade="all, delete-orphan")


class MockExamResult(Base):
    __tablename__ = "mock_exam_results"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mock_exam_id: Mapped[str] = mapped_column(String, ForeignKey("mock_exams.id"), nullable=False)
    question_id: Mapped[str] = mapped_column(String, ForeignKey("questions.id"), nullable=False)
    selected_option_id: Mapped[str] = mapped_column(String, nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    time_taken_seconds: Mapped[int] = mapped_column(Integer, default=0)

    mock_exam = relationship("MockExam", back_populates="results")
