# CertMaster AI

AI-powered Microsoft Certification preparation platform. Runs entirely locally — no Docker, no cloud.

## Quick Start

```bash
# 1. Set up backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 2. Build frontend (one-time)
cd ..\frontend
npm install
npm run build

# 3. Start the app
cd ..\backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Then open **http://localhost:8000**

Or on Windows, just double-click **`backend\run.bat`**

## AI Features (optional)

Install Ollama from https://ollama.com then:

```bash
ollama pull llama3
```

Without Ollama, all app features work except AI question generation, chat assistant, and study planner.

## Dev Mode (live reload for frontend)

```bash
# Terminal 1 — backend
cd backend && venv\Scripts\uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend (hot reload)
cd frontend && npm run dev
```

Frontend dev server: http://localhost:5173 (proxies /api to 8000)

## Services

| URL | What |
|---|---|
| http://localhost:8000 | Full app (after `npm run build`) |
| http://localhost:8000/docs | API docs (Swagger UI) |
| http://localhost:5173 | Frontend dev server |

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12 + FastAPI + SQLAlchemy 2.0 |
| Database | SQLite (file: `backend/certmaster.db`) |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| AI | Ollama (local) — llama3, qwen, mistral |
| Auth | JWT (python-jose + passlib) |

## Structure

```
CertMaster-AI/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry + static file serving
│   │   ├── core/            # config, security, deps
│   │   ├── database/        # SQLAlchemy session, base, seed
│   │   ├── models/          # ORM models
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   ├── ai/              # AIProvider ABC + OllamaProvider + factory
│   │   └── api/endpoints/   # auth, certifications, questions, practice, analytics, ai
│   ├── .env                 # local config (not committed in real projects)
│   ├── requirements.txt
│   └── run.bat              # Windows one-click launcher
├── frontend/
│   ├── src/
│   │   ├── pages/           # 10 pages: Landing, Login, Register, Dashboard, ...
│   │   ├── components/ui/   # Button, Card, Input, Badge, Progress
│   │   ├── layouts/         # DashboardLayout
│   │   ├── context/         # AuthProvider, ThemeProvider
│   │   └── lib/             # api.ts, utils.ts
│   └── dist/                # built output (served by FastAPI)
```

## Notes

- Questions are AI-generated practice material — not actual exam questions
- Not affiliated with Microsoft
