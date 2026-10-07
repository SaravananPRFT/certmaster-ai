"""ChromaDB local vector store — RAG tier 2 (fallback when Azure AI Search is unavailable)."""
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

EXAM_CODES = ["AI-102", "AZ-104", "AZ-305", "GH-300", "AB-100", "AI-103", "AI-901"]


def _coll_name(exam_code: str) -> str:
    return f"certmaster_{exam_code.lower().replace('-', '_')}"


class ChromaRetriever:
    _client = None

    def _get_client(self):
        if self._client is None:
            import chromadb
            self._client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
            logger.info("ChromaDB client ready at: %s", settings.CHROMA_DB_PATH)
        return self._client

    def _get_collection(self, exam_code: str):
        """Return collection or None if it doesn't exist yet."""
        try:
            return self._get_client().get_collection(_coll_name(exam_code))
        except Exception:
            return None

    # ------------------------------------------------------------------ #
    # Retrieval                                                            #
    # ------------------------------------------------------------------ #

    def retrieve(self, query: str, exam_code: str, top_k: int = 5) -> list[dict]:
        """
        Return top-K chunks. Returns [] when collection is missing or empty
        so the caller can fall through to the next tier.
        """
        try:
            from app.services.embedding.local_embedder import embedder

            collection = self._get_collection(exam_code)
            if collection is None or collection.count() == 0:
                logger.debug("ChromaDB: no data for %s", exam_code)
                return []

            query_vec = embedder.embed(query)
            n = min(top_k, collection.count())
            results = collection.query(
                query_embeddings=[query_vec],
                n_results=n,
                include=["documents", "metadatas", "distances"],
            )

            chunks = []
            for i, doc in enumerate(results["documents"][0]):
                meta = results["metadatas"][0][i]
                distance = results["distances"][0][i]
                score = max(0.0, 1.0 - distance)  # cosine distance → similarity
                chunks.append({
                    "doc_id": meta.get("chunk_id", f"chroma-{exam_code}-{i}"),
                    "content": doc,
                    "title": meta.get("title", ""),
                    "url": meta.get("url", ""),
                    "score": score,
                })

            logger.info("ChromaDB: %d chunks for %s | query: %s", len(chunks), exam_code, query[:60])
            return chunks

        except Exception as e:
            logger.warning("ChromaDB retrieval error: %s", e)
            return []

    # ------------------------------------------------------------------ #
    # Indexing                                                             #
    # ------------------------------------------------------------------ #

    def index_chunks(self, chunks: list[dict], exam_code: str) -> int:
        """
        Upsert pre-embedded chunks into ChromaDB.
        Each chunk must have: chunk_id, content, embedding, title, url, chunk_index.
        Returns number of chunks indexed.
        """
        if not chunks:
            return 0
        try:
            client = self._get_client()
            collection = client.get_or_create_collection(
                name=_coll_name(exam_code),
                metadata={"hnsw:space": "cosine"},
            )
            collection.upsert(
                ids=[c["chunk_id"] for c in chunks],
                documents=[c["content"] for c in chunks],
                embeddings=[c["embedding"] for c in chunks],
                metadatas=[
                    {
                        "title": c.get("title", ""),
                        "url": c.get("url", ""),
                        "exam_code": exam_code,
                        "chunk_index": c.get("chunk_index", 0),
                        "chunk_id": c["chunk_id"],
                    }
                    for c in chunks
                ],
            )
            logger.info("ChromaDB: indexed %d chunks → %s", len(chunks), _coll_name(exam_code))
            return len(chunks)
        except Exception as e:
            logger.error("ChromaDB indexing error: %s", e)
            return 0

    def get_stats(self) -> dict:
        """Chunk counts for every exam collection."""
        return {
            code: (self._get_collection(code).count() if self._get_collection(code) else 0)
            for code in EXAM_CODES
        }

    def clear_collection(self, exam_code: str) -> bool:
        """Delete and recreate a collection (full reindex support)."""
        try:
            client = self._get_client()
            name = _coll_name(exam_code)
            try:
                client.delete_collection(name)
            except Exception:
                pass
            client.create_collection(name=name, metadata={"hnsw:space": "cosine"})
            logger.info("ChromaDB: cleared collection %s", name)
            return True
        except Exception as e:
            logger.error("ChromaDB clear error %s: %s", exam_code, e)
            return False


chroma_retriever = ChromaRetriever()
