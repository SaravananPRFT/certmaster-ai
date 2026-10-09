"""
Question generation and management endpoints.
"""
import json
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.question import (
    Question, QuestionGenerationRequest, QuestionFeedback,
    QuestionType, Difficulty,
)
from app.models.db_models import GeneratedQuestionRow
from app.services.generation.generator import generator

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/generate", response_model=list[Question])
async def generate_questions(
    request: QuestionGenerationRequest,
    db: AsyncSession = Depends(get_db),
):
    questions = await generator.generate_batch(request)
    if not questions:
        raise HTTPException(
            status_code=422,
            detail="No questions could be generated. Grounding or quality threshold not met. "
                   "This may indicate the requested topic has insufficient indexed documentation.",
        )
    for q in questions:
        row = GeneratedQuestionRow(
            id=q.question_id,
            exam_code=q.exam,
            question_json=q.model_dump_json(by_alias=True),
            status=q.status,
        )
        db.add(row)
    await db.commit()
    return questions


@router.get("/{question_id}", response_model=Question)
async def get_question(question_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GeneratedQuestionRow).where(GeneratedQuestionRow.id == question_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Question not found")
    return Question.model_validate_json(row.question_json)


@router.get("/", response_model=list[Question])
async def list_questions(
    exam: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    difficulty: Optional[Difficulty] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(GeneratedQuestionRow)
    if exam:
        query = query.where(GeneratedQuestionRow.exam_code == exam)
    if status:
        query = query.where(GeneratedQuestionRow.status == status)
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rows = result.scalars().all()

    questions = []
    for row in rows:
        q = Question.model_validate_json(row.question_json)
        if difficulty and q.difficulty != difficulty:
            continue
        questions.append(q)
    return questions


@router.post("/feedback", response_model=dict)
async def submit_feedback(
    feedback: QuestionFeedback,
    db: AsyncSession = Depends(get_db),
):
    if feedback.issue_type in ("inaccurate", "outdated"):
        result = await db.execute(
            select(GeneratedQuestionRow).where(GeneratedQuestionRow.id == feedback.question_id)
        )
        row = result.scalar_one_or_none()
        if row:
            row.status = "flagged"
            q_data = json.loads(row.question_json)
            q_data["status"] = "flagged"
            row.question_json = json.dumps(q_data)
            await db.commit()

    return {"message": "Feedback submitted successfully"}
