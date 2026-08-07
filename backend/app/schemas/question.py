from typing import List, Optional
from pydantic import BaseModel


class OptionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    option_text: str
    is_correct: bool
    display_order: int


class QuestionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    certification_id: str
    question_text: str
    explanation: Optional[str]
    difficulty: str
    skill_area: Optional[str]
    question_type: str
    is_ai_generated: bool
    options: List[OptionOut] = []


class QuestionsPagedOut(BaseModel):
    items: List[QuestionOut]
    total: int
    page: int
    page_size: int


class BookmarkRequest(BaseModel):
    question_id: str
    notes: Optional[str] = None
