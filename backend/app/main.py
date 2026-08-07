import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from loguru import logger

from app.core.config import settings
from app.database.session import engine
from app.database.base import Base
from app.database.seed import seed_database
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting CertMaster AI...")
    Base.metadata.create_all(bind=engine)
    from app.database.session import SessionLocal
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    logger.info("Database ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="CertMaster AI",
    description="Microsoft Certification Prep Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

# Serve React frontend if built
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/", include_in_schema=False)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str = ""):
        index = os.path.join(FRONTEND_DIST, "index.html")
        return FileResponse(index)
