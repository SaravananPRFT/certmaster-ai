from pydantic import BaseModel, Field
from typing import Optional, Literal
from uuid import uuid4
from datetime import datetime

QuestionType = Literal[
    "MultipleChoiceSingle",
    "MultipleChoiceMultiple",
    "DragAndDrop",
    "CaseStudy",
    "Hotspot",
    "YesNo",
    "MatchFollowing",
    "BestAnswer",
    "ScenarioArchitecture",
    "BuildList",
]

Difficulty = Literal["Easy", "Medium", "Hard"]


class QuestionOption(BaseModel):
    id: str
    text: str


class MatchPair(BaseModel):
    left: str
    right: str


class Reference(BaseModel):
    title: str
    url: str


class GroundingInfo(BaseModel):
    grounding_score: float = Field(ge=0, le=1)
    citation_coverage: float = Field(ge=0, le=1)
    retrieved_document_ids: list[str] = []


class HotspotArea(BaseModel):
    id: str
    label: str
    x: float
    y: float
    width: float
    height: float
    is_correct: bool


class Question(BaseModel):
    question_id: str = Field(default_factory=lambda: str(uuid4()))
    exam: str
    objective: str
    difficulty: Difficulty
    type: QuestionType
    question: str
    context: Optional[str] = None
    options: Optional[list[QuestionOption]] = None
    drag_items: Optional[list[str]] = None
    drop_zones: Optional[list[str]] = None
    match_pairs: Optional[list[MatchPair]] = None
    build_items: Optional[list[str]] = None
    hotspot_areas: Optional[list[HotspotArea]] = None
    image_url: Optional[str] = None
    code_snippet: Optional[str] = None
    correct_answer: list[str]
    explanation: str
    why_correct: str
    why_incorrect: dict[str, str] = {}
    references: list[Reference] = []
    grounding: GroundingInfo
    case_study_id: Optional[str] = None
    tags: list[str] = []
    quality_score: Optional[float] = None
    status: Literal["pending", "approved", "rejected", "flagged"] = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class QuestionGenerationRequest(BaseModel):
    exam_code: str
    objective: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    question_type: Optional[QuestionType] = None
    count: int = Field(default=1, ge=1, le=100)
    case_study: bool = False
    domain_id: Optional[str] = None


class QuestionFeedback(BaseModel):
    question_id: str
    issue_type: Literal["inaccurate", "unclear", "outdated", "typo", "other"]
    comment: str = ""
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CaseStudy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    company_background: str
    existing_environment: str
    business_requirements: str
    technical_requirements: str
    constraints: str
    questions: list[Question] = []
    exam: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExamBlueprint(BaseModel):
    exam_code: str
    exam_name: str
    total_questions: int
    passing_score: int
    duration_minutes: int
    domains: list["Domain"]


class Domain(BaseModel):
    id: str
    name: str
    weight: float
    objectives: list[str]


class SessionCreate(BaseModel):
    exam_code: str
    mode: Literal["certification", "practice", "study"]
    count: int = Field(default=20, ge=5, le=100)
    difficulty: Optional[Difficulty] = None
    domain: Optional[str] = None
    question_type: Optional[QuestionType] = None


class SessionSubmit(BaseModel):
    answers: dict[str, list[str]]
