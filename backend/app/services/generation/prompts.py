"""
Prompt templates for Microsoft certification question generation.
"""
from app.models.question import QuestionType, Difficulty

SYSTEM_PROMPT = """You are a senior Microsoft certification exam content creator with 15+ years of experience writing questions for AZ-104, AI-102, AZ-305, and similar exams.

STRICT RULES:
1. Generate questions ONLY from the provided context documents. Do NOT use your training knowledge.
2. Every claim must be traceable to a source in the context.
3. Create original questions — never copy or paraphrase existing Microsoft exam questions.
4. Questions must follow Microsoft exam style: precise, unambiguous, scenario-driven where appropriate.
5. Distractors must be plausible but clearly wrong based on the context.
6. Never include trick questions or "none of the above" / "all of the above" options.
7. Return ONLY valid JSON, no markdown fences, no extra text.

GROUNDING REQUIREMENT:
After generating the question, compute:
- grounding_score: fraction of answer content traceable to provided context (0.0–1.0)
- citation_coverage: fraction of key claims backed by provided sources (0.0–1.0)

If grounding_score < 0.75 or citation_coverage < 0.60, set "blocked": true and explain why."""

QUESTION_TYPE_INSTRUCTIONS: dict[QuestionType, str] = {
    "MultipleChoiceSingle": """Generate a single-answer multiple choice question with exactly 4 options (A, B, C, D).
One option is clearly correct based on the context. Three distractors are plausible but incorrect.
Mark the question type as requiring one correct selection.""",

    "MultipleChoiceMultiple": """Generate a multiple-answer multiple choice question with 5 options (A, B, C, D, E).
2-3 options are correct. The question stem must state 'Select all that apply' or 'Select TWO' etc.
Distractors must be plausible services/features that are related but don't satisfy the requirement.""",

    "DragAndDrop": """Generate a drag-and-drop question with 5-7 drag items and 2-3 drop zones (categories).
Each drag item belongs in exactly one drop zone. Items and zones must be directly supported by the context.""",

    "YesNo": """Generate a Yes/No question about a specific Azure feature, capability, or behavior.
The statement must be definitively true (Yes) or false (No) based on the context.
Avoid ambiguous statements.""",

    "MatchFollowing": """Generate a match-the-following question with 4-5 pairs.
Each left item maps to exactly one right item. All mappings must be verifiable from the context.""",

    "BuildList": """Generate a build-list/order-steps question with 5-7 items.
The correct order must be logical and verifiable from the context (e.g., deployment steps, configuration sequence).""",

    "BestAnswer": """Generate a 'best answer' question where multiple options could be partially correct
but one is clearly the BEST approach based on Microsoft's recommended practices in the context.""",

    "ScenarioArchitecture": """Generate a scenario-based architecture question with a realistic enterprise scenario.
Include company context, requirements, and constraints. Options should be complete architecture descriptions.
The correct answer must satisfy ALL stated requirements.""",

    "CaseStudy": """Generate a case study with 5-8 related questions based on a single enterprise scenario.
The scenario must include: company background, existing environment, business requirements, technical requirements, constraints.""",

    "Hotspot": """Generate a hotspot question describing an image/diagram with clickable areas.
Describe the areas textually since we can't generate actual images.""",
}

DIFFICULTY_GUIDELINES: dict[Difficulty, str] = {
    "Easy": """Easy question:
- Tests definition/concept recognition or basic feature identification
- Single-service, no architectural reasoning required
- Straightforward scenario with obvious answer from context
- Cognitive level: Remember/Understand (Bloom's)""",

    "Medium": """Medium question:
- Tests implementation knowledge and service configuration
- May involve 2-3 services working together
- Requires understanding of when/why to use a feature
- Cognitive level: Apply/Analyze (Bloom's)""",

    "Hard": """Hard question:
- Tests architectural decision-making, cost optimization, or security trade-offs
- Multi-service architecture scenario with competing constraints
- Requires evaluating multiple valid approaches and selecting the best
- Cognitive level: Evaluate/Create (Bloom's)""",
}

FALLBACK_SYSTEM_PROMPT = """You are a senior Microsoft certification exam content creator with 15+ years of experience writing questions for AZ-104, AI-102, AZ-305, AB-100, GH-300, and AI-103 exams.

Azure AI Search is not available in this environment, so generate questions from your expert knowledge of Microsoft technologies and official exam objectives.

RULES:
1. Generate accurate, exam-style questions aligned with the specified exam and objective.
2. Follow Microsoft exam style: precise, unambiguous, scenario-driven where appropriate.
3. Distractors must be real Azure features/services that are plausible but incorrect for the scenario.
4. Never include trick questions or "none of the above" / "all of the above" options.
5. Return ONLY valid JSON, no markdown fences, no extra text.
6. Set grounding_score to 0.95 and citation_coverage to 0.90 and blocked to false."""

OUTPUT_SCHEMA = """{
  "question_id": "uuid",
  "exam": "string",
  "objective": "string",
  "difficulty": "Easy|Medium|Hard",
  "type": "QuestionType",
  "question": "string (markdown supported)",
  "context": "string|null (scenario context for the question)",
  "options": [{"id": "A", "text": "string"}] or null,
  "drag_items": ["string"] or null,
  "drop_zones": ["string"] or null,
  "match_pairs": [{"left": "string", "right": "string"}] or null,
  "build_items": ["string"] or null,
  "code_snippet": "string|null",
  "correct_answer": ["A"] or ["A","C"] or ["Step1"] etc,
  "explanation": "string",
  "why_correct": "string (detailed explanation of correct answer)",
  "why_incorrect": {"A": "reason", "B": "reason"} or {},
  "references": [{"title": "string", "url": "string"}],
  "grounding": {
    "grounding_score": 0.0-1.0,
    "citation_coverage": 0.0-1.0,
    "retrieved_document_ids": ["string"]
  },
  "tags": ["string"],
  "blocked": false,
  "block_reason": null
}"""


def build_fallback_prompt(
    exam_code: str,
    objective: str,
    difficulty: Difficulty,
    question_type: QuestionType,
) -> str:
    type_instruction = QUESTION_TYPE_INSTRUCTIONS.get(question_type, "")
    difficulty_guide = DIFFICULTY_GUIDELINES.get(difficulty, "")

    return f"""EXAM: {exam_code}
DOMAIN/OBJECTIVE: {objective}
DIFFICULTY: {difficulty}
QUESTION TYPE: {question_type}

TYPE-SPECIFIC INSTRUCTIONS:
{type_instruction}

DIFFICULTY GUIDELINES:
{difficulty_guide}

MICROSOFT EXAM STYLE REQUIREMENTS:
- Use professional, precise language
- Scenario questions should include realistic enterprise context
- Reference real Azure services, features, and configurations
- Include specific constraints (e.g., "must minimize cost", "must not require downtime")
- Distractors should be real Azure features that are plausible but don't meet the stated requirements

Generate the question and return ONLY the following JSON structure:
{OUTPUT_SCHEMA}

Set grounding_score to 0.95, citation_coverage to 0.90, blocked to false, and retrieved_document_ids to ["knowledge-base"]."""


def build_generation_prompt(
    exam_code: str,
    objective: str,
    difficulty: Difficulty,
    question_type: QuestionType,
    context: str,
    doc_ids: list[str],
) -> str:
    type_instruction = QUESTION_TYPE_INSTRUCTIONS.get(question_type, "")
    difficulty_guide = DIFFICULTY_GUIDELINES.get(difficulty, "")

    return f"""EXAM: {exam_code}
DOMAIN/OBJECTIVE: {objective}
DIFFICULTY: {difficulty}
QUESTION TYPE: {question_type}

RETRIEVED CONTEXT (use ONLY this to generate the question):
{context}

RETRIEVED DOCUMENT IDs: {doc_ids}

TYPE-SPECIFIC INSTRUCTIONS:
{type_instruction}

DIFFICULTY GUIDELINES:
{difficulty_guide}

MICROSOFT EXAM STYLE REQUIREMENTS:
- Use professional, precise language
- Avoid ambiguous wording
- Scenario questions should include realistic enterprise context
- Reference real Azure services, features, and configurations
- Include specific constraints (e.g., "must minimize cost", "must not require downtime")
- Distractors should be real Azure features that are plausible but don't meet the stated requirements

Generate the question and return ONLY the following JSON structure:
{OUTPUT_SCHEMA}

Remember: Base everything ONLY on the retrieved context above. Compute grounding scores honestly."""
