from fastapi import APIRouter
from app.api.endpoints import auth, certifications, questions, practice, analytics, ai

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(certifications.router, prefix="/certifications", tags=["certifications"])
api_router.include_router(questions.router, prefix="/questions", tags=["questions"])
api_router.include_router(practice.router, prefix="/practice", tags=["practice"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
