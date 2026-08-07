from typing import List
from pydantic import BaseModel


class SkillBreakdown(BaseModel):
    skill_area: str
    total_attempted: int
    accuracy_percentage: float


class CertProgressOut(BaseModel):
    certification_id: str
    certification_code: str
    certification_name: str
    readiness_score: float
    total_attempted: int
    total_correct: int
    skill_breakdown: List[SkillBreakdown] = []


class DashboardOut(BaseModel):
    total_questions_answered: int
    accuracy_percentage: float
    readiness_score: float
    certification_progress: List[CertProgressOut] = []
