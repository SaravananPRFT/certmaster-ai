import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.base import Base
from app.database.session import get_db

TEST_DB = "sqlite:///./test_certmaster.db"
engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)
client = TestClient(app)


def test_register():
    r = client.post("/api/auth/register", json={"email": "test@example.com", "password": "password123", "display_name": "Test User"})
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_invalid():
    r = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "wrong"})
    assert r.status_code == 401


def test_register_duplicate():
    client.post("/api/auth/register", json={"email": "dup@example.com", "password": "pass", "display_name": "Dup"})
    r = client.post("/api/auth/register", json={"email": "dup@example.com", "password": "pass", "display_name": "Dup"})
    assert r.status_code == 400
