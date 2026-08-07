from app.ai.base import AIProvider
from app.core.config import settings

_provider: AIProvider | None = None


def get_ai_provider() -> AIProvider:
    global _provider
    if _provider is None:
        p = settings.ai_provider.lower()
        if p == "ollama":
            from app.ai.ollama_provider import OllamaProvider
            _provider = OllamaProvider()
        else:
            raise ValueError(f"Unknown AI provider: {p}. Supported: ollama")
    return _provider
