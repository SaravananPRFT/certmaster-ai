import uuid
import json
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.practice import MockExam, MockExamResult, PracticeSession
from app.models.question import Question, QuestionOption
from app.models.analytics import UserProgress
from app.schemas.practice import (
    StartSessionRequest, StartMockExamRequest, MockExamOut, ExamQuestionOut,
    ExamOptionOut, SubmitMockExamRequest, MockExamResultOut, ExamResultItem,
)
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/sessions")
def start_session(req: StartSessionRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = PracticeSession(id=str(uuid.uuid4()), user_id=user.id, certification_id=req.certification_id, difficulty=req.difficulty, skill_area=req.skill_area)
    db.add(session)
    db.commit()
    return {"id": session.id}


@router.get("/sessions")
def get_sessions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sessions = db.query(PracticeSession).filter(PracticeSession.user_id == user.id).all()
    return [{"id": s.id, "certification_id": s.certification_id, "questions_attempted": s.questions_attempted, "questions_correct": s.questions_correct} for s in sessions]


@router.post("/mock-exams", response_model=MockExamOut)
def start_mock_exam(req: StartMockExamRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    questions = db.query(Question).filter(Question.certification_id == req.certification_id).all()
    if not questions:
        raise HTTPException(status_code=400, detail="No questions available for this certification")
    selected = random.sample(questions, min(req.question_count, len(questions)))
    exam = MockExam(
        id=str(uuid.uuid4()), user_id=user.id, certification_id=req.certification_id,
        duration_minutes=req.duration_minutes, question_count=len(selected),
        question_ids=json.dumps([q.id for q in selected]),
    )
    db.add(exam)
    db.commit()
    exam_questions = [
        ExamQuestionOut(
            question_id=q.id, question_text=q.question_text,
            options=[ExamOptionOut(id=o.id, option_text=o.option_text, display_order=o.display_order) for o in q.options],
        )
        for q in selected
    ]
    return MockExamOut(id=exam.id, duration_minutes=exam.duration_minutes, questions=exam_questions)


@router.post("/mock-exams/submit", response_model=MockExamResultOut)
def submit_mock_exam(req: SubmitMockExamRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    exam = db.query(MockExam).filter(MockExam.id == req.mock_exam_id, MockExam.user_id == user.id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    correct = 0
    result_items = []
    for answer in req.answers:
        question = db.query(Question).filter(Question.id == answer.question_id).first()
        if not question:
            continue
        is_correct = False
        if answer.selected_option_id:
            option = db.query(QuestionOption).filter(QuestionOption.id == answer.selected_option_id).first()
            is_correct = bool(option and option.is_correct)
        if is_correct:
            correct += 1
        db.add(MockExamResult(id=str(uuid.uuid4()), mock_exam_id=exam.id, question_id=answer.question_id, selected_option_id=answer.selected_option_id, is_correct=is_correct, time_taken_seconds=answer.time_taken_seconds))
        db.add(UserProgress(id=str(uuid.uuid4()), user_id=user.id, certification_id=exam.certification_id, question_id=answer.question_id, is_correct=is_correct, skill_area=question.skill_area))
        result_items.append(ExamResultItem(question_id=question.id, question_text=question.question_text, is_correct=is_correct, explanation=question.explanation))
    total = len(req.answers)
    score = round((correct / total * 100) if total else 0, 1)
    exam.score_percentage = score
    exam.passed = score >= 70
    exam.completed = True
    db.commit()
    return MockExamResultOut(total_questions=total, correct_answers=correct, score_percentage=score, passed=exam.passed, results=result_items)
