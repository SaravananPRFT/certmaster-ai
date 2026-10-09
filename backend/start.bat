@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Backend virtual environment not found at backend\.venv.
    echo Create it and install dependencies with:
    echo   py -m venv .venv
    echo   .venv\Scripts\python.exe -m pip install -r requirements.txt
    exit /b 1
)
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
