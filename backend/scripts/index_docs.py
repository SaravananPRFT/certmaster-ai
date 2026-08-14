#!/usr/bin/env python3
"""
Chunk, embed, and index scraped docs into ChromaDB.

Usage (run from the backend/ directory):
    python scripts/index_docs.py --exam AI-102
    python scripts/index_docs.py --all
    python scripts/index_docs.py --all --clear         # wipe and reindex

The first run downloads the embedding model (~90 MB) automatically.
"""
import argparse
import json
import sys
from pathlib import Path

# Allow importing app.* modules when run from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from app.services.embedding.local_embedder import embedder
    from app.services.rag.chroma_retriever import chroma_retriever
except ImportError as exc:
    print(f"ERROR: {exc}")
    print("Make sure you are running from the backend/ directory and dependencies are installed.")
    sys.exit(1)

EXAM_CODES = ["AI-102", "AZ-104", "AZ-305", "GH-300", "AB-100", "AI-103"]
CHUNK_WORDS = 512
OVERLAP_WORDS = 50
MIN_CHUNK_WORDS = 20


def make_chunks(text: str, source_id: str, title: str, url: str, exam_code: str) -> list[dict]:
    words = text.split()
    step = CHUNK_WORDS - OVERLAP_WORDS
    chunks = []
    for i in range(0, len(words), step):
        window = words[i : i + CHUNK_WORDS]
        if len(window) < MIN_CHUNK_WORDS:
            break
        idx = i // step
        chunks.append({
            "chunk_id": f"{exam_code.lower()}-{source_id}-{idx}",
            "content": " ".join(window),
            "title": title,
            "url": url,
            "exam_code": exam_code,
            "chunk_index": idx,
        })
    return chunks


def index_exam(exam_code: str, scraped_dir: Path, clear: bool) -> dict:
    exam_dir = scraped_dir / exam_code.lower()
    if not exam_dir.is_dir():
        return {"status": "skipped", "reason": f"Directory not found: {exam_dir}"}

    if clear:
        print(f"  Clearing {exam_code} collection…")
        chroma_retriever.clear_collection(exam_code)

    txt_files = sorted(f for f in exam_dir.iterdir() if f.suffix == ".txt")
    if not txt_files:
        return {"status": "skipped", "reason": "No .txt files found"}

    all_chunks: list[dict] = []
    for txt_path in txt_files:
        meta_path = txt_path.with_name(txt_path.stem + ".meta.json")
        meta: dict = {}
        if meta_path.exists():
            with open(meta_path, encoding="utf-8") as f:
                meta = json.load(f)

        text = txt_path.read_text(encoding="utf-8").strip()
        if not text:
            continue

        chunks = make_chunks(
            text=text,
            source_id=txt_path.stem,
            title=meta.get("title", txt_path.stem),
            url=meta.get("url", ""),
            exam_code=exam_code,
        )
        all_chunks.extend(chunks)

    if not all_chunks:
        return {"status": "skipped", "reason": "No content extracted from files"}

    print(f"  Embedding {len(all_chunks)} chunks for {exam_code}…")
    batch_size = 64
    texts = [c["content"] for c in all_chunks]
    embeddings: list[list[float]] = []

    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        embeddings.extend(embedder.embed_batch(batch))
        done = min(start + batch_size, len(texts))
        print(f"    {done}/{len(texts)} embedded", end="\r")

    print()  # newline after progress
    for chunk, emb in zip(all_chunks, embeddings):
        chunk["embedding"] = emb

    indexed = chroma_retriever.index_chunks(all_chunks, exam_code)
    return {"status": "success", "files": len(txt_files), "chunks_indexed": indexed}


def main() -> None:
    parser = argparse.ArgumentParser(description="Index scraped docs into ChromaDB for CertMasterAI")
    parser.add_argument("--exam", help="Exam code, e.g. AI-102")
    parser.add_argument("--all", action="store_true", help="Index all exams")
    parser.add_argument("--scraped-dir", default="./data/scraped")
    parser.add_argument("--clear", action="store_true", help="Clear collection before indexing")
    args = parser.parse_args()

    if not args.exam and not args.all:
        parser.print_help()
        sys.exit(1)

    scraped_dir = Path(args.scraped_dir)
    exams = EXAM_CODES if args.all else [args.exam.upper()]

    for exam in exams:
        print(f"\n=== Indexing {exam} ===")
        result = index_exam(exam, scraped_dir, args.clear)
        status = result.get("status")
        if status == "success":
            print(f"    OK — {result['chunks_indexed']} chunks from {result['files']} files")
        else:
            print(f"    {status}: {result.get('reason')}")

    print("\n--- ChromaDB stats ---")
    for code, count in chroma_retriever.get_stats().items():
        bar = "█" * min(count // 50, 30)
        print(f"  {code:<8}: {count:>5} chunks  {bar}")


if __name__ == "__main__":
    main()
