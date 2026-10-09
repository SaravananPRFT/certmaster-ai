from fastapi import APIRouter
from app.api.v1.endpoints import questions, sessions, admin, exams, planner, assistant, auth, progress

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(questions.router)
api_router.include_router(sessions.router)
api_router.include_router(admin.router)
api_router.include_router(exams.router)
api_router.include_router(planner.router)
api_router.include_router(assistant.router)
api_router.include_router(progress.router)
