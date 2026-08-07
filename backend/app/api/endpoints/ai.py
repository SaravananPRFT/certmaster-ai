import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.certification import Certification
from app.models.question import Question, QuestionOption
from app.models.analytics import ChatHistory
from app.schemas.ai import ChatRequest, ChatResponse, GenerateQuestionsRequest, StudyPlanRequest
from app.schemas.question import QuestionOut
from app.core.deps import get_current_user
from app.models.user import User
from app.ai.factory import get_ai_provider
from loguru import logger

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cert_context = ""
    if req.certification_id:
        cert = db.query(Certification).filter(Certification.id == req.certification_id).first()
        if cert:
            skills = ", ".join(s.skill_name for s in cert.skills)
            cert_context = f"The user is studying for {cert.code} - {cert.name}. Key skills: {skills}."

    system_prompt = f"You are CertMaster AI, a helpful Microsoft certification study assistant. {cert_context} Provide clear, accurate, concise answers."
    history = db.query(ChatHistory).filter(ChatHistory.user_id == user.id).order_by(ChatHistory.created_at.desc()).limit(10).all()
    messages = [{"role": h.role, "content": h.content} for h in reversed(history)]
    messages.append({"role": "user", "content": req.message})

    try:
        provider = get_ai_provider()
        response = await provider.chat(messages, system_prompt)
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=503, detail="AI service unavailable. Ensure Ollama is running: ollama serve")

    db.add(ChatHistory(id=str(uuid.uuid4()), user_id=user.id, certification_id=req.certification_id, role="user", content=req.message))
    db.add(ChatHistory(id=str(uuid.uuid4()), user_id=user.id, certification_id=req.certification_id, role="assistant", content=response))
    db.commit()
    return ChatResponse(message=response)


@router.post("/generate-questions")
async def generate_questions(req: GenerateQuestionsRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cert = db.query(Certification).filter(Certification.id == req.certification_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    try:
        provider = get_ai_provider()
        generated = await provider.generate_questions(cert.code, cert.name, req.skill_area, req.difficulty, req.count)
    except Exception as e:
        logger.error(f"Generate questions error: {e}")
        raise HTTPException(status_code=503, detail="AI service unavailable")

    saved = []
    for g in generated:
        correct_idx = next((i for i, o in enumerate(g.options) if o == g.correct_answer), 0)
        q = Question(id=str(uuid.uuid4()), certification_id=cert.id, question_text=g.question, explanation=g.explanation, difficulty=g.difficulty, skill_area=g.skill_area, question_type="single", is_ai_generated=True)
        db.add(q)
        db.flush()
        for i, opt_text in enumerate(g.options):
            db.add(QuestionOption(id=str(uuid.uuid4()), question_id=q.id, option_text=opt_text, is_correct=(i == correct_idx), display_order=i))
        db.commit()
        db.refresh(q)
        saved.append(QuestionOut.model_validate(q))
    return {"generated": len(saved), "questions": saved}


@router.post("/study-plan")
async def generate_study_plan(req: StudyPlanRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cert = db.query(Certification).filter(Certification.id == req.certification_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    from datetime import date
    try:
        exam_date = date.fromisoformat(req.exam_date)
        days = (exam_date - date.today()).days
    except Exception:
        days = 30
    skills = [s.skill_name for s in cert.skills]
    try:
        provider = get_ai_provider()
        plan = await provider.generate_study_plan(cert.code, cert.name, skills, days, req.daily_study_hours)
    except Exception as e:
        logger.error(f"Study plan error: {e}")
        raise HTTPException(status_code=503, detail="AI service unavailable")

    import json
    from app.models.analytics import StudyPlan
    sp = StudyPlan(id=str(uuid.uuid4()), user_id=user.id, certification_id=cert.id, exam_date=req.exam_date, daily_study_hours=req.daily_study_hours, plan_json=json.dumps(plan))
    db.add(sp)
    db.commit()
    return {"plan_id": sp.id, **plan}


@router.get("/chat/history")
def get_chat_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    history = db.query(ChatHistory).filter(ChatHistory.user_id == user.id).order_by(ChatHistory.created_at).limit(50).all()
    return [{"role": h.role, "content": h.content, "created_at": str(h.created_at)} for h in history]
