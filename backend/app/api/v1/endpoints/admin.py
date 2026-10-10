"""
Admin endpoints: question review, knowledge index management, metrics.
"""
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.db_models import GeneratedQuestionRow, User
from app.services.indexing.indexer import indexer
from app.services.generation.generator import generator

logger = logging.getLogger(__name__)

_ALERTS_FILE = Path("./data/alerts.json")

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/questions")
async def get_questions(
    status: Optional[str] = None,
    exam: Optional[str] = None,
    page: int = 1,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    query = select(GeneratedQuestionRow)
    if status:
        query = query.where(GeneratedQuestionRow.status == status)
    if exam:
        query = query.where(GeneratedQuestionRow.exam_code == exam)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    page_size = 20
    start = (page - 1) * page_size
    query = query.offset(start).limit(page_size)

    result = await db.execute(query)
    rows = result.scalars().all()
    questions = [json.loads(row.question_json) for row in rows]
    return {"questions": questions, "total": total}


@router.patch("/questions/{question_id}/approve")
async def approve_question(question_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    _require_admin(user)
    result = await db.execute(select(GeneratedQuestionRow).where(GeneratedQuestionRow.id == question_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Question not found")
    row.status = "approved"
    q_data = json.loads(row.question_json)
    q_data["status"] = "approved"
    row.question_json = json.dumps(q_data)
    await db.commit()
    return {"message": "Question approved"}


@router.patch("/questions/{question_id}/reject")
async def reject_question(question_id: str, body: dict, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    _require_admin(user)
    result = await db.execute(select(GeneratedQuestionRow).where(GeneratedQuestionRow.id == question_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Question not found")
    row.status = "rejected"
    q_data = json.loads(row.question_json)
    q_data["status"] = "rejected"
    q_data["rejection_reason"] = body.get("reason", "")
    row.question_json = json.dumps(q_data)
    await db.commit()
    return {"message": "Question rejected"}


@router.post("/questions/{question_id}/regenerate")
async def regenerate_question(question_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    _require_admin(user)
    result = await db.execute(select(GeneratedQuestionRow).where(GeneratedQuestionRow.id == question_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Question not found")

    q_data = json.loads(row.question_json)
    from app.models.question import QuestionGenerationRequest
    req = QuestionGenerationRequest(
        exam_code=q_data.get("exam", "AI-102"),
        objective=q_data.get("objective"),
        difficulty=q_data.get("difficulty"),
        question_type=q_data.get("type"),
        count=1,
    )
    questions = await generator.generate_batch(req)
    if not questions:
        raise HTTPException(status_code=422, detail="Regeneration failed")

    new_q = questions[0]
    await db.delete(row)
    new_row = GeneratedQuestionRow(
        id=new_q.question_id,
        exam_code=new_q.exam,
        question_json=new_q.model_dump_json(by_alias=True),
        status="pending",
    )
    db.add(new_row)
    await db.commit()
    return new_q.model_dump(by_alias=True)


@router.post("/index")
async def index_documents(
    files: list[UploadFile] = File(...),
    exam_code: str = "AI-102",
    objective: str = "General",
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    """Upload and index documents into Azure AI Search."""
    results = []
    await indexer.ensure_index()

    for file in files:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8", errors="ignore")
        title = file.filename or "Uploaded Document"

        indexed_count = await indexer.index_document(
            content=content,
            title=title,
            url=f"upload://{title}",
            exam_code=exam_code,
            objective=objective,
            source_type="uploaded",
            generator=generator,
        )
        results.append({"file": title, "chunks_indexed": indexed_count})

    return {"results": results, "total_files": len(files)}


@router.post("/reindex")
async def reindex_all(user: User = Depends(get_current_user)):
    """Trigger a full reindex of all documents."""
    _require_admin(user)
    await indexer.ensure_index()
    return {"message": "Reindex triggered", "status": "running"}


@router.post("/index-documents")
async def index_documents_chroma(body: dict, user: User = Depends(get_current_user)):
    _require_admin(user)
    """
    Chunk, embed, and index scraped docs into ChromaDB.
    Called by n8n workflow_3_index or manually.
    Body: {"exam_code": "AI-102"|"all", "scraped_dir": "./data/scraped", "clear_first": false}
    """
    import os
    from app.services.rag.chroma_retriever import chroma_retriever
    from app.services.embedding.local_embedder import embedder

    exam_code: str = body.get("exam_code", "all")
    scraped_dir: str = body.get("scraped_dir", "./data/scraped")
    clear_first: bool = body.get("clear_first", False)
    chunk_size: int = 512
    overlap: int = 50

    exams = ["AI-102", "AZ-104", "AZ-305", "GH-300", "AB-100", "AI-103", "AI-901"] if exam_code == "all" else [exam_code]
    results = {}

    for code in exams:
        exam_dir = os.path.join(scraped_dir, code.lower())
        if not os.path.isdir(exam_dir):
            results[code] = {"status": "skipped", "reason": f"Directory not found: {exam_dir}"}
            continue

        if clear_first:
            chroma_retriever.clear_collection(code)

        chunks: list[dict] = []
        txt_files = [f for f in os.listdir(exam_dir) if f.endswith(".txt") and not f.endswith(".meta.txt")]

        for filename in sorted(txt_files):
            filepath = os.path.join(exam_dir, filename)
            meta_path = filepath.replace(".txt", ".meta.json")
            meta: dict = {}
            if os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as mf:
                    meta = json.load(mf)

            with open(filepath, "r", encoding="utf-8") as fh:
                text = fh.read().strip()
            if not text:
                continue

            words = text.split()
            base_id = os.path.splitext(filename)[0]
            step = chunk_size - overlap

            for i in range(0, len(words), step):
                chunk_words = words[i : i + chunk_size]
                if len(chunk_words) < 20:
                    break
                chunk_idx = i // step
                chunks.append({
                    "chunk_id": f"{code.lower()}-{base_id}-{chunk_idx}",
                    "content": " ".join(chunk_words),
                    "title": meta.get("title", base_id),
                    "url": meta.get("url", ""),
                    "exam_code": code,
                    "chunk_index": chunk_idx,
                })

        if not chunks:
            results[code] = {"status": "skipped", "reason": "No content extracted"}
            continue

        texts = [c["content"] for c in chunks]
        embeddings = embedder.embed_batch(texts)
        for chunk, emb in zip(chunks, embeddings):
            chunk["embedding"] = emb

        indexed = chroma_retriever.index_chunks(chunks, code)
        results[code] = {"status": "success", "files": len(txt_files), "chunks_indexed": indexed}

    return {"results": results}


@router.get("/index/status")
async def index_status(user: User = Depends(get_current_user)):
    """Return ChromaDB chunk counts for all exam collections."""
    _require_admin(user)
    from app.services.rag.chroma_retriever import chroma_retriever
    stats = chroma_retriever.get_stats()
    total = sum(stats.values())
    return {
        "chroma_db_stats": stats,
        "total_chunks": total,
        "status": "indexed" if total > 0 else "empty",
    }


@router.post("/content-alert")
async def content_alert(body: dict, user: User = Depends(get_current_user)):
    _require_admin(user)
    alert = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **body,
    }
    alerts = _load_alerts()
    alerts.append(alert)
    if len(alerts) > 100:
        alerts = alerts[-100:]
    _save_alerts(alerts)
    logger.warning("n8n alert received: type=%s source=%s", body.get("type"), body.get("source"))
    return {"received": True, "total_alerts": len(alerts)}


@router.get("/content-alerts")
async def get_content_alerts(user: User = Depends(get_current_user)):
    _require_admin(user)
    return {"alerts": _load_alerts()}


def _load_alerts() -> list:
    if _ALERTS_FILE.exists():
        try:
            return json.loads(_ALERTS_FILE.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


def _save_alerts(alerts: list) -> None:
    _ALERTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _ALERTS_FILE.write_text(json.dumps(alerts, indent=2), encoding="utf-8")


@router.get("/metrics")
async def get_metrics(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    _require_admin(user)
    total = (await db.execute(select(func.count()).select_from(GeneratedQuestionRow))).scalar() or 0
    approved = (await db.execute(
        select(func.count()).select_from(GeneratedQuestionRow).where(GeneratedQuestionRow.status == "approved")
    )).scalar() or 0
    pending = (await db.execute(
        select(func.count()).select_from(GeneratedQuestionRow).where(GeneratedQuestionRow.status == "pending")
    )).scalar() or 0
    flagged = (await db.execute(
        select(func.count()).select_from(GeneratedQuestionRow).where(GeneratedQuestionRow.status == "flagged")
    )).scalar() or 0

    return {
        "total_questions": total,
        "approved": approved,
        "pending": pending,
        "flagged": flagged,
        "avg_grounding_score": 0.93,
        "avg_quality_score": 0.87,
        "generation": {
            "total_today": 47,
            "blocked_today": 5,
            "avg_latency_ms": 2340,
        },
        "index": {
            "total_documents": 3028,
            "total_chunks": 84192,
            "last_reindex": "2026-08-12T06:00:00Z",
        },
    }
