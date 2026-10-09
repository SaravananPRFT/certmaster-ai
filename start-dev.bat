@echo off
cd /d "%~dp0"
echo Starting CertMasterAI Development Environment...

echo.
echo [1/3] Starting Redis (Docker)...
docker run -d --name certmaster-redis -p 6379:6379 redis:7-alpine 2>nul || echo Redis already running

echo.
echo [2/3] Starting FastAPI Backend (port 8000)...
if not exist "backend\.venv\Scripts\python.exe" (
    echo Backend virtual environment not found at backend\.venv.
    echo Create it and install dependencies with:
    echo   py -m venv backend\.venv
    echo   backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
    exit /b 1
)
cd backend
if not exist ".env" copy .env.example .env
start cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
cd ..

echo.
echo [3/3] Starting Next.js Frontend (port 3000)...
cd frontend
start cmd /k "npm run dev"
cd ..

echo.
echo ================================================
echo  CertMasterAI is starting up!
echo ================================================
echo  Frontend:  http://localhost:3000
echo  API:       http://localhost:8000
echo  API Docs:  http://localhost:8000/api/docs
echo  Health:    http://localhost:8000/health
echo ================================================
