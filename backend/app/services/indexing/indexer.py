"""
Document indexing service: extracts, chunks, embeds, and indexes documents into Azure AI Search.
"""
import logging
import json
import asyncio
from typing import Optional
from uuid import uuid4
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex, SearchField, SearchFieldDataType,
    VectorSearch, HnswAlgorithmConfiguration, VectorSearchProfile,
    SemanticConfiguration, SemanticSearch, SemanticPrioritizedFields,
    SemanticField,
)
from azure.core.credentials import AzureKeyCredential
from app.core.config import settings

logger = logging.getLogger(__name__)

INDEX_SCHEMA = SearchIndex(
    name=settings.AZURE_SEARCH_INDEX,
    fields=[
        SearchField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
        SearchField(name="content", type=SearchFieldDataType.String, searchable=True),
        SearchField(name="title", type=SearchFieldDataType.String, searchable=True, filterable=True),
        SearchField(name="url", type=SearchFieldDataType.String, retrievable=True),
        SearchField(name="exam_code", type=SearchFieldDataType.String, filterable=True, facetable=True),
        SearchField(name="objective", type=SearchFieldDataType.String, filterable=True, facetable=True),
        SearchField(name="source_type", type=SearchFieldDataType.String, filterable=True),
        SearchField(name="chunk_index", type=SearchFieldDataType.Int32, filterable=True),
        SearchField(
            name="content_vector",
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=3072,
            vector_search_profile_name="certmaster-profile",
        ),
    ],
    vector_search=VectorSearch(
        algorithms=[HnswAlgorithmConfiguration(name="certmaster-hnsw")],
        profiles=[VectorSearchProfile(name="certmaster-profile", algorithm_configuration_name="certmaster-hnsw")],
    ),
    semantic_search=SemanticSearch(
        configurations=[
            SemanticConfiguration(
                name=settings.AZURE_SEARCH_SEMANTIC_CONFIG,
                prioritized_fields=SemanticPrioritizedFields(
                    content_fields=[SemanticField(field_name="content")],
                    keywords_fields=[SemanticField(field_name="title")],
                ),
            )
        ]
    ),
)


class DocumentIndexer:
    def __init__(self):
        self._search_client: Optional[SearchClient] = None
        self._index_client: Optional[SearchIndexClient] = None

    def _get_search_client(self) -> SearchClient:
        if not self._search_client:
            self._search_client = SearchClient(
                endpoint=settings.AZURE_SEARCH_ENDPOINT,
                index_name=settings.AZURE_SEARCH_INDEX,
                credential=AzureKeyCredential(settings.AZURE_SEARCH_KEY),
            )
        return self._search_client

    def _get_index_client(self) -> SearchIndexClient:
        if not self._index_client:
            self._index_client = SearchIndexClient(
                endpoint=settings.AZURE_SEARCH_ENDPOINT,
                credential=AzureKeyCredential(settings.AZURE_SEARCH_KEY),
            )
        return self._index_client

    async def ensure_index(self):
        try:
            client = self._get_index_client()
            client.create_or_update_index(INDEX_SCHEMA)
            logger.info("Index %s ensured", settings.AZURE_SEARCH_INDEX)
        except Exception as e:
            logger.error("Failed to ensure index: %s", e)

    def chunk_text(self, text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
            i += chunk_size - overlap
        return chunks

    async def get_embedding(self, text: str, generator) -> Optional[list[float]]:
        return await generator.get_embedding(text)

    async def index_document(
        self,
        content: str,
        title: str,
        url: str,
        exam_code: str,
        objective: str,
        source_type: str = "microsoft_learn",
        generator=None,
    ) -> int:
        chunks = self.chunk_text(content)
        documents = []
        for i, chunk in enumerate(chunks):
            embedding = None
            if generator:
                embedding = await self.get_embedding(chunk, generator)

            doc = {
                "id": f"{exam_code}-{uuid4().hex[:8]}-{i}",
                "content": chunk,
                "title": title,
                "url": url,
                "exam_code": exam_code,
                "objective": objective,
                "source_type": source_type,
                "chunk_index": i,
            }
            if embedding:
                doc["content_vector"] = embedding
            documents.append(doc)

        try:
            client = self._get_search_client()
            result = client.upload_documents(documents)
            indexed = sum(1 for r in result if r.succeeded)
            logger.info("Indexed %d/%d chunks for %s", indexed, len(documents), title)
            return indexed
        except Exception as e:
            logger.error("Failed to index documents: %s", e)
            return 0


indexer = DocumentIndexer()
