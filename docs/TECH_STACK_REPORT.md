# CertMasterAI — Tech Stack Report

> Generated: 2026-08-12 | Based on full backend + frontend source audit

---

## 1. Frontend Stack

The frontend is a Next.js 15 App Router application written in TypeScript, styled with Tailwind CSS v4 and shadcn/ui components.

### Core Framework

| Technology | Role | Notes |
|------------|------|-------|
| Next.js 15 (App Router) | SSR/CSR hybrid, routing, page layouts | All exam routes use client components (`"use client"`) |
| React 19 | UI component model | — |
| TypeScript | Type safety throughout | Pydantic-aligned question type definitions |
| Tailwind CSS v4 | Utility-first styling | v4 uses CSS-native variables, not config-based purging |
| shadcn/ui | Pre-built accessible UI primitives | Button, Card, Dialog, Progress, Badge, etc. |

### State Management

| Library | Usage | Persistence |
|---------|-------|-------------|
| Zustand | `ExamStore` (session, currentIndex, answers, timer, hints), `AppStore` (sidebarOpen) | `ExamStore` partially persisted to `localStorage["certmaster-exam"]` |
| React Query (TanStack Query) | Defined in stack; server state fetching | Not actively used during exam lifecycle (mock mode active) |

**Zustand persistence gap:** `timeRemaining`, `showExplanation`, and `showHint` are NOT in the persisted keys. A page reload mid-exam resets the timer to 0 and collapses hints/explanations.

### Data Fetching

| Library | File | Status |
|---------|------|--------|
| Axios | `lib/api.ts` | ✅ Configured with base URL, interceptors |
| `examApi.startSession()` | `lib/api.ts` | ❌ Never called (mock replaces it) |
| `examApi.saveAnswer()` | `lib/api.ts` | ❌ Never called |
| `examApi.submitSession()` | `lib/api.ts` | ❌ Never called |

**Base URL config:** `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"`. The `.env.local` sets this to `http://localhost:8003/api/v1`. If `.env.local` is absent, all requests target port 8000, not 8003.

### UI/UX Libraries

| Library | Usage |
|---------|-------|
| next-themes | Dark/light/system theme toggle |
| Lucide React | Icon set throughout |
| Recharts | Domain performance bar chart + radar chart on ResultScreen |
| dnd-kit | Drag-and-drop question type interactions (DragAndDrop, MatchFollowing, BuildList) |
| react-markdown | Renders markdown in question stems and explanations |

### Authentication (Frontend)

Implemented in `lib/auth.tsx`. Uses React context + `localStorage`/`sessionStorage`.

| Feature | Status |
|---------|--------|
| Email/password login | ⚠️ Password param is `_password` (intentionally unused) |
| Role assignment | Hardcoded to `"student"` — admin role unassignable via UI |
| Guest login | 🔧 `sessionStorage` only — lost on tab close, not restored on mount |
| Auth gate on exam player | ❌ None — unauthenticated users can access `/exam/*` directly |
| Token written to storage | `localStorage["certmaster-user"]` |
| Token read by Axios interceptor | `localStorage["access_token"]` ⚠️ Key mismatch — Bearer header always absent |

---

## 2. Backend Stack

The backend is a Python FastAPI application using async/await throughout. It is designed for horizontal scalability but currently uses in-memory storage.

### Core Framework

| Technology | Version | Role |
|------------|---------|------|
| FastAPI | Latest | Async HTTP framework, OpenAPI auto-generation |
| Python | 3.11+ | Runtime (asyncio, type hints) |
| Pydantic v2 | 2.x | Request/response validation, settings management |
| uvicorn | Latest | ASGI server |
| asyncio | stdlib | Concurrent question generation via `asyncio.gather` |
| aiohttp | Latest | Async HTTP client for LLM API calls |

### API Structure

```
backend/app/
  main.py                          — App init, CORS, lifespan, router mount
  core/config.py                   — All settings via Pydantic BaseSettings
  api/v1/router.py                 — Aggregates all v1 routers
  api/v1/endpoints/
    admin.py                       — Index management, metrics (metrics hardcoded)
    exams.py                       — Exam list, blueprint retrieval
    questions.py                   — Generate, CRUD, feedback
    sessions.py                    — Create session, answer, submit, score
  models/question.py               — Question, ExamSession, QuestionFeedback Pydantic models
  services/generation/
    generator.py                   — LLM orchestration, fallback chain, grounding gates
    prompts.py                     — SYSTEM_PROMPT + generation prompt builder
  services/rag/retriever.py        — Azure AI Search hybrid retrieval
  services/indexing/indexer.py     — Document chunking + vector upload
  services/validation/validator.py — Quality scoring, duplicate detection (partially wired)
```

### CORS Configuration

`main.py` configures `CORSMiddleware`. The allowed origins should include the frontend dev URL (`http://localhost:3000`) and production domain.

### In-Memory Stores

All stores are module-level Python dicts/lists, process-local:

```python
_question_store: dict[str, Question]       # questions.py
_admin_question_store: dict[str, Question] # admin.py — separate, not shared
_feedback_store: list[QuestionFeedback]    # questions.py
_sessions: dict[str, dict]                 # sessions.py
```

No ORM, no database client, no migration framework is present anywhere in the codebase.

---

## 3. AI/ML Components

### Large Language Models

| Model | Provider | Usage | Temperature | Max Tokens | Output Mode |
|-------|----------|-------|-------------|-----------|-------------|
| GPT-4o | Azure OpenAI | Primary generation | 0.7 | 4096 | `json_object` (structured) |
| claude-sonnet-4-6 | Anthropic | Fallback if Azure OAI fails | 0.7 | 4096 | Text (no structured output) |
| `_mock_response()` | Hardcoded | Double-fallback if Anthropic fails | N/A | N/A | Always returns AI-102 question |

**Fallback chain in `generator.py`:**
```
Azure OpenAI GPT-4o
    └── on exception → Anthropic claude-sonnet-4-6
            └── on exception → _mock_response() (always succeeds)
```

The mock fallback is intentional for development but means generation will silently succeed even when all LLMs are unavailable. This masks connectivity/credential failures.

### Embeddings

| Model | Provider | Dimensions | Usage |
|-------|----------|-----------|-------|
| text-embedding-3-large | Azure OpenAI | 3072 | Query embedding for hybrid search + document embedding at index time |

### Azure AI Search — `certmaster-docs`

| Feature | Configuration |
|---------|--------------|
| Index name | `certmaster-docs` |
| Vector algorithm | HNSW |
| Vector profile | `certmaster-profile` |
| Vector dimensions | 3072 (matching embedding model) |
| Keyword search | BM25 (default Azure AI Search) |
| Semantic ranking | Enabled, config: `certmaster-semantic` |
| Search mode | Hybrid (vector + keyword) when embedding available; keyword-only fallback |
| Top-K | 5 (`TOP_K_RETRIEVAL`) |
| Filter support | OData filter on `exam_code`, `objective` |

### Grounding Validation Architecture

| Gate | Implementation | Issue |
|------|---------------|-------|
| Prompt-embedded thresholds | LLM instructed to self-report grounding_score ≥ 0.75, citation_coverage ≥ 0.60 | Thresholds hardcoded in prompt text, NOT read from `settings.MIN_GROUNDING_SCORE` |
| App-level Gate B | `grounding_score < settings.MIN_GROUNDING_SCORE` → return None | ✅ Wired |
| App-level Gate C | `citation_coverage < settings.MIN_CITATION_COVERAGE` → return None | ✅ Wired |
| Independent verification | None | ⚠️ Entirely trusts LLM self-report |
| Duplicate detection | `validator.check_duplicate()` (Jaccard > 0.85) | ❌ Never called |
| Blueprint alignment | `validator.validate_blueprint_alignment()` | ❌ Never called |
| Quality gate | `validator.score_quality()` → `quality_score` | ⚠️ Informational only — `MIN_QUALITY_SCORE=0.70` not enforced |

---

## 4. Azure Services

| Service | Configuration Status | Wired in Code | Usage |
|---------|---------------------|---------------|-------|
| Azure OpenAI | ✅ `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT` | ✅ `generator.py` | GPT-4o generation + text-embedding-3-large |
| Azure AI Search | ✅ `AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_API_KEY`, `AZURE_SEARCH_INDEX_NAME` | ✅ `retriever.py`, `indexer.py` | Vector + hybrid search |
| Azure Blob Storage | 🔧 `AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_CONTAINER` | ❌ No `BlobServiceClient` anywhere | Intended: store source documents |
| Azure Entra ID | 🔧 `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` | ❌ No MSAL/identity client | Intended: managed identity auth |

**Azure Blob Storage gap:** The config keys exist in `core/config.py` but no `azure-storage-blob` client is instantiated anywhere. Document uploads via `POST /admin/index` cannot currently write to blob storage.

**Entra ID gap:** `AZURE_TENANT_ID` and `AZURE_CLIENT_ID` are configured but not used. The system would currently need API keys rather than managed identity for Azure service auth.

---

## 5. Infrastructure

### Docker

The project includes Docker support (`docker-compose.yml`). Standard configuration for a Next.js + FastAPI multi-service setup.

### Redis

| Aspect | Status |
|--------|--------|
| Config keys | ✅ `REDIS_URL`, `CACHE_TTL_SECONDS=3600` in `core/config.py` |
| Client instantiation | ❌ No `redis.asyncio` or `aioredis` import anywhere |
| Usage | ❌ Not used for caching, sessions, or rate limiting |
| Intended use | Question cache, session persistence, rate limiting |

**Impact:** Generated questions are regenerated on every request. There is no deduplication layer.

### Environment Variables

**Backend (required for AI features):**
```
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_API_KEY
AZURE_OPENAI_DEPLOYMENT      # GPT-4o deployment name
AZURE_SEARCH_ENDPOINT
AZURE_SEARCH_API_KEY
AZURE_SEARCH_INDEX_NAME      # certmaster-docs
ANTHROPIC_API_KEY            # Fallback LLM
```

**Backend (configured, not yet wired):**
```
REDIS_URL
AZURE_STORAGE_ACCOUNT
AZURE_STORAGE_CONTAINER
AZURE_TENANT_ID
AZURE_CLIENT_ID
JWT_SECRET_KEY
```

**Frontend:**
```
NEXT_PUBLIC_API_URL=http://localhost:8003/api/v1
```

---

## 6. Security

### Authentication and Authorization

| Component | Status | Detail |
|-----------|--------|--------|
| JWT config | 🔧 Defined | `JWT_SECRET_KEY`, `JWT_ALGORITHM=HS256`, `JWT_EXPIRE_MINUTES=480` in config |
| JWT middleware | ❌ Not wired | No `Depends(get_current_user)` on any endpoint |
| Admin endpoint protection | ❌ None | `GET/PATCH/POST /api/v1/admin/*` publicly accessible |
| Question generation | ❌ None | `POST /api/v1/questions/generate` publicly accessible |
| Session creation | ❌ None | `POST /api/v1/sessions/` publicly accessible |
| Frontend auth gate | ❌ None | `/exam/*` pages accessible without login |

### CORS

Configured via FastAPI `CORSMiddleware` in `main.py`. Should be reviewed to ensure `allow_origins` does not include `["*"]` in production.

### Input Validation

Pydantic v2 validates all request bodies and query parameters on backend endpoints. FastAPI returns 422 Unprocessable Entity on validation failure.

### Token Storage

Frontend stores session data in `localStorage` (Zustand persist). JWT tokens, if/when implemented, should use `httpOnly` cookies rather than localStorage to prevent XSS exfiltration.

---

## 7. Dependencies Analysis

### Frontend Dependency Status

| Dependency | Category | Status |
|------------|----------|--------|
| next | Framework | ✅ Active |
| react, react-dom | UI | ✅ Active |
| typescript | Language | ✅ Active |
| tailwindcss | Styling | ✅ Active |
| @radix-ui/* (via shadcn) | UI primitives | ✅ Active |
| zustand | State | ✅ Active |
| @tanstack/react-query | Server state | 🔧 Installed, not active during exam lifecycle |
| axios | HTTP client | 🔧 Configured, methods defined but not called |
| recharts | Charts | ✅ Active (results screen) |
| @dnd-kit/core, @dnd-kit/sortable | DnD | ✅ Active (DnD question types) |
| react-markdown | Markdown render | ✅ Active |
| next-themes | Theming | ✅ Active |
| lucide-react | Icons | ✅ Active |

### Backend Dependency Status

| Dependency | Category | Status |
|------------|----------|--------|
| fastapi | Framework | ✅ Active |
| pydantic, pydantic-settings | Validation/config | ✅ Active |
| uvicorn | Server | ✅ Active |
| openai | Azure OpenAI + embeddings | ✅ Active |
| anthropic | Fallback LLM | ✅ Active |
| azure-search-documents | AI Search client | ✅ Active |
| aiohttp | Async HTTP | ✅ Active |
| redis / aioredis | Caching | 🔧 In requirements, not instantiated |
| azure-storage-blob | Blob storage | 🔧 In requirements, not instantiated |
| python-jose or similar | JWT | 🔧 Config defined, no client |
| sqlalchemy / databases | ORM | ❌ Not in requirements — no DB layer |

---

## 8. Version Table

### Frontend Key Packages

| Package | Version |
|---------|---------|
| next | 15.x |
| react | 19.x |
| typescript | 5.x |
| tailwindcss | 4.x |
| zustand | 5.x |
| @tanstack/react-query | 5.x |
| axios | 1.x |
| recharts | 2.x |
| @dnd-kit/core | 6.x |
| next-themes | 0.4.x |
| lucide-react | 0.4x+ |

### Backend Key Packages

| Package | Version |
|---------|---------|
| fastapi | 0.11x |
| pydantic | 2.x |
| uvicorn | 0.30+ |
| openai | 1.x |
| anthropic | 0.30+ |
| azure-search-documents | 11.x |
| aiohttp | 3.x |

> Note: Exact pinned versions are in `frontend/package.json` and `backend/requirements.txt`. The versions above reflect the major lines audited.
