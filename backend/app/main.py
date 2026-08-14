"""
CertMasterAI — FastAPI Backend Entry Point
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.api.v1.router import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting CertMasterAI API v%s", settings.APP_VERSION)
    try:
        from app.services.indexing.indexer import indexer
        await indexer.ensure_index()
        logger.info("Azure AI Search index verified")
    except Exception as e:
        logger.warning("Could not verify index (non-fatal in dev): %s", e)
    yield
    logger.info("Shutting down CertMasterAI API")


app = FastAPI(
    title="CertMasterAI API",
    description=(
        "Microsoft Certification Mock Exam Platform — RAG-grounded question generation. "
        "Every question is grounded in official Microsoft documentation via Azure AI Search."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "healthy", "version": settings.APP_VERSION, "app": settings.APP_NAME}


@app.get("/")
async def root():
    return {
        "message": "CertMasterAI API",
        "docs": "/api/docs",
        "health": "/health",
        "version": settings.APP_VERSION,
    }
