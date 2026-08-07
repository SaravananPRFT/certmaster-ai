from typing import List, Optional
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    certification_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str


class GenerateQuestionsRequest(BaseModel):
    certification_id: str
    skill_area: str
    difficulty: str = "Medium"
    count: int = 5


class StudyPlanRequest(BaseModel):
    certification_id: str
    exam_date: str
    daily_study_hours: float = 2.0
