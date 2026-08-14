from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "CertMasterAI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Azure AI Search
    AZURE_SEARCH_ENDPOINT: str = "https://your-search.search.windows.net"
    AZURE_SEARCH_KEY: str = ""
    AZURE_SEARCH_INDEX: str = "certmaster-docs"
    AZURE_SEARCH_SEMANTIC_CONFIG: str = "certmaster-semantic"

    # Azure OpenAI
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_KEY: str = ""
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4o"
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: str = "text-embedding-3-large"
    AZURE_OPENAI_API_VERSION: str = "2024-08-01-preview"

    # Anthropic (fallback)
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

    # Portkey gateway (routes to Claude via AWS Bedrock)
    AI_PROVIDER: str = ""
    PORTKEY_BASE_URL: str = ""
    PORTKEY_API_KEY: str = ""
    CLAUDE_MODEL: str = "us.anthropic.claude-sonnet-4-6"
    EXTRA_HEADERS: str = ""

    # Azure Storage
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_STORAGE_CONTAINER: str = "certmaster-docs"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL_SECONDS: int = 3600

    # Auth
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    # Quality thresholds
    MIN_GROUNDING_SCORE: float = 0.75
    MIN_CITATION_COVERAGE: float = 0.60
    MAX_SIMILARITY_FOR_DUPLICATE: float = 0.92
    TOP_K_RETRIEVAL: int = 5
    MAX_CONTEXT_TOKENS: int = 4096

    # ChromaDB local RAG (Option B)
    CHROMA_DB_PATH: str = "./chroma_db"
    SCRAPED_DOCS_PATH: str = "./data/scraped"

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "https://certmasterai.azurewebsites.net"]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
