"""Study plan generation endpoint."""
import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.generation.generator import generator, EXAM_BLUEPRINTS
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/planner", tags=["planner"])


class StudyPlanRequest(BaseModel):
    exam_code: str
    exam_date: str
    daily_hours: float = Field(default=2.0, ge=0.5, le=12.0)
    experience_level: str = "intermediate"
    weak_domains: list[str] = []


def _extract_json(raw: str) -> str:
    """
    Robustly extract JSON from an LLM response regardless of surrounding text.
    Handles: raw JSON, ```json...``` fences, preamble text before JSON.
    """
    cleaned = raw.strip()

    # Strip markdown fences if present anywhere in the response
    if "```" in cleaned:
        # Find the content between the first ``` and the last ```
        start = cleaned.find("```")
        end = cleaned.rfind("```")
        if end > start:
            inner = cleaned[start + 3 : end].strip()
            if inner.startswith("json"):
                inner = inner[4:].strip()
            cleaned = inner

    # Extract from the first '{' to the matching last '}'
    json_start = cleaned.find("{")
    json_end = cleaned.rfind("}")
    if json_start != -1 and json_end > json_start:
        cleaned = cleaned[json_start : json_end + 1]

    return cleaned.strip()


async def _llm_generate_large(system: str, user: str) -> str:
    """Call the LLM with a higher token budget for large JSON responses."""
    if settings.PORTKEY_API_KEY and settings.PORTKEY_BASE_URL:
        try:
            client = generator._get_portkey_client()
            resp = await client.chat.completions.create(
                model=settings.CLAUDE_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=0.7,
                max_tokens=8192,
            )
            return resp.choices[0].message.content or "{}"
        except Exception as e:
            logger.warning("Large-token Portkey call failed: %s — falling back", e)
    # Fallback to the shared generator method
    return await generator._llm_generate(system, user)


@router.post("/generate")
async def generate_study_plan(req: StudyPlanRequest):
    blueprint = EXAM_BLUEPRINTS.get(req.exam_code)
    if not blueprint:
        raise HTTPException(status_code=404, detail=f"Exam {req.exam_code} not found")

    domains = blueprint.get("domains", [])
    domain_text = "\n".join(
        f"- {d['name']} ({d['weight']}%): {', '.join(d['objectives'])}"
        for d in domains
    )
    weak_text = ", ".join(req.weak_domains) if req.weak_domains else "None specified"
    max_daily_minutes = int(req.daily_hours * 60)

    system_prompt = (
        "You are a Microsoft certification coach with 15+ years of experience. "
        "Generate a structured, realistic study plan as pure JSON. "
        "Return ONLY the JSON object — no markdown fences, no preamble, no explanation."
    )

    user_prompt = f"""Create a personalized study plan:
- Exam: {req.exam_code} — {blueprint.get('name', '')}
- Target exam date: {req.exam_date}
- Daily study hours: {req.daily_hours}
- Experience level: {req.experience_level}
- Weak areas: {weak_text}

Exam domains and weights:
{domain_text}

Return ONLY this JSON structure (start your response with {{ and end with }}):
{{
  "exam_code": "{req.exam_code}",
  "exam_name": "{blueprint.get('name', '')}",
  "total_weeks": <integer 4-12 based on exam date and hours available>,
  "daily_hours": {req.daily_hours},
  "overview": "2-3 sentence personalized summary",
  "weeks": [
    {{
      "week": 1,
      "title": "Short descriptive title",
      "focus_domain": "Domain name",
      "topics": ["topic 1", "topic 2", "topic 3"],
      "daily_tasks": [
        {{"day": "Mon", "task": "Task description", "duration_minutes": 60, "type": "reading"}},
        {{"day": "Wed", "task": "Task description", "duration_minutes": 60, "type": "practice"}},
        {{"day": "Fri", "task": "Task description", "duration_minutes": 45, "type": "quiz"}}
      ],
      "milestone": "Measurable goal for this week",
      "resources": ["MS Learn path or module name"]
    }}
  ],
  "exam_tips": ["tip 1", "tip 2", "tip 3", "tip 4", "tip 5"],
  "recommended_practice": "Advice on practice test timing and frequency"
}}

Rules:
- Each day's task duration must not exceed {max_daily_minutes} minutes
- Include 3 daily tasks per week (Mon/Wed/Fri pattern or equivalent)
- Prioritize weak areas and high-weight domains in early weeks
- Task types: "reading", "practice", "review", "lab", "quiz"
- Start your response directly with {{ — no preamble text"""

    raw = await _llm_generate_large(system_prompt, user_prompt)

    logger.debug("Raw planner response (first 200): %s", raw[:200])

    cleaned = _extract_json(raw)

    try:
        plan = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(
            "Study plan JSON parse failed: %s\nCleaned (first 400): %s",
            e,
            cleaned[:400],
        )
        raise HTTPException(
            status_code=422,
            detail="Failed to generate a valid study plan. Please try again.",
        )

    return plan
