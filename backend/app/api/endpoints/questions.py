from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
import uuid
from app.database.session import get_db
from app.models.question import Question
from app.models.analytics import Bookmark
from app.schemas.question import QuestionsPagedOut, QuestionOut, BookmarkRequest
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=QuestionsPagedOut)
def get_questions(
    certification_id: str,
    difficulty: Optional[str] = None,
    skill_area: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Question).filter(Question.certification_id == certification_id)
    if difficulty:
        q = q.filter(Question.difficulty == difficulty)
    if skill_area:
        q = q.filter(Question.skill_area == skill_area)
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return QuestionsPagedOut(items=[QuestionOut.model_validate(i) for i in items], total=total, page=page, page_size=page_size)


@router.post("/bookmarks")
def add_bookmark(req: BookmarkRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.query(Bookmark).filter(Bookmark.user_id == user.id, Bookmark.question_id == req.question_id).first()
    if existing:
        return {"id": existing.id}
    bm = Bookmark(id=str(uuid.uuid4()), user_id=user.id, question_id=req.question_id, notes=req.notes)
    db.add(bm)
    db.commit()
    return {"id": bm.id}


@router.delete("/bookmarks/{question_id}")
def remove_bookmark(question_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bm = db.query(Bookmark).filter(Bookmark.user_id == user.id, Bookmark.question_id == question_id).first()
    if bm:
        db.delete(bm)
        db.commit()
    return {"ok": True}


@router.get("/bookmarks/list")
def list_bookmarks(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bms = db.query(Bookmark).filter(Bookmark.user_id == user.id).all()
    return [{"id": b.id, "question_id": b.question_id, "notes": b.notes} for b in bms]
