# CertMasterAI — Flow Diagrams

> Generated: 2026-08-12 | Mermaid diagrams — render in GitHub, VS Code, or mermaid.live

---

## Diagram A — High-Level System Architecture

```mermaid
graph TD
    Browser["Browser / Next.js 15"]

    subgraph Frontend["Frontend (frontend/)"]
        SetupPage["/exams/[code] Setup Page"]
        ExamPlayer["/exam/[code] Exam Player"]
        MockData["mockData.ts\n24 hardcoded questions"]
        ZustandStore["Zustand Store\nExamStore + AppStore"]
        AuthCtx["lib/auth.tsx\nAuth Context"]
        ApiClient["lib/api.ts\nexamApi\n(defined, never called)"]
        ResultScreen["ResultScreen\nclient-side score calc"]
    end

    subgraph Backend["Backend (backend/app/)"]
        FastAPI["FastAPI\nmain.py"]

        subgraph APILayer["API Layer (api/v1/)"]
            QuestionsEP["questions.py\nGET/POST /questions"]
            SessionsEP["sessions.py\nPOST/GET/PATCH /sessions"]
            AdminEP["admin.py\n/admin/* (unprotected)"]
            ExamsEP["exams.py\n/exams"]
        end

        subgraph AIServices["AI Services"]
            Generator["generator.py\nQuestion Generation"]
            Retriever["retriever.py\nRAG Retrieval"]
            Indexer["indexer.py\nDocument Indexer"]
            Validator["validator.py\nQuality Scoring"]
        end

        subgraph Stores["In-Memory Stores (ephemeral)"]
            QuestionStore["_question_store\ndict[str, Question]"]
            SessionStore["_sessions\ndict[str, dict]"]
            FeedbackStore["_feedback_store\nlist[Feedback]"]
            AdminStore["_admin_question_store\n(separate, not shared)"]
        end
    end

    subgraph AzureServices["Azure Services"]
        AzureOAI["Azure OpenAI\nGPT-4o + text-embedding-3-large"]
        AzureSearch["Azure AI Search\ncertmaster-docs\nHNSW + BM25 + Semantic"]
        AzureBlob["Azure Blob Storage\n🔧 configured, not wired"]
        EntraID["Azure Entra ID\n🔧 configured, not wired"]
    end

    subgraph Anthropic["Anthropic"]
        ClaudeSonnet["claude-sonnet-4-6\nFallback LLM"]
    end

    subgraph Cache["Cache Layer"]
        Redis["Redis\n🔧 configured, not wired"]
    end

    Browser --> SetupPage
    SetupPage --> ExamPlayer
    ExamPlayer -->|"✅ ACTIVE PATH"| MockData
    ExamPlayer -->|"❌ NEVER CALLED"| ApiClient
    MockData --> ZustandStore
    ZustandStore --> ResultScreen

    ApiClient -.->|"intended connection\n(not wired)"| FastAPI
    FastAPI --> QuestionsEP
    FastAPI --> SessionsEP
    FastAPI --> AdminEP
    FastAPI --> ExamsEP

    QuestionsEP --> Generator
    SessionsEP --> Generator
    Generator --> Retriever
    Generator --> Validator
    Generator --> QuestionStore
    SessionsEP --> SessionStore

    Retriever --> AzureSearch
    Generator -->|"primary LLM"| AzureOAI
    Generator -->|"fallback LLM"| ClaudeSonnet
    Indexer --> AzureOAI
    Indexer --> AzureSearch

    QuestionStore -.->|"intended"| Redis
    SessionStore -.->|"intended"| Redis
    AdminEP -.->|"intended"| AzureBlob

    style MockData fill:#ff9900,color:#000
    style ApiClient fill:#cccccc,color:#666
    style Redis fill:#eeeeee,color:#999
    style AzureBlob fill:#eeeeee,color:#999
    style EntraID fill:#eeeeee,color:#999
```

---

## Diagram B — Question Generation Flow

```mermaid
sequenceDiagram
    participant Client as Client
    participant QEP as questions.py<br/>/questions/generate
    participant Gen as generator.py<br/>generate_batch()
    participant Sel as select_objective()
    participant Emb as Azure OpenAI<br/>text-embedding-3-large
    participant Ret as retriever.py<br/>retrieve()
    participant Search as Azure AI Search<br/>certmaster-docs
    participant Pmt as prompts.py<br/>build_generation_prompt()
    participant LLM as _llm_generate()
    participant OAI as Azure OpenAI<br/>GPT-4o
    participant Ant as Anthropic<br/>claude-sonnet-4-6
    participant Mock as _mock_response()<br/>hardcoded fallback
    participant Parse as _parse_question()
    participant Val as validator.py<br/>score_quality()

    Client->>QEP: POST /api/v1/questions/generate<br/>{exam_code, count, difficulty, objective, type}
    QEP->>Gen: generate_batch(exam_code, count, ...)

    loop asyncio.gather × count
        Gen->>Sel: select_objective(exam_code, filter)
        Sel-->>Gen: objective (weighted random from blueprint)

        Gen->>Gen: build query string<br/>"{exam} {objective} {difficulty} question"

        Gen->>Emb: get_embedding(query)
        Emb-->>Gen: vector[3072]

        Gen->>Ret: retrieve(query, exam_code, objective, top_k=5, embedding)
        Ret->>Search: hybrid search<br/>OData filter: exam_code + objective<br/>VectorizedQuery k=5, semantic ranking
        alt Search succeeds
            Search-->>Ret: top-5 chunks with scores
        else Any exception
            Ret-->>Gen: fallback chunk (doc_id="fallback-001")
        end
        Ret-->>Gen: chunks[]

        Gen->>Ret: build_context(chunks, max_tokens=4096)
        Note over Ret: Sort by score desc<br/>Token-estimate: len/1.3<br/>Break at 4096 tokens<br/>Format: [SOURCE: title | url]\ncontent
        Ret-->>Gen: context string

        Gen->>Pmt: build_generation_prompt(exam, objective, difficulty, type, context, doc_ids)
        Note over Pmt: Instructs LLM to self-report<br/>grounding_score ≥ 0.75<br/>citation_coverage ≥ 0.60
        Pmt-->>Gen: prompt string

        Gen->>LLM: _llm_generate(SYSTEM_PROMPT, prompt)
        LLM->>OAI: GPT-4o (temp=0.7, max_tokens=4096, json_object)
        alt Azure OpenAI succeeds
            OAI-->>LLM: JSON response
        else Azure OpenAI fails
            LLM->>Ant: claude-sonnet-4-6 (temp=0.7, max_tokens=4096)
            alt Anthropic succeeds
                Ant-->>LLM: text response
            else Anthropic fails
                LLM->>Mock: _mock_response()
                Mock-->>LLM: hardcoded AI-102 JSON (always passes gates)
            end
        end
        LLM-->>Gen: raw_response

        Gen->>Parse: _parse_question(raw_response, doc_ids)
        Note over Parse: JSON parse<br/>Gate A: blocked==true → None<br/>Gate B: grounding_score < 0.75 → None<br/>Gate C: citation_coverage < 0.60 → None
        Parse-->>Gen: Question | None

        alt Question is not None
            Gen->>Val: score_quality(question)
            Note over Val: Sets quality_score<br/>MIN_QUALITY_SCORE=0.70 NOT enforced
            Val-->>Gen: quality_score (informational)
        end
    end

    Gen-->>QEP: [Question, ...] (non-None results)
    alt Zero questions survive gates
        QEP-->>Client: HTTP 422 Unprocessable Entity
    else One or more questions survive
        QEP-->>Client: HTTP 200 list[Question]
    end
```

---

## Diagram C — Mock Exam Mode Flow (Certification)

```mermaid
sequenceDiagram
    participant User as User
    participant Setup as /exams/[code]<br/>Setup Page
    participant Router as Next.js Router
    participant Player as /exam/[code]<br/>Exam Player
    participant Mock as getMockSession()<br/>mockData.ts
    participant Zustand as Zustand ExamStore
    participant Timer as Timer<br/>(countdown)
    participant Score as Client-Side<br/>Score Calc

    User->>Setup: Selects mode=certification,<br/>count=20, difficulty=hard,<br/>domain=..., type=...
    Setup->>Router: router.push(/exam/[code]?mode=certification&count=20&difficulty=hard&...)
    Router->>Player: Load page

    Player->>Player: useEffect on mount<br/>reads examCode, mode, count from URL
    Note over Player: ⚠️ difficulty, domain, type SILENTLY DISCARDED

    Player->>Mock: getMockSession(examCode, "certification", 20)
    Note over Mock: Filters MOCK_QUESTIONS by q.exam===examCode<br/>.slice(0, 20) — never pads<br/>Returns session-{Date.now()}
    Note over Mock: ⚠️ examApi.startSession NEVER called
    Mock-->>Player: ExamSession {questions: [...up to 7]}

    Player->>Zustand: setSession(session)
    Note over Zustand: currentIndex=0<br/>timeRemaining=blueprint.durationMinutes*60

    Zustand->>Timer: Start countdown interval
    Note over Timer: Active in certification mode<br/>Auto-submits on expiry

    loop Per question
        Player->>User: Render question<br/>(no hints, no explanations)
        User->>Player: Select answer
        Player->>Zustand: setAnswer(questionId, answer)
        Note over Zustand: ⚠️ examApi.saveAnswer NEVER called
    end

    alt User clicks Submit
        User->>Player: handleSubmit()
    else Timer expires
        Timer->>Player: auto-submit
    end

    Player->>Player: setSubmitted(true)
    Note over Player: ⚠️ examApi.submitSession NEVER called

    Player->>Score: correct/total * 1000
    Note over Score: pass if score >= 700<br/>⚠️ Hardcoded — ignores blueprint.passingScore

    Score-->>User: ResultScreen<br/>(score, domain bars, radar chart)
```

---

## Diagram D — Practice Mode Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Setup as /exams/[code]<br/>Setup Page
    participant Player as /exam/[code]<br/>Exam Player (practice)
    participant Mock as getMockSession()<br/>mockData.ts
    participant Zustand as Zustand ExamStore
    participant TimerUI as Timer Display<br/>(static — bug)
    participant HintPanel as Hint Panel<br/>(first 150 chars)
    participant ExplainPanel as ExplanationPanel<br/>(on-demand)

    User->>Setup: Selects mode=practice, count, ...
    Setup->>Player: router.push with params
    Player->>Mock: getMockSession(examCode, "practice", count)
    Note over Mock: ⚠️ examApi.startSession NEVER called
    Mock-->>Player: ExamSession

    Player->>Zustand: setSession(session)

    Player->>TimerUI: Render timer display
    Note over TimerUI: ⚠️ Timer STATIC in practice mode<br/>useEffect exits early for non-certification<br/>No countdown occurs

    loop Per question
        Player->>User: Render question
        opt User clicks Hint
            User->>HintPanel: Show hint
            HintPanel-->>User: explanation.substring(0, 150)
        end

        User->>Player: Select answer
        Player->>Zustand: setAnswer(questionId, answer)
        Note over Zustand: ⚠️ examApi.saveAnswer NEVER called

        opt User clicks Explain (after answering)
            User->>ExplainPanel: Show explanation
            ExplainPanel-->>User: Full explanation<br/>(whyCorrect, whyIncorrect, references)
        end
    end

    User->>Player: Submit
    Player->>Player: setSubmitted(true)
    Note over Player: ⚠️ examApi.submitSession NEVER called
    Player->>Player: correct/total * 1000
    Player-->>User: ResultScreen
```

---

## Diagram E — Study Mode Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Setup as /exams/[code]<br/>Setup Page
    participant Player as /exam/[code]<br/>Exam Player (study)
    participant Mock as getMockSession()<br/>mockData.ts
    participant Zustand as Zustand ExamStore
    participant ExplainPanel as ExplanationPanel<br/>(auto-shown)
    participant OptionStyle as Option Highlighting<br/>(green/red)

    User->>Setup: Selects mode=study, count, ...
    Setup->>Player: router.push with params
    Player->>Mock: getMockSession(examCode, "study", count)
    Note over Mock: ⚠️ examApi.startSession NEVER called
    Mock-->>Player: ExamSession

    Player->>Zustand: setSession(session)
    Note over Player: No timer rendered in study mode

    loop Per question
        Player->>User: Render question<br/>(no timer, no hint button)

        User->>Player: Select answer
        Player->>Zustand: setAnswer(questionId, answer)
        Note over Zustand: ⚠️ examApi.saveAnswer NEVER called

        Player->>OptionStyle: Highlight correct green<br/>incorrect selected red
        OptionStyle-->>User: Visual feedback

        Player->>ExplainPanel: Auto-show (showResult=true)
        ExplainPanel-->>User: whyCorrect<br/>whyIncorrect<br/>references[]

        User->>Player: Navigate to next question
    end

    User->>Player: Submit
    Player->>Player: setSubmitted(true)
    Note over Player: ⚠️ examApi.submitSession NEVER called
    Player->>Player: correct/total * 1000
    Player-->>User: ResultScreen
```

---

## Diagram F — Knowledge Ingestion Flow (Intended / Admin)

```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant AdminEP as admin.py<br/>POST /admin/index
    participant Indexer as indexer.py<br/>DocumentIndexer
    participant Chunker as chunk_document()
    participant Emb as Azure OpenAI<br/>text-embedding-3-large
    participant Search as Azure AI Search<br/>certmaster-docs
    participant Blob as Azure Blob Storage<br/>🔧 not yet wired

    Admin->>AdminEP: POST /api/v1/admin/index<br/>{documents, exam_code, objective}
    Note over AdminEP: ⚠️ No auth required (publicly accessible)

    AdminEP->>Indexer: index_documents(documents, exam_code, objective)

    loop Per document
        Indexer->>Chunker: chunk_document(doc)
        Note over Chunker: Split into overlapping chunks<br/>Tag with exam_code, objective, source_type
        Chunker-->>Indexer: chunks[]

        loop Per chunk
            Indexer->>Emb: get_embedding(chunk.content)
            Emb-->>Indexer: vector[3072]
            Indexer->>Indexer: Build SearchDocument<br/>{id, content, title, url, exam_code,<br/>objective, source_type, chunk_index, content_vector}
        end

        Indexer->>Search: upload_documents(search_docs)
        Search-->>Indexer: upload result
        Note over Search: Available for hybrid search<br/>HNSW + BM25 + semantic ranking
    end

    Note over Blob: ⚠️ Source file storage to Blob<br/>not yet implemented
    Indexer-->>AdminEP: index result summary
    AdminEP-->>Admin: HTTP 200 {indexed_count, ...}
```

---

## Diagram G — Intended Full Flow (When Backend Connected)

> This diagram shows the target architecture when the frontend is wired to the real API.

```mermaid
sequenceDiagram
    participant User as User
    participant Setup as /exams/[code]<br/>Setup Page
    participant Player as /exam/[code]<br/>Exam Player
    participant API as examApi<br/>(lib/api.ts)
    participant Sessions as sessions.py<br/>POST /sessions
    participant Gen as generator.py<br/>generate_batch()
    participant Ret as retriever.py<br/>RAG
    participant Search as Azure AI Search
    participant OAI as Azure OpenAI<br/>GPT-4o
    participant Ant as Anthropic<br/>Fallback
    participant DB as Persistent DB<br/>(future)
    participant Redis as Redis Cache<br/>(future)

    User->>Setup: Configure exam (mode, count, difficulty, domain, type)
    Setup->>Player: Navigate to exam player
    Player->>API: examApi.startSession(examCode, config)
    API->>Sessions: POST /api/v1/sessions<br/>{exam_code, mode, count, difficulty, objective, type}
    Sessions->>Gen: generate_batch(exam_code, count, difficulty, ...)

    Gen->>Ret: retrieve context for each question
    Ret->>Search: Hybrid + semantic search
    Search-->>Ret: Relevant chunks
    Ret-->>Gen: Context strings

    Gen->>OAI: GPT-4o generate (with RAG context)
    alt OpenAI fails
        Gen->>Ant: claude-sonnet-4-6 fallback
    end
    OAI-->>Gen: Grounded question JSON

    Gen->>Gen: _parse_question<br/>Apply grounding gates (0.75/0.60)
    Gen-->>Sessions: Question[]
    Sessions->>DB: Persist session + questions
    Sessions->>Redis: Cache session
    Sessions-->>API: ExamSession {sessionId, questions}
    API-->>Player: Session data

    Player->>User: Render first question

    loop Per answer
        User->>Player: Select answer
        Player->>API: examApi.saveAnswer(sessionId, questionId, answer)
        API->>Sessions: PATCH /sessions/{id}/answers/{qid}
        Sessions->>DB: Persist answer
        Sessions-->>API: 200 OK
    end

    User->>Player: Submit exam
    Player->>API: examApi.submitSession(sessionId)
    API->>Sessions: POST /sessions/{id}/submit
    Sessions->>Sessions: Score all answers<br/>correct/total * 1000<br/>pass if >= blueprint.passingScore
    Sessions->>DB: Persist final score
    Sessions-->>API: {score, passed, breakdown}
    API-->>Player: Final results
    Player-->>User: ResultScreen (server-computed score)
```

---

## Sequence Diagrams — All Three Exam Modes (Detailed)

### Certification Mode (Detailed)

```mermaid
sequenceDiagram
    participant U as User
    participant S as Setup Page
    participant P as Exam Player
    participant Z as Zustand Store
    participant T as Countdown Timer

    U->>S: mode=certification, count=20
    S->>P: Navigate (difficulty/domain/type discarded)
    P->>P: getMockSession() — examApi NOT called
    P->>Z: setSession(questions, mode="certification")
    Z->>T: Start interval (1-second tick)

    loop Questions
        P->>U: Question (no hint btn, no explain btn)
        U->>P: Answer
        P->>Z: setAnswer() — examApi NOT called
    end

    alt Timer reaches 0
        T->>P: auto-submit
    else User submits early
        U->>P: Click Submit
    end

    P->>P: Score = correct/total*1000
    Note right of P: Pass threshold: 700 (hardcoded)
    P->>U: ResultScreen
```

### Practice Mode (Detailed)

```mermaid
sequenceDiagram
    participant U as User
    participant S as Setup Page
    participant P as Exam Player
    participant Z as Zustand Store
    participant H as Hint Panel

    U->>S: mode=practice, count=10
    S->>P: Navigate
    P->>P: getMockSession() — examApi NOT called
    P->>Z: setSession(questions, mode="practice")
    Note right of P: Timer renders but STATIC<br/>countdown never starts

    loop Questions
        P->>U: Question (hint btn visible)
        opt Hint requested
            U->>P: Click Hint
            P->>H: Show explanation[0:150]
            H->>U: Partial explanation
        end
        U->>P: Answer
        P->>Z: setAnswer() — examApi NOT called
        opt Explain requested
            U->>P: Click Explain
            P->>U: Full ExplanationPanel<br/>(whyCorrect, whyIncorrect, references)
        end
    end

    U->>P: Submit
    P->>P: Score = correct/total*1000
    P->>U: ResultScreen
```

### Study Mode (Detailed)

```mermaid
sequenceDiagram
    participant U as User
    participant S as Setup Page
    participant P as Exam Player
    participant Z as Zustand Store
    participant E as ExplanationPanel

    U->>S: mode=study, count=10
    S->>P: Navigate
    P->>P: getMockSession() — examApi NOT called
    P->>Z: setSession(questions, mode="study")
    Note right of P: No timer rendered

    loop Questions
        P->>U: Question (no timer, no hint)
        U->>P: Answer
        P->>Z: setAnswer() — examApi NOT called
        P->>P: Highlight correct=green, wrong=red
        P->>E: Auto-show ExplanationPanel (showResult=true)
        E->>U: whyCorrect + whyIncorrect + references[]
        U->>P: Next question
    end

    U->>P: Submit
    P->>P: Score = correct/total*1000
    P->>U: ResultScreen
```

---

## Current vs Intended Architecture

| Component | Current Behavior | Intended Behavior |
|-----------|-----------------|-------------------|
| **Exam session creation** | `getMockSession()` from `mockData.ts` | `POST /api/v1/sessions/` → generate N questions via RAG + LLM |
| **Question source** | 24 hardcoded questions in `mockData.ts` | LLM-generated, grounded in Azure AI Search corpus |
| **Difficulty filter** | Discarded silently | Passed to `generate_batch()` → influences objective selection and prompt |
| **Domain filter** | Discarded silently | Passed as `objective_filter` → OData filter on AI Search |
| **Question type filter** | Discarded silently | Passed to `generate_batch()` → enforced in generation prompt |
| **Answer saving** | Zustand local state only | `PATCH /api/v1/sessions/{id}/answers/{qid}` → persisted to DB |
| **Session submission** | `setSubmitted(true)`, client-side score | `POST /api/v1/sessions/{id}/submit` → server-computed score |
| **Score calculation** | `correct/total*1000`, hardcoded pass=700 | Server-side, uses `blueprint.passingScore` |
| **Practice mode timer** | Static display, never counts down | Active count-up or countdown with configurable behavior |
| **Auth header** | Always absent (key mismatch) | JWT Bearer from correct localStorage key or httpOnly cookie |
| **Admin endpoint protection** | Publicly accessible | Requires admin JWT role |
| **Question persistence** | In-memory dict (lost on restart) | DB-backed (SQLAlchemy + PostgreSQL) |
| **Session persistence** | In-memory dict (lost on restart) | DB-backed + Redis cache |
| **Grounding verification** | LLM self-report only | Independent citation coverage recomputation |
| **Duplicate detection** | `check_duplicate()` implemented but never called | Called in generation pipeline after parse |
| **Blueprint alignment** | `validate_blueprint_alignment()` never called | Called and enforced |
| **Quality gate** | `score_quality()` informational only | `MIN_QUALITY_SCORE=0.70` enforced |
| **Admin metrics** | Hardcoded literals (0.93 avg grounding, 47 total today) | Computed from real data in DB/AI Search |
| **Redis** | Config only, no client | Session cache, question cache, rate limiting |
| **Azure Blob Storage** | Config only, no client | Source document storage before indexing |
| **Azure Entra ID** | Config only, no client | Managed identity auth for Azure services |
