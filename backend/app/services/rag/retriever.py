"""
Azure AI Search retrieval layer for RAG grounding.
"""
import asyncio
import logging
import time
from collections import OrderedDict
from typing import Optional
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from azure.core.credentials import AzureKeyCredential
from app.core.config import settings

logger = logging.getLogger(__name__)


class RetrievedChunk:
    def __init__(self, doc_id: str, content: str, title: str, url: str, score: float):
        self.doc_id = doc_id
        self.content = content
        self.title = title
        self.url = url
        self.score = score


class DocumentRetriever:
    def __init__(self):
        self._client: Optional[SearchClient] = None
        self._retrieval_cache: OrderedDict[tuple, tuple[float, list[RetrievedChunk]]] = OrderedDict()
        self._retrieval_tasks: dict[tuple, asyncio.Task[list[RetrievedChunk]]] = {}
        self._retrieval_lock = asyncio.Lock()

    @property
    def uses_azure_search(self) -> bool:
        return bool(settings.AZURE_SEARCH_KEY) and "your-search" not in settings.AZURE_SEARCH_ENDPOINT

    def _get_client(self) -> SearchClient:
        if not self._client:
            self._client = SearchClient(
                endpoint=settings.AZURE_SEARCH_ENDPOINT,
                index_name=settings.AZURE_SEARCH_INDEX,
                credential=AzureKeyCredential(settings.AZURE_SEARCH_KEY),
            )
        return self._client

    async def retrieve(
        self,
        query: str,
        exam_code: str,
        objective: Optional[str] = None,
        top_k: int = 5,
        embedding: Optional[list[float]] = None,
    ) -> list[RetrievedChunk]:
        cache_key = (
            query,
            exam_code,
            objective or "",
            top_k,
            self.uses_azure_search,
            settings.AZURE_SEARCH_ENDPOINT,
            settings.AZURE_SEARCH_INDEX,
            settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
            settings.CHROMA_DB_PATH,
        )
        now = time.monotonic()
        async with self._retrieval_lock:
            cached = self._retrieval_cache.get(cache_key)
            if cached and cached[0] > now:
                self._retrieval_cache.move_to_end(cache_key)
                return list(cached[1])
            if cached:
                del self._retrieval_cache[cache_key]

            task = self._retrieval_tasks.get(cache_key)
            if task is None:
                task = asyncio.create_task(
                    self._retrieve_and_cache(
                        cache_key, query, exam_code, objective, top_k, embedding
                    )
                )
                self._retrieval_tasks[cache_key] = task
        return list(await asyncio.shield(task))

    async def _retrieve_and_cache(
        self,
        cache_key: tuple,
        query: str,
        exam_code: str,
        objective: Optional[str],
        top_k: int,
        embedding: Optional[list[float]],
    ) -> list[RetrievedChunk]:
        try:
            chunks = await self._retrieve_uncached(
                query, exam_code, objective, top_k, embedding
            )
        except Exception:
            async with self._retrieval_lock:
                if self._retrieval_tasks.get(cache_key) is asyncio.current_task():
                    del self._retrieval_tasks[cache_key]
            raise

        async with self._retrieval_lock:
            if self._retrieval_tasks.get(cache_key) is asyncio.current_task():
                del self._retrieval_tasks[cache_key]
            ttl = min(max(settings.CACHE_TTL_SECONDS, 0), 300)
            if ttl:
                self._retrieval_cache[cache_key] = (time.monotonic() + ttl, chunks)
                self._retrieval_cache.move_to_end(cache_key)
                while len(self._retrieval_cache) > 512:
                    self._retrieval_cache.popitem(last=False)
        return chunks

    async def _retrieve_uncached(
        self,
        query: str,
        exam_code: str,
        objective: Optional[str],
        top_k: int,
        embedding: Optional[list[float]],
    ) -> list[RetrievedChunk]:
        """Retrieve top-K relevant chunks using hybrid search (keyword + vector)."""
        if not self.uses_azure_search:
            return await self._try_chroma_or_fallback(query, exam_code, objective, top_k)

        try:
            client = self._get_client()
            filter_expr = f"exam_code eq '{exam_code}'"
            if objective:
                filter_expr += f" and objective eq '{objective}'"

            search_kwargs = {
                "search_text": query,
                "filter": filter_expr,
                "top": top_k,
                "select": ["id", "content", "title", "url", "exam_code", "objective"],
            }

            if embedding:
                vector_query = VectorizedQuery(
                    vector=embedding,
                    k_nearest_neighbors=top_k,
                    fields="content_vector",
                )
                search_kwargs["vector_queries"] = [vector_query]
                search_kwargs["query_type"] = "semantic"
                search_kwargs["semantic_configuration_name"] = settings.AZURE_SEARCH_SEMANTIC_CONFIG

            results = client.search(**search_kwargs)
            chunks = []
            for r in results:
                chunks.append(RetrievedChunk(
                    doc_id=r.get("id", ""),
                    content=r.get("content", ""),
                    title=r.get("title", ""),
                    url=r.get("url", ""),
                    score=r.get("@search.score", 0.0),
                ))
            logger.info("Retrieved %d chunks for query: %s", len(chunks), query[:60])
            return chunks

        except Exception as e:
            logger.warning("Azure AI Search retrieval failed: %s — trying ChromaDB", e)

        return await self._try_chroma_or_fallback(query, exam_code, objective, top_k)

    async def _try_chroma_or_fallback(
        self, query: str, exam_code: str, objective: Optional[str], top_k: int
    ) -> list[RetrievedChunk]:
        try:
            from app.services.rag.chroma_retriever import chroma_retriever
            chroma_chunks = chroma_retriever.retrieve(query, exam_code, top_k)
            if chroma_chunks:
                logger.info("ChromaDB returned %d chunks for %s", len(chroma_chunks), exam_code)
                return [
                    RetrievedChunk(
                        doc_id=c["doc_id"],
                        content=c["content"],
                        title=c["title"],
                        url=c["url"],
                        score=c["score"],
                    )
                    for c in chroma_chunks
                ]
        except Exception as chroma_err:
            logger.warning("ChromaDB retrieval failed: %s — using hardcoded fallback", chroma_err)

        return self._fallback_chunks(exam_code, objective)

    def _fallback_chunks(self, exam_code: str, objective: Optional[str]) -> list[RetrievedChunk]:
        """Return static reference chunks when search is unavailable (dev mode)."""
        return [
            RetrievedChunk(
                doc_id="fallback-001",
                content=f"Microsoft documentation context for {exam_code} — {objective or 'general'}. "
                        "Azure AI services provide cloud-based cognitive capabilities including language understanding, "
                        "computer vision, speech processing, and generative AI via Azure OpenAI Service.",
                title="Azure AI Services Documentation",
                url="https://learn.microsoft.com/azure/ai-services/",
                score=0.85,
            )
        ]

    def build_context(self, chunks: list[RetrievedChunk], max_tokens: int = 4096) -> tuple[str, list[str]]:
        """Concatenate chunks into a context string within token budget."""
        context_parts = []
        doc_ids = []
        estimated_tokens = 0

        for chunk in sorted(chunks, key=lambda c: c.score, reverse=True):
            chunk_tokens = len(chunk.content.split()) * 1.3
            if estimated_tokens + chunk_tokens > max_tokens:
                break
            context_parts.append(f"[SOURCE: {chunk.title} | {chunk.url}]\n{chunk.content}")
            doc_ids.append(chunk.doc_id)
            estimated_tokens += chunk_tokens

        return "\n\n---\n\n".join(context_parts), doc_ids


retriever = DocumentRetriever()
