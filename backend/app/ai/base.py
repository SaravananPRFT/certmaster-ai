from abc import ABC, abstractmethod
from typing import List
from pydantic import BaseModel


class AiGeneratedQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    difficulty: str
    skill_area: str


class AIProvider(ABC):
    @abstractmethod
    async def generate_questions(self, certification_code: str, certification_name: str, skill_area: str, difficulty: str, count: int) -> List[AiGeneratedQuestion]:
        pass

    @abstractmethod
    async def chat(self, messages: List[dict], system_prompt: str = "") -> str:
        pass

    @abstractmethod
    async def generate_study_plan(self, certification_code: str, certification_name: str, skills: List[str], days_until_exam: int, daily_hours: float) -> dict:
        pass
