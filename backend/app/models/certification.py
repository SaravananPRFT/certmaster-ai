import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class Certification(Base):
    __tablename__ = "certifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=True)
    level: Mapped[str] = mapped_column(String, nullable=True)
    exam_url: Mapped[str] = mapped_column(String, nullable=True)

    skills = relationship("CertificationSkill", back_populates="certification", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="certification")


class CertificationSkill(Base):
    __tablename__ = "certification_skills"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    certification_id: Mapped[str] = mapped_column(String, ForeignKey("certifications.id"), nullable=False)
    skill_name: Mapped[str] = mapped_column(String, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    certification = relationship("Certification", back_populates="skills")
