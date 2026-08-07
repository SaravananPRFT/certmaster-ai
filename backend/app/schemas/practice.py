from typing import List, Optional
from pydantic import BaseModel


class StartSessionRequest(BaseModel):
    certification_id: str
    difficulty: Optional[str] = None
    skill_area: Optional[str] = None


class StartMockExamRequest(BaseModel):
    certification_id: str
    duration_minutes: int = 60
    question_count: int = 20


class ExamOptionOut(BaseModel):
    id: str
    option_text: str
    display_order: int


class ExamQuestionOut(BaseModel):
    question_id: str
    question_text: str
    options: List[ExamOptionOut]


class MockExamOut(BaseModel):
    id: str
    duration_minutes: int
    questions: List[ExamQuestionOut]


class SubmitAnswerItem(BaseModel):
    question_id: str
    selected_option_id: Optional[str] = None
    time_taken_seconds: int = 0


class SubmitMockExamRequest(BaseModel):
    mock_exam_id: str
    answers: List[SubmitAnswerItem]


class ExamResultItem(BaseModel):
    question_id: str
    question_text: str
    is_correct: bool
    explanation: Optional[str]


class MockExamResultOut(BaseModel):
    total_questions: int
    correct_answers: int
    score_percentage: float
    passed: bool
    results: List[ExamResultItem]
