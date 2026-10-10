# CertMasterAI — Microsoft Certification Mock Exam Platform

AI-powered Microsoft certification practice platform with RAG-grounded question generation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CertMasterAI                              │
├──────────────────┬──────────────────┬───────────────────────────┤
│  Next.js 16      │  FastAPI          │  Azure Services           │
│  Tailwind v4     │  Python 3.12      │                           │
│  shadcn/ui       │  Pydantic v2      │  ├─ Azure AI Search       │
│  Zustand         │                   │  │  (Vector + Semantic)   │
│  React Query     │  RAG Pipeline:    │  ├─ Azure OpenAI (GPT-4o) │
│  Recharts        │  ┌─────────────┐  │  │  text-embedding-3-large│
│  DnD Kit         │  │ 1. Retrieve │  │  ├─ Azure Blob Storage    │
│                  │  │ 2. Context  │  │  ├─ Azure Cache (Redis)   │
│  Exam Player     │  │ 3. Generate │  │  ├─ Azure Entra ID        │
│  10 Q Types      │  │ 4. Validate │  │  └─ Azure Monitor         │
│  Study/Practice/ │  │ 5. Return   │  │                           │
│  Cert modes      │  └─────────────┘  │                           │
└──────────────────┴──────────────────┴───────────────────────────┘
```

## Supported Certifications

| Exam | Name | Domains |
|------|------|---------|
| AI-102 | Designing and Implementing Azure AI Solution | 6 |
| AZ-104 | Microsoft Azure Administrator | 5 |
| AZ-305 | Designing Azure Infrastructure Solutions | 4 |
| GH-300 | GitHub Advanced Security | 5 |

## Question Types

1. **Multiple Choice (Single)** — Radio button, one correct answer
2. **Multiple Choice (Multiple)** — Checkboxes, multiple correct answers
3. **Drag and Drop** — Assign items to categories
4. **Case Study** — Enterprise scenario with 5-8 related questions
5. **Yes/No** — Binary true/false statement
6. **Match the Following** — Column matching
7. **Build List** — Reorder steps in correct sequence
8. **Best Answer** — Select the best from partially-correct options
9. **Scenario Architecture** — Select the optimal architecture
10. **Hotspot** — Click on correct area

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.12+
- Docker (for Redis)

### Development

```bash
# Option 1: All-in-one script (Windows)
start-dev.bat

# Option 2: Manual
# Terminal 1 — Redis
docker run -d -p 6379:6379 redis:7-alpine

# Terminal 2 — Backend
cd backend
copy .env.example .env  # configure Azure keys
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload

# Terminal 3 — Frontend
cd frontend
npm install --legacy-peer-deps
npm run dev
```

### Docker Compose
```bash
cp backend/.env.example backend/.env   # Add your Azure keys
docker-compose up --build
```

## Configuration

Edit `backend/.env`:

```env
# Configure at least one supported LLM provider for generation
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com
AZURE_OPENAI_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Optional: Azure AI Search RAG (local ChromaDB is used if this is not configured)
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_KEY=your-admin-key

# Optional: Anthropic fallback LLM
ANTHROPIC_API_KEY=sk-ant-...
```

> Question generation requires indexed RAG content and a working LLM provider. If retrieval or generation is unavailable, the API returns an error instead of substituting sample questions.

## RAG Pipeline

```
User Request
     │
     ▼
[1] Analyze exam blueprint + select objective (proportional to domain weight)
     │
     ▼
[2] Generate search query → embed with text-embedding-3-large
     │
     ▼
[3] Azure AI Search — hybrid search (keyword + vector + semantic ranking)
     │  Returns top-K chunks from Microsoft Learn / Azure docs
     ▼
[4] Build compressed context (max 4096 tokens)
     │
     ▼
[5] GPT-4o prompt with:
     │  - System: strict grounding rules
     │  - Context: retrieved chunks
     │  - Blueprint: exam + objective + difficulty + type
     ▼
[6] Parse JSON response → extract question, options, answers, explanation
     │
     ▼
[7] Grounding validator:
     │  - grounding_score ≥ 0.75 ✓
     │  - citation_coverage ≥ 0.60 ✓
     │  - Not duplicate (cosine similarity < 0.92) ✓
     ▼
[8] Quality scorer:
     │  - Question length, options count, explanation depth
     │  - Blueprint alignment check
     ▼
[9] Return validated Question JSON
```

## Anti-Hallucination

Every question carries:
- `grounding_score` — fraction of answer traceable to retrieved docs
- `citation_coverage` — fraction of claims backed by sources
- `retrieved_document_ids` — audit trail to source chunks

Questions with `grounding_score < 0.75` are **blocked** before delivery.

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/questions/generate` | POST | Generate RAG-grounded questions |
| `/api/v1/questions/{id}` | GET | Get specific question |
| `/api/v1/sessions` | POST | Create exam session |
| `/api/v1/sessions/{id}/submit` | POST | Submit session + score |
| `/api/v1/exams` | GET | List all exam blueprints |
| `/api/v1/admin/questions` | GET | Admin question review |
| `/api/v1/admin/index` | POST | Upload + index documents |
| `/api/v1/admin/metrics` | GET | Platform analytics |

Full docs: `http://localhost:8000/api/docs`

## Deployment (Azure)

```bash
cd infra/terraform
terraform init
terraform plan -var="env=prod"
terraform apply
```

Provisions: AI Search, Azure OpenAI, App Service (Backend + Frontend), Redis Cache, Storage, Application Insights.

## Project Structure

```
CertMasterAI/
├── frontend/                  # Next.js 16 app
│   └── src/
│       ├── app/               # App Router pages
│       │   ├── page.tsx       # Landing page
│       │   ├── exams/         # Exam catalog
│       │   ├── exam/[code]/   # Exam player
│       │   ├── dashboard/     # Student dashboard
│       │   └── admin/         # Admin panel
│       ├── components/
│       │   ├── exam/          # Timer, Navigator, Renderer, Results
│       │   ├── ui/            # shadcn-style components
│       │   └── layout/        # Navbar, ThemeProvider
│       ├── lib/
│       │   ├── api.ts         # API client
│       │   ├── store.ts       # Zustand state
│       │   └── mockData.ts    # Dev mock questions
│       └── types/exam.ts      # All TypeScript types
│
├── backend/                   # FastAPI application
│   └── app/
│       ├── main.py            # FastAPI entry point
│       ├── core/config.py     # Pydantic settings
│       ├── models/question.py # Data models
│       ├── services/
│       │   ├── rag/retriever.py       # Azure AI Search retrieval
│       │   ├── generation/
│       │   │   ├── generator.py       # RAG pipeline orchestration
│       │   │   └── prompts.py         # LLM prompt templates
│       │   ├── validation/validator.py # Quality scoring
│       │   └── indexing/indexer.py    # Document indexing
│       └── api/v1/endpoints/  # REST API handlers
│
├── infra/terraform/main.tf    # Azure IaC
├── docker-compose.yml
└── start-dev.bat
```
