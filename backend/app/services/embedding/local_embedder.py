"""Local embeddings via sentence-transformers — no API key, no cost."""
import logging

logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384


class LocalEmbedder:
    _model = None

    def _get_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info("Loading sentence-transformer model: %s (first run downloads ~90 MB)", MODEL_NAME)
                self._model = SentenceTransformer(MODEL_NAME)
                logger.info("Embedding model loaded")
            except ImportError:
                raise RuntimeError(
                    "sentence-transformers not installed. Run: pip install sentence-transformers"
                )
        return self._model

    def embed(self, text: str) -> list[float]:
        model = self._get_model()
        return model.encode(text, normalize_embeddings=True).tolist()

    def embed_batch(self, texts: list[str], batch_size: int = 64) -> list[list[float]]:
        model = self._get_model()
        return model.encode(
            texts,
            normalize_embeddings=True,
            batch_size=batch_size,
            show_progress_bar=False,
        ).tolist()

    @property
    def dimension(self) -> int:
        return EMBEDDING_DIM


embedder = LocalEmbedder()
