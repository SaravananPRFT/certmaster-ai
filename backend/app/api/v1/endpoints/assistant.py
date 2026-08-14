"""AI Study Assistant chat endpoint."""
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.generation.generator import generator, EXAM_BLUEPRINTS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/assistant", tags=["assistant"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    exam_code: Optional[str] = None
    conversation_history: list[ChatMessage] = []


@router.post("/chat")
async def chat(req: ChatRequest):
    blueprint = EXAM_BLUEPRINTS.get(req.exam_code or "", {})

    exam_context = ""
    if blueprint:
        domains = blueprint.get("domains", [])
        domain_names = ", ".join(d["name"] for d in domains)
        exam_context = (
            f"\n\nThe user is studying for: {req.exam_code} — {blueprint.get('name', '')}"
            f"\nExam domains: {domain_names}"
            f"\nPassing score: {blueprint.get('passing_score', 700)}/1000"
            f", Duration: {blueprint.get('duration_minutes', 100)} minutes"
        )

    system_prompt = f"""You are CertMasterAI Assistant, an expert Microsoft certification coach.{exam_context}

Your capabilities:
- Explain Azure/GitHub concepts clearly with real-world examples
- Generate practice questions with full explanations on demand
- Give exam strategy and study tips aligned to the exam objectives
- Compare Azure services and explain when to use each one
- Clarify exam domain weightings and what each objective tests

Response guidelines:
- Use **bold** for key terms and service names
- Use bullet lists for comparisons and feature lists
- Use code blocks for CLI commands, ARM templates, or YAML
- Keep responses focused and under 400 words unless generating a practice question
- When generating a practice question, include: the question, 4 options (A-D), correct answer, and a clear explanation"""

    history_parts = []
    for msg in req.conversation_history[-8:]:
        label = "User" if msg.role == "user" else "Assistant"
        history_parts.append(f"{label}: {msg.content}")

    if history_parts:
        full_message = (
            "Previous conversation:\n"
            + "\n\n".join(history_parts)
            + f"\n\nUser: {req.message}"
        )
    else:
        full_message = req.message

    response_text = await generator._llm_generate(system_prompt, full_message)

    return {"response": response_text, "exam_code": req.exam_code}
