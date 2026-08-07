import uuid
from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    certification_id: Mapped[str] = mapped_column(String, ForeignKey("certifications.id"), nullable=False)
    question_text: Mapped[str] = mapped_column(String, nullable=False)
    explanation: Mapped[str] = mapped_column(String, nullable=True)
    difficulty: Mapped[str] = mapped_column(String, default="Medium")
    skill_area: Mapped[str] = mapped_column(String, nullable=True)
    question_type: Mapped[str] = mapped_column(String, default="single")
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    certification = relationship("Certification", back_populates="questions")
    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan", order_by="QuestionOption.display_order")
    bookmarks = relationship("Bookmark", back_populates="question")


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id: Mapped[str] = mapped_column(String, ForeignKey("questions.id"), nullable=False)
    option_text: Mapped[str] = mapped_column(String, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    question = relationship("Question", back_populates="options")
