# CertMasterAI — Architecture Overview

> Generated: 2026-08-12 | Based on full backend + frontend source audit

---

## 1. Executive Summary

CertMasterAI is a Microsoft certification exam preparation platform. The system is in an **active development / demo state**: the backend AI pipeline is substantially built and functional, while the frontend currently operates entirely in **mock mode** — no API calls are made during any exam session.

Key current-state facts:

- The frontend exam player **never calls the backend**. All questions are served from 24 hardcoded mock questions in `mockData.ts`.
- The backend stores all questions and sessions **in-memory** (Python dicts). All data is lost on process restart.
- **No authentication is enforced** on any endpoint. Every route — including admin routes — is publicly accessible.
- Redis and Azure Blob Storage are **configured but not instantiated** anywhere in code.
- The AI generation pipeline (GPT-4o → Anthropic fallback → mock fallback) is fully coded and can be exercised directly via the API, but the frontend never triggers it.
- Admin metrics (`GET /admin/metrics`) return **hardcoded literal values**, not computed data.

The platform has a clear intended architecture (Azure AI Search RAG + GPT-4o generation + persistent DB), and the infrastructure wiring is partially complete. The primary work remaining is connecting the frontend to the real API, adding persistence, and enforcing authentication.

---

## 2. System Architecture

### What Is Built

```
Browser (Next.js 15)
  └── Mock exam sessions (mockData.ts)
  └── Zustand state (client-only, no server sync)
  └── examApi (lib/api.ts) — defined, never called

FastAPI Backend (Python)
  └── Question generation pipeline (generator.py)
  └── RAG retrieval (retriever.py + Azure AI Search)
  └── Document indexer (indexer.py)
  └── Quality validator (validator.py)
  └── In-memory stores (question_store, sessions dict)
```

### What Is Connected (End-to-End)

| Path | Status |
|------|--------|
| Frontend → Backend API | ❌ Not connected (mock mode) |
| Backend → Azure OpenAI (GPT-4o) | ✅ Wired, primary LLM |
| Backend → Anthropic (claude-sonnet-4-6) | ✅ Wired, fallback LLM |
| Backend → Azure AI Search (read/write) | ✅ Wired |
| Backend → Redis | 🔧 Configured, not instantiated |
| Backend → Azure Blob Storage | 🔧 Configured, not instantiated |
| Auth JWT → Endpoint protection | 🔧 Config defined, no middleware wired |

### What Is Configured Only

- `REDIS_URL` and `CACHE_TTL_SECONDS=3600` are in `core/config.py` — no `redis.asyncio` client instantiated anywhere.
- `AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_CONTAINER` defined in config — no `BlobServiceClient` anywhere.
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `JWT_SECRET_KEY`, `JWT_ALGORITHM=HS256`, `JWT_EXPIRE_MINUTES=480` defined — no `Depends(get_current_user)` on any route.

---

## 3. Core Components

### 3.1 Frontend — `frontend/`

| Sub-component | Role | Status | Gaps |
|---------------|------|--------|------|
| `/exams/[examCode]` setup page | Collects mode, count, difficulty, domain, type | ✅ Functional UI | difficulty/domain/type silently discarded downstream |
| `/exam/[examCode]` player | Renders questions, handles answers, timer | ✅ Functional UI | Never calls real API; mock only |
| `mockData.ts` | 24 hardcoded questions across 6 exams | ✅ Working demo | Only 3 question types covered out of 10+ types |
| `lib/api.ts` (`examApi`) | Axios client for all backend calls | ✅ Fully defined | Never called during exam lifecycle |
| `lib/auth.tsx` | Login, guest login, session state | ⚠️ Partial | Password param unused; admin role unassignable via UI |
| Zustand (`ExamStore`) | Holds session, currentIndex, answers | ✅ Working | `timeRemaining` not persisted — resets to 0 on reload |
| `next-themes` | Dark/light mode | ✅ Working | — |
| Recharts | Domain bar charts, radar chart on results | ✅ Working | — |

**Auth token mismatch (Critical):** `lib/auth.tsx` writes the user to `localStorage["certmaster-user"]`. The Axios interceptor in `lib/api.ts` reads from `localStorage["access_token"]`. These keys never match, so the `Authorization: Bearer` header is **always absent** even for logged-in users.

### 3.2 Backend — `backend/app/`

| Sub-component | File | Role | Status |
|---------------|------|------|--------|
| FastAPI app | `main.py` | App entrypoint, CORS, router mount | ✅ |
| Config | `core/config.py` | All env vars, thresholds | ✅ |
| API router | `api/v1/router.py` | Aggregates all endpoint modules | ✅ |
| Questions endpoint | `api/v1/endpoints/questions.py` | CRUD + generate + feedback | ✅ |
| Sessions endpoint | `api/v1/endpoints/sessions.py` | Create, answer, submit | ✅ |
| Exams endpoint | `api/v1/endpoints/exams.py` | List exams, get blueprint | ✅ |
| Admin endpoint | `api/v1/endpoints/admin.py` | Index docs, metrics, question mgmt | ⚠️ Metrics hardcoded |
| Question model | `models/question.py` | Pydantic Question, Session, Feedback | ✅ |
| Generator | `services/generation/generator.py` | Orchestrates LLM question generation | ✅ |
| Prompts | `services/generation/prompts.py` | System + generation prompt templates | ✅ |
| Retriever | `services/rag/retriever.py` | Azure AI Search hybrid+semantic RAG | ✅ |
| Indexer | `services/indexing/indexer.py` | Document chunking + vector upload | ✅ |
| Validator | `services/validation/validator.py` | Quality scoring, duplicate check | ⚠️ Partially wired |

### 3.3 AI Layer

| Component | Role | Status |
|-----------|------|--------|
| Azure OpenAI GPT-4o | Primary question generation LLM | ✅ Wired |
| Azure OpenAI text-embedding-3-large (3072 dims) | Query + document embeddings | ✅ Wired |
| Anthropic claude-sonnet-4-6 | Fallback LLM if Azure OpenAI fails | ✅ Wired |
| `_mock_response()` | Hardcoded fallback; returns fixed AI-102 question | ✅ Always succeeds |
| Azure AI Search (certmaster-docs) | HNSW vector index + BM25 + semantic ranker | ✅ Wired |

### 3.4 Storage Layer

| Store | Type | Persistence | Notes |
|-------|------|-------------|-------|
| `_question_store` (dict) | In-memory | Lost on restart | `questions.py` |
| `_admin_question_store` (dict) | In-memory | Lost on restart | Separate from `_question_store` — not shared |
| `_feedback_store` (list) | In-memory | Lost on restart | — |
| `_sessions` (dict) | In-memory | Lost on restart | `sessions.py` |
| Azure AI Search `certmaster-docs` | Cloud index | Persistent | Only durable store |
| Redis | Cache | N/A | 🔧 Configured, not wired |
| Azure Blob Storage | File store | N/A | 🔧 Configured, not wired |

---

## 4. Question Generation Pipeline

This pipeline lives in `backend/app/services/generation/generator.py`.

### Step-by-Step Flow

```
POST /api/v1/questions/generate
  │
  ├── generate_batch(exam_code, count, difficulty, objective_filter, question_type)
  │     └── asyncio.gather([generate_question(...) × count])
  │
  └── generate_question(exam_code, difficulty, objective_filter, question_type)
        │
        ├── 1. select_objective(exam_code, objective_filter)
        │       Weighted random selection from blueprint domains
        │       Returns a specific objective string
        │
        ├── 2. Build query string
        │       Format: "{exam} {objective} {difficulty} question"
        │
        ├── 3. get_embedding(query)
        │       Azure OpenAI text-embedding-3-large → 3072-dim vector
        │
        ├── 4. retriever.retrieve(query, exam_code, objective, top_k=5, embedding=vector)
        │       (See RAG Pipeline section below)
        │
        ├── 5. retriever.build_context(chunks, max_tokens=4096)
        │       Sort by score desc → token-estimate each chunk (len/1.3)
        │       Break loop when cumulative > 4096 tokens
        │       Format: "[SOURCE: {title} | {url}]\n{content}\n---"
        │
        ├── 6. build_generation_prompt(exam, objective, difficulty, type, context, doc_ids)
        │       From services/generation/prompts.py
        │       Instructs LLM to self-report grounding_score and citation_coverage
        │       Thresholds (0.75/0.60) embedded in prompt text — NOT read from config
        │
        ├── 7. _llm_generate(SYSTEM_PROMPT, prompt)
        │       Try: Azure OpenAI GPT-4o (temperature=0.7, max_tokens=4096, json_object)
        │       Except: Anthropic claude-sonnet-4-6 (temperature=0.7, max_tokens=4096)
        │       Except: _mock_response() → hardcoded AI-102 JSON, always passes all gates
        │
        └── 8. _parse_question(response_text, doc_ids)
                JSON parse response
                Gate A: blocked == true → return None
                Gate B: grounding_score < settings.MIN_GROUNDING_SCORE (0.75) → return None
                Gate C: citation_coverage < settings.MIN_CITATION_COVERAGE (0.60) → return None
                Build Question object from parsed JSON
                validator.score_quality(question) → sets quality_score (informational only)
                Return Question or None
```

**Return:** All non-None results from the gather. If zero survive all gates → HTTP 422.

### Grounding Validation Architecture

The grounding system has a design gap: it relies entirely on **LLM self-reporting**. The LLM is instructed (via the prompt) to self-assign `grounding_score` and `citation_coverage`, and to set `blocked=true` if they fall below thresholds. The application then reads and applies these values, but:

- It does **not independently compute** whether citations are real.
- It does **not verify** that cited `doc_ids` actually appeared in the retrieved context.
- `validator.check_duplicate()` (Jaccard > 0.85) exists but is **never called**.
- `validator.validate_blueprint_alignment()` exists but is **never called**.
- `MIN_QUALITY_SCORE=0.70` is defined in config but **not enforced** — `score_quality()` result is stored only.

---

## 5. RAG Pipeline Detail

Source: `backend/app/services/rag/retriever.py`

### Retrieval

```python
# OData filter
filter_expr = f"exam_code eq '{exam_code}'"
if objective:
    filter_expr += f" and objective eq '{objective}'"

# Search mode
if embedding:
    # Hybrid: keyword + vector
    VectorizedQuery(vector=embedding, k_nearest_neighbors=5, fields="content_vector")
    query_type = "semantic"
    semantic_configuration_name = "certmaster-semantic"
else:
    # Pure keyword fallback
    standard search, no vector query
```

- `TOP_K_RETRIEVAL = 5`
- `MAX_CONTEXT_TOKENS = 4096`

### Fallback Behavior

If **any exception** occurs during retrieval (connection error, missing index, etc.), the retriever catches it and returns a **single hardcoded fallback chunk** with `doc_id="fallback-001"`. This means generation will proceed even when Azure AI Search is completely unavailable — but the resulting question will be grounded only against a static string.

### Index Schema — `certmaster-docs`

| Field | Type | Attributes |
|-------|------|-----------|
| id | string (key) | — |
| content | string | searchable |
| title | string | searchable, filterable |
| url | string | — |
| exam_code | string | filterable, facetable |
| objective | string | filterable, facetable |
| source_type | string | — |
| chunk_index | int | — |
| content_vector | Collection(Single) | 3072 dims, HNSW algorithm, profile: certmaster-profile |

Vector similarity algorithm: HNSW. BM25 keyword search runs in parallel for hybrid mode. Final ranking uses Azure's semantic ranker (`certmaster-semantic` configuration).

---

## 6. Exam Session Lifecycle

### Current (Mock) Lifecycle

```
/exams/[examCode]           — User selects: mode, count(10-50), difficulty, domain, type
      │
      ▼
handleStart()               — Encodes all params to URL query string
      │
      ▼
router.push(/exam/[code]?mode=...&count=...&difficulty=...&domain=...&type=...)
      │
      ▼
/exam/[examCode] useEffect  — Reads examCode, mode, count from URL
      │                       ⚠️ difficulty, domain, type silently discarded
      ▼
getMockSession(examCode, mode, count)  — mockData.ts
      │   Filters MOCK_QUESTIONS by q.exam === examCode
      │   .slice(0, count) — never pads if count > available
      │   Returns ExamSession {sessionId: `session-${Date.now()}`, questions}
      │   ⚠️ examApi.startSession NEVER called
      ▼
Zustand setSession()        — currentIndex=0, timeRemaining=blueprint.durationMinutes*60
      │
      ▼
ExamPlayer renders          — Mode-dependent behavior:
      │   Certification: countdown timer, no hints, no explanations, auto-submit
      │   Practice: timer static display, hint button, explain-after-answer
      │   Study: no timer, auto-show explanation on answer, green/red highlighting
      │
      ▼ (per-answer)
Zustand setAnswer()         — Local state only
      │   ⚠️ examApi.saveAnswer NEVER called
      ▼
handleSubmit()              — setSubmitted(true)
      │   ⚠️ examApi.submitSession NEVER called
      │   Score: correct/total * 1000, pass if >= 700
      │   ⚠️ 700 hardcoded — ignores blueprint.passingScore
      ▼
ResultScreen                — Score display, domain performance bars, radar chart
```

### Mock Question Coverage Gap

| Exam | Available | Max Requestable | Gap |
|------|-----------|-----------------|-----|
| AI-102 | 7 | 50 | If user selects count=20, gets only 7 |
| AZ-104 | 3 | 50 | — |
| AZ-305 | 2 | 50 | — |
| GH-300 | 4 | 50 | — |
| AB-100 | 6 | 50 | — |
| AI-103 | 2 | 50 | — |

Question types with **zero mock coverage**: Hotspot, CaseStudy, BestAnswer.

### Practice Mode — Timer Bug

The timer renders but never counts down in Practice mode. In `ExamPlayer`, the `useEffect` for the countdown interval checks `if (session.mode !== 'certification') return` before starting the interval. The timer display is static.

---

## 7. Data Flow

### Where Data Lives

```
Frontend (Browser)
  localStorage["certmaster-exam"]     — Zustand ExamStore (session, currentIndex)
  localStorage["certmaster-app"]      — Zustand AppStore (sidebarOpen)
  sessionStorage                      — Guest user session (lost on tab close)

  ⚠️ timeRemaining NOT persisted — resets to 0 on page reload (mid-exam reload = broken timer)
  ⚠️ showExplanation, showHint NOT persisted

Backend (Python process)
  _question_store: dict[str, Question]          — lost on restart
  _admin_question_store: dict[str, Question]    — lost on restart (separate, not shared)
  _feedback_store: list[QuestionFeedback]       — lost on restart
  _sessions: dict[str, dict]                    — lost on restart

Azure AI Search: certmaster-docs index         — ONLY durable store
  Contains: chunked documentation with embeddings
  Does NOT contain: questions, sessions, scores, user data
```

### Data That Is Never Persisted

- Generated questions (ephemeral per process run)
- Exam sessions
- User answers
- Scores and results
- User feedback on questions
- Admin-uploaded questions (separate store, also in-memory)

---

## 8. Known Architectural Gaps

### Critical

1. **No database** — All backend stores are Python in-memory dicts. Every server restart wipes all questions, sessions, scores, and feedback. There is no SQLAlchemy, SQLModel, or any DB client configured.

2. **Frontend never calls the backend** — The entire exam lifecycle uses `mockData.ts`. `examApi.startSession`, `examApi.saveAnswer`, and `examApi.submitSession` are defined but never invoked. Users cannot interact with AI-generated questions.

3. **No authentication enforcement** — `JWT_SECRET_KEY` is configured but zero endpoints have `Depends(get_current_user)`. Admin endpoints (`/api/v1/admin/*`) are publicly accessible with no protection.

4. **Auth token key mismatch** — `auth.tsx` writes `localStorage["certmaster-user"]`; `api.ts` reads `localStorage["access_token"]`. The Bearer token is always absent, so authenticated API calls will always be treated as unauthenticated.

### High

5. **Grounding is LLM self-reported** — The application trusts the LLM to assign its own `grounding_score` and `citation_coverage`. There is no independent citation verification. A hallucinating model can simply report `grounding_score: 0.99` and pass all gates.

6. **Admin metrics are hardcoded** — `GET /admin/metrics` returns `avg_grounding=0.93`, `total_today=47`, `index.total_chunks=84192` as string literals, not computed from real data.

7. **`_admin_question_store` is isolated** — Questions managed via admin endpoints are stored in a separate dict from questions served by exam endpoints. Admin-created content never appears in exams.

8. **`validator` methods unused** — `check_duplicate()` (Jaccard similarity) and `validate_blueprint_alignment()` are implemented but never called. Duplicate questions and off-blueprint content can be generated without detection.

9. **Practice mode timer broken** — The countdown timer is rendered but static in Practice mode. The countdown `useEffect` exits early for non-certification modes.

### Medium

10. **Mock question count ceiling** — `getMockSession` uses `.slice(0, count)` without padding. A user who selects `count=20` on AZ-104 receives only 3 questions. No error is shown.

11. **Difficulty/domain/type params discarded** — User selections on the setup page are encoded into the URL but silently ignored by `getMockSession`. All users get the same question set regardless of filters.

12. **Guest sessions not restored** — `loginAsGuest()` writes to `sessionStorage`, which is not restored on mount. Guest state is lost on tab close or page refresh.

13. **`timeRemaining` not persisted** — Reloading the browser mid-exam resets the timer to 0, breaking the Certification mode experience.

14. **Port mismatch risk** — `api.ts` defaults to `localhost:8000` but `.env.local` sets `localhost:8003`. If `.env.local` is absent (e.g., fresh clone without env setup), all API calls target the wrong port silently.

15. **`_mock_response()` always succeeds** — The mock LLM fallback returns a hardcoded AI-102 question that passes all grounding gates. This means generation always appears to succeed even when both Azure OpenAI and Anthropic are unavailable, which can mask connectivity issues.

---

## 9. Recommendations

### P0 — Blocking for Production

1. **Add a database.** Integrate SQLAlchemy (async) + PostgreSQL (or SQLite for dev). Create models for `Question`, `ExamSession`, `Answer`, `UserFeedback`. Replace all in-memory dicts with DB-backed repositories.

2. **Wire authentication middleware.** Implement `get_current_user` dependency. Apply it to all non-public endpoints. Fix the token key mismatch (`certmaster-user` → `access_token` or rewrite the interceptor to read the correct key).

3. **Connect the frontend to the real API.** Replace `getMockSession()` calls with `examApi.startSession()`. Wire `examApi.saveAnswer()` per answer. Wire `examApi.submitSession()` on submit.

### P1 — High Priority

4. **Implement independent grounding verification.** After LLM generation, check that each cited `doc_id` in the response was actually present in the retrieved context. Recompute a simple n-gram overlap score rather than relying solely on LLM self-reporting.

5. **Call `validator.check_duplicate()` in the generation pipeline.** It is implemented — just wire it after `_parse_question`.

6. **Fix admin metrics.** Compute `avg_grounding` from stored questions, `total_today` from session timestamps, `index.total_chunks` from an Azure AI Search count query.

7. **Merge admin and exam question stores.** Either use a single shared store or persist to the DB and query uniformly.

### P2 — Medium Priority

8. **Fix Practice mode timer.** Remove the early exit guard or add separate timer logic for Practice mode (e.g., count-up instead of countdown).

9. **Pad mock sessions.** When `count > available`, either cycle mock questions or show an informative message.

10. **Persist `timeRemaining` in Zustand.** Add it to the persisted keys so mid-exam reloads restore the correct remaining time.

11. **Instantiate Redis client.** The config and TTL are already defined. Add `redis.asyncio` client initialization in `main.py` lifespan, use it for caching generated questions and session data.

12. **Wire Azure Blob Storage.** `BlobServiceClient` setup, used for storing uploaded source documents before indexing.

13. **Standardize environment.** Document the required `.env.local` keys and validate at startup that `NEXT_PUBLIC_API_URL` is set. Add a startup check that logs clearly if env vars are missing.
