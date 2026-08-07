from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.certification import Certification
from app.models.question import Question
from app.schemas.certification import CertificationOut
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[CertificationOut])
def list_certifications(db: Session = Depends(get_db), _=Depends(get_current_user)):
    certs = db.query(Certification).all()
    result = []
    for cert in certs:
        q_count = db.query(Question).filter(Question.certification_id == cert.id).count()
        out = CertificationOut.model_validate(cert)
        out.question_count = q_count
        out.skill_count = len(cert.skills)
        result.append(out)
    return result


@router.get("/{cert_id}", response_model=CertificationOut)
def get_certification(cert_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    cert = db.query(Certification).filter(Certification.id == cert_id).first()
    if not cert:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")
    q_count = db.query(Question).filter(Question.certification_id == cert.id).count()
    out = CertificationOut.model_validate(cert)
    out.question_count = q_count
    out.skill_count = len(cert.skills)
    return out
