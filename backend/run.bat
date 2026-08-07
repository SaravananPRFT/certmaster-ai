@echo off
echo Starting CertMaster AI...
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing dependencies...
pip install -r requirements.txt -q
echo Starting server on http://localhost:8000
start "" http://localhost:8000
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
