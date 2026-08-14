from fastapi import APIRouter, HTTPException
from app.services.generation.generator import EXAM_BLUEPRINTS

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("/")
async def list_exams():
    return [
        {
            "exam_code": code,
            "exam_name": bp["name"],
            "total_questions": 40,
            "passing_score": 700,
            "duration_minutes": 100,
            "domains": [
                {"id": f"{code}-{i}", "name": d["name"], "weight": d["weight"], "objectives": d["objectives"]}
                for i, d in enumerate(bp["domains"])
            ],
        }
        for code, bp in EXAM_BLUEPRINTS.items()
    ]


@router.get("/{exam_code}/blueprint")
async def get_blueprint(exam_code: str):
    bp = EXAM_BLUEPRINTS.get(exam_code)
    if not bp:
        raise HTTPException(status_code=404, detail=f"Exam {exam_code} not found")
    return {
        "exam_code": exam_code,
        "exam_name": bp["name"],
        "total_questions": 40,
        "passing_score": 700,
        "duration_minutes": 100,
        "domains": [
            {"id": f"{exam_code}-{i}", "name": d["name"], "weight": d["weight"], "objectives": d["objectives"]}
            for i, d in enumerate(bp["domains"])
        ],
    }
