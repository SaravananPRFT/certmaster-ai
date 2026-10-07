"""
Exam session management endpoints.
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from uuid import uuid4
from datetime import datetime

from app.models.question import SessionCreate, SessionSubmit, QuestionGenerationRequest
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

router = APIRouter(prefix="/sessions", tags=["sessions"])

_sessions: dict[str, dict] = {}


@router.post("/")
async def create_session(req: SessionCreate):
    """Create an exam session and pre-generate questions."""
    blueprint = EXAM_BLUEPRINTS.get(req.exam_code)
    if not blueprint:
        raise HTTPException(status_code=404, detail=f"Exam {req.exam_code} not found")

    gen_request = QuestionGenerationRequest(
        exam_code=req.exam_code,
        difficulty=req.difficulty,
        question_type=req.question_type,
        count=req.count,
    )
    questions = await generator.generate_batch(gen_request)

    if not questions:
        raise HTTPException(status_code=422, detail="Could not generate questions for this session")

    duration = blueprint.get("duration_minutes", 100) if req.mode == "certification" else 0
    session_id = str(uuid4())
    session = {
        "session_id": session_id,
        "exam_code": req.exam_code,
        "mode": req.mode,
        "started_at": datetime.utcnow().isoformat(),
        "duration_minutes": duration,
        "questions": [q.model_dump(by_alias=True) for q in questions],
        "answers": {},
        "marked_for_review": [],
        "current_question_index": 0,
        "submitted": False,
    }
    _sessions[session_id] = session
    return _camelify(session)


@router.get("/{session_id}")
async def get_session(session_id: str):
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _camelify(session)


@router.patch("/{session_id}/answers/{question_id}")
async def save_answer(session_id: str, question_id: str, body: dict):
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["submitted"]:
        raise HTTPException(status_code=400, detail="Session already submitted")
    session["answers"][question_id] = {
        "question_id": question_id,
        "selected_options": body.get("selectedOptions", []),
        "time_spent": body.get("timeSpent", 0),
        "flagged": body.get("flagged", False),
    }
    return {"saved": True}


@router.post("/{session_id}/submit")
async def submit_session(session_id: str, body: SessionSubmit):
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    for qid, options in body.answers.items():
        session["answers"][qid] = {
            "question_id": qid,
            "selected_options": options,
            "time_spent": 0,
            "flagged": False,
        }

    questions = session["questions"]
    answers = session["answers"]
    correct = 0
    domain_map: dict[str, dict] = {}

    for q in questions:
        qid = q["question_id"]
        obj = q.get("objective", "General")
        if obj not in domain_map:
            domain_map[obj] = {"correct": 0, "total": 0}
        domain_map[obj]["total"] += 1

        ans = answers.get(qid, {})
        selected = set(ans.get("selected_options", []))
        correct_set = set(q.get("correct_answer", []))
        if selected == correct_set:
            correct += 1
            domain_map[obj]["correct"] += 1

    total = len(questions)
    score = round((correct / total) * 1000) if total > 0 else 0
    skipped = sum(1 for q in questions if not answers.get(q["question_id"], {}).get("selected_options"))

    domain_scores = [
        {
            "domain": domain,
            "correct": data["correct"],
            "total": data["total"],
            "percentage": round((data["correct"] / data["total"]) * 100) if data["total"] > 0 else 0,
        }
        for domain, data in domain_map.items()
    ]

    result = {
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

    session["submitted"] = True
    session["score"] = result
    return result
