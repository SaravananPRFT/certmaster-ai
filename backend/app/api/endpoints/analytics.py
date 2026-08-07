from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.analytics import UserProgress
from app.models.certification import Certification
from app.schemas.analytics import DashboardOut, CertProgressOut, SkillBreakdown
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/dashboard", response_model=DashboardOut)
def get_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    all_progress = db.query(UserProgress).filter(UserProgress.user_id == user.id).all()
    total = len(all_progress)
    correct = sum(1 for p in all_progress if p.is_correct)
    accuracy = round((correct / total * 100) if total else 0, 1)

    cert_ids = list(set(p.certification_id for p in all_progress))
    cert_progress = []
    for cid in cert_ids:
        cert = db.query(Certification).filter(Certification.id == cid).first()
        if not cert:
            continue
        c_progress = [p for p in all_progress if p.certification_id == cid]
        c_total = len(c_progress)
        c_correct = sum(1 for p in c_progress if p.is_correct)
        readiness = round((c_correct / c_total * 100) if c_total else 0, 1)

        skill_map: dict = {}
        for p in c_progress:
            sa = p.skill_area or "General"
            if sa not in skill_map:
                skill_map[sa] = {"total": 0, "correct": 0}
            skill_map[sa]["total"] += 1
            if p.is_correct:
                skill_map[sa]["correct"] += 1

        breakdowns = [
            SkillBreakdown(skill_area=sa, total_attempted=v["total"], accuracy_percentage=round(v["correct"] / v["total"] * 100, 1))
            for sa, v in skill_map.items()
        ]
        cert_progress.append(CertProgressOut(certification_id=cid, certification_code=cert.code, certification_name=cert.name, readiness_score=readiness, total_attempted=c_total, total_correct=c_correct, skill_breakdown=breakdowns))

    return DashboardOut(total_questions_answered=total, accuracy_percentage=accuracy, readiness_score=round((correct / total * 100) if total else 0, 1), certification_progress=cert_progress)
