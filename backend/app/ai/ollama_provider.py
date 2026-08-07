import json
from typing import List
import httpx
from loguru import logger
from app.ai.base import AIProvider, AiGeneratedQuestion
from app.core.config import settings


class OllamaProvider(AIProvider):
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model

    async def _generate(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False},
            )
            resp.raise_for_status()
            return resp.json().get("response", "")

    async def _chat(self, messages: List[dict]) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/chat",
                json={"model": self.model, "messages": messages, "stream": False},
            )
            resp.raise_for_status()
            return resp.json().get("message", {}).get("content", "")

    async def generate_questions(self, certification_code, certification_name, skill_area, difficulty, count) -> List[AiGeneratedQuestion]:
        prompt = f"""Generate {count} multiple-choice practice questions for the {certification_code} ({certification_name}) certification exam.
Skill area: {skill_area}
Difficulty: {difficulty}

Return ONLY a JSON array with no extra text:
[
  {{
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Why this is correct",
    "difficulty": "{difficulty}",
    "skill_area": "{skill_area}"
  }}
]"""
        raw = await self._generate(prompt)
        try:
            start = raw.find("[")
            end = raw.rfind("]") + 1
            data = json.loads(raw[start:end])
            return [AiGeneratedQuestion(**q) for q in data]
        except Exception as e:
            logger.error(f"Failed to parse AI questions: {e}")
            return []

    async def chat(self, messages: List[dict], system_prompt: str = "") -> str:
        ollama_messages = []
        if system_prompt:
            ollama_messages.append({"role": "system", "content": system_prompt})
        ollama_messages.extend(messages)
        return await self._chat(ollama_messages)

    async def generate_study_plan(self, certification_code, certification_name, skills, days_until_exam, daily_hours) -> dict:
        prompt = f"""Create a study plan for {certification_code} ({certification_name}).
Days until exam: {days_until_exam}
Daily study hours: {daily_hours}
Skills to cover: {', '.join(skills)}

Return ONLY a JSON object:
{{
  "weeks": [
    {{
      "week_number": 1,
      "days": [
        {{
          "day_number": 1,
          "date": "Day 1",
          "focus": "Topic name",
          "tasks": ["Task 1", "Task 2"],
          "estimated_minutes": 120
        }}
      ]
    }}
  ]
}}"""
        raw = await self._generate(prompt)
        try:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            return json.loads(raw[start:end])
        except Exception as e:
            logger.error(f"Failed to parse study plan: {e}")
            return {"weeks": []}
