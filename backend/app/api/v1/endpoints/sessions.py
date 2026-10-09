"""
Exam session management endpoints.
"""
import json
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from uuid import uuid4
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user_optional
from app.models.question import SessionCreate, SessionSubmit, QuestionGenerationRequest
from app.models.db_models import User, ExamSessionRow, SessionAnswerRow
from app.services.generation.generator import generator, EXAM_BLUEPRINTS


def _to_camel(snake: str) -> str:
    parts = snake.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def _camelify(obj):
    """Recursively convert dict keys from snake_case to camelCase."""
    if isinstance(obj, dict):
        return {_to_camel(k): _camelify(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_camelify(item) for item in obj]
    return obj


def _session_to_dict(row: ExamSessionRow, answer_rows: list[SessionAnswerRow]) -> dict:
    answers = {}
    for a in answer_rows:
        answers[a.question_id] = {
            "question_id": a.question_id,
            "selected_options": json.loads(a.selected_options),
            "time_spent": a.time_spent,
            "flagged": a.flagged,
        }

    session = {
        "session_id": row.id,
        "exam_code": row.exam_code,
        "mode": row.mode,
        "started_at": row.started_at.isoformat(),
        "duration_minutes": row.duration_minutes,
        "questions": json.loads(row.questions_json),
        "answers": answers,
        "marked_for_review": [],
        "current_question_index": 0,
        "submitted": row.submitted,
    }
    if row.score_json:
        session["score"] = json.loads(row.score_json)
    return session


router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/")
async def create_session(
    req: SessionCreate,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    blueprint = EXAM_BLUEPRINTS.get(req.exam_code)
    if not blueprint:
        raise HTTPException(status_code=404, detail=f"Exam {req.exam_code} not found")

    effective_count = min(req.count, 5) if not user else req.count

    gen_request = QuestionGenerationRequest(
        exam_code=req.exam_code,
        difficulty=req.difficulty,
        question_type=req.question_type,
        count=effective_count,
    )
    questions = await generator.generate_batch(gen_request)

    if not questions:
        raise HTTPException(status_code=422, detail="Could not generate questions for this session")

    duration = blueprint.get("duration_minutes", 100) if req.mode == "certification" else 0
    session_id = str(uuid4())

    questions_data = [q.model_dump(by_alias=True) for q in questions]

    row = ExamSessionRow(
        id=session_id,
        user_id=user.id if user else None,
        exam_code=req.exam_code,
        mode=req.mode,
        started_at=datetime.utcnow(),
        duration_minutes=duration,
        questions_json=json.dumps(questions_data),
    )
    db.add(row)
    await db.commit()

    session = {
        "session_id": session_id,
        "exam_code": req.exam_code,
        "mode": req.mode,
        "started_at": row.started_at.isoformat(),
        "duration_minutes": duration,
        "questions": questions_data,
        "answers": {},
        "marked_for_review": [],
        "current_question_index": 0,
        "submitted": False,
    }
    return _camelify(session)


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    result = await db.execute(select(ExamSessionRow).where(ExamSessionRow.id == session_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    if row.user_id and (not user or user.id != row.user_id):
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    answers_result = await db.execute(
        select(SessionAnswerRow).where(SessionAnswerRow.session_id == session_id)
    )
    answer_rows = list(answers_result.scalars().all())
    return _camelify(_session_to_dict(row, answer_rows))


@router.patch("/{session_id}/answers/{question_id}")
async def save_answer(
    session_id: str,
    question_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    result = await db.execute(select(ExamSessionRow).where(ExamSessionRow.id == session_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    if row.user_id and (not user or user.id != row.user_id):
        raise HTTPException(status_code=403, detail="Not authorized")
    if row.submitted:
        raise HTTPException(status_code=400, detail="Session already submitted")

    ans_result = await db.execute(
        select(SessionAnswerRow).where(
            SessionAnswerRow.session_id == session_id,
            SessionAnswerRow.question_id == question_id,
        )
    )
    existing = ans_result.scalar_one_or_none()

    selected = body.get("selectedOptions", [])
    time_spent = body.get("timeSpent", 0)
    flagged = body.get("flagged", False)

    if existing:
        existing.selected_options = json.dumps(selected)
        existing.time_spent = time_spent
        existing.flagged = flagged
    else:
        db.add(SessionAnswerRow(
            session_id=session_id,
            question_id=question_id,
            selected_options=json.dumps(selected),
            time_spent=time_spent,
            flagged=flagged,
        ))
    await db.commit()
    return {"saved": True}


@router.post("/{session_id}/submit")
async def submit_session(
    session_id: str,
    body: SessionSubmit,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    result = await db.execute(select(ExamSessionRow).where(ExamSessionRow.id == session_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    if row.user_id and (not user or user.id != row.user_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    for qid, options in body.answers.items():
        ans_result = await db.execute(
            select(SessionAnswerRow).where(
                SessionAnswerRow.session_id == session_id,
                SessionAnswerRow.question_id == qid,
            )
        )
        existing = ans_result.scalar_one_or_none()
        if existing:
            existing.selected_options = json.dumps(options)
        else:
            db.add(SessionAnswerRow(
                session_id=session_id,
                question_id=qid,
                selected_options=json.dumps(options),
            ))

    questions = json.loads(row.questions_json)

    answers_result = await db.execute(
        select(SessionAnswerRow).where(SessionAnswerRow.session_id == session_id)
    )
    all_answers = {a.question_id: json.loads(a.selected_options) for a in answers_result.scalars().all()}

    correct = 0
    domain_map: dict[str, dict] = {}

    for q in questions:
        qid = q.get("questionId") or q.get("question_id")
        obj = q.get("objective", "General")
        if obj not in domain_map:
            domain_map[obj] = {"correct": 0, "total": 0}
        domain_map[obj]["total"] += 1

        selected = set(all_answers.get(qid, []))
        correct_set = set(q.get("correctAnswer") or q.get("correct_answer", []))
        if selected == correct_set:
            correct += 1
            domain_map[obj]["correct"] += 1

    total = len(questions)
    score = round((correct / total) * 1000) if total > 0 else 0
    skipped = sum(1 for q in questions if not all_answers.get(q.get("questionId") or q.get("question_id")))

    domain_scores = [
        {
            "domain": domain,
            "correct": data["correct"],
            "total": data["total"],
            "percentage": round((data["correct"] / data["total"]) * 100) if data["total"] > 0 else 0,
        }
        for domain, data in domain_map.items()
    ]

    score_result = {
        "total_questions": total,
        "correct": correct,
        "incorrect": total - correct - skipped,
        "skipped": skipped,
        "score": score,
        "passed": score >= 700,
        "passing_score": 700,
        "time_spent": 0,
        "domain_scores": domain_scores,
    }

    row.submitted = True
    row.submitted_at = datetime.utcnow()
    row.score_json = json.dumps(score_result)
    await db.commit()

    return score_result
