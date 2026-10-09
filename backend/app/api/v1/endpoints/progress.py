"""User progress and analytics endpoint."""
import json
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.db_models import User, ExamSessionRow

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/{exam_code}")
async def get_progress(
    exam_code: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ExamSessionRow).where(
            ExamSessionRow.user_id == user.id,
            ExamSessionRow.exam_code == exam_code,
            ExamSessionRow.submitted == True,
        ).order_by(ExamSessionRow.submitted_at.desc())
    )
    sessions = list(result.scalars().all())

    if not sessions:
        return {
            "user_id": user.id,
            "exam_code": exam_code,
            "total_attempted": 0,
            "average_score": 0,
            "last_attempt": None,
            "domain_progress": [],
            "weak_areas": [],
            "strong_areas": [],
            "exam_readiness": 0,
            "recommendations": [],
        }

    scores = []
    domain_totals: dict[str, dict] = defaultdict(lambda: {"correct": 0, "total": 0})

    for sess in sessions:
        if not sess.score_json:
            continue
        score_data = json.loads(sess.score_json)
        scores.append(score_data.get("score", 0))

        for ds in score_data.get("domain_scores", []):
            domain_totals[ds["domain"]]["correct"] += ds["correct"]
            domain_totals[ds["domain"]]["total"] += ds["total"]

    avg_score = round(sum(scores) / len(scores)) if scores else 0
    last_attempt = sessions[0].submitted_at.isoformat() if sessions[0].submitted_at else None

    domain_progress = []
    weak_areas = []
    strong_areas = []

    for domain, data in domain_totals.items():
        pct = round((data["correct"] / data["total"]) * 100) if data["total"] > 0 else 0
        domain_progress.append({
            "domain": domain,
            "correct": data["correct"],
            "total": data["total"],
            "percentage": pct,
        })
        if pct < 60:
            weak_areas.append(domain)
        elif pct >= 80:
            strong_areas.append(domain)

    exam_readiness = min(100, round(avg_score / 10)) if avg_score else 0

    return {
        "user_id": user.id,
        "exam_code": exam_code,
        "total_attempted": len(sessions),
        "average_score": avg_score,
        "last_attempt": last_attempt,
        "domain_progress": domain_progress,
        "weak_areas": weak_areas,
        "strong_areas": strong_areas,
        "exam_readiness": exam_readiness,
        "recommendations": [],
    }
