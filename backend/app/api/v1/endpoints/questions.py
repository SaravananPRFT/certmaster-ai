"""
Question generation and management endpoints.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional

from app.models.question import (
    Question, QuestionGenerationRequest, QuestionFeedback,
    QuestionType, Difficulty,
)
from app.services.generation.generator import generator

router = APIRouter(prefix="/questions", tags=["questions"])

_question_store: dict[str, Question] = {}
_feedback_store: list[QuestionFeedback] = []


@router.post("/generate", response_model=list[Question])
async def generate_questions(request: QuestionGenerationRequest):
    """
    Generate blueprint-aligned, RAG-grounded questions.

    Pipeline:
    1. Analyze exam + objective
    2. Retrieve top-K chunks from Azure AI Search
    3. Build compressed context
    4. Generate question via LLM
    5. Validate grounding + quality
    6. Return JSON
    """
    questions = await generator.generate_batch(request)
    if not questions:
        raise HTTPException(
            status_code=422,
            detail="No questions could be generated. Grounding or quality threshold not met. "
                   "This may indicate the requested topic has insufficient indexed documentation.",
        )
    for q in questions:
        _question_store[q.question_id] = q
    return questions


@router.get("/{question_id}", response_model=Question)
async def get_question(question_id: str):
    q = _question_store.get(question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q


@router.get("/", response_model=list[Question])
async def list_questions(
    exam: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    difficulty: Optional[Difficulty] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    questions = list(_question_store.values())
    if exam:
        questions = [q for q in questions if q.exam == exam]
    if status:
        questions = [q for q in questions if q.status == status]
    if difficulty:
        questions = [q for q in questions if q.difficulty == difficulty]
    start = (page - 1) * page_size
    return questions[start:start + page_size]


@router.post("/feedback", response_model=dict)
async def submit_feedback(feedback: QuestionFeedback):
    question = _question_store.get(feedback.question_id)
    if feedback.issue_type in ("inaccurate", "outdated") and question:
        question.status = "flagged"
    _feedback_store.append(feedback)
    return {"message": "Feedback submitted successfully", "feedback_id": str(len(_feedback_store))}
