from typing import List, Optional
from pydantic import BaseModel


class SkillOut(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    skill_name: str
    display_order: int


class CertificationOut(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    code: str
    name: str
    description: Optional[str]
    level: Optional[str]
    exam_url: Optional[str]
    skills: List[SkillOut] = []
    question_count: int = 0
    skill_count: int = 0
