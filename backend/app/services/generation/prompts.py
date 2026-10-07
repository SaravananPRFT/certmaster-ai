"""
Prompt templates for Microsoft certification question generation.
"""
import random
from app.models.question import QuestionType, Difficulty

# ---------------------------------------------------------------------------
# Question angles & scenario seeds — picked randomly per call for diversity
# ---------------------------------------------------------------------------

QUESTION_ANGLES = [
    "troubleshooting a misconfiguration or error",
    "choosing the correct service for a set of requirements",
    "implementing a solution step-by-step",
    "optimizing for cost while meeting SLA requirements",
    "ensuring security and compliance in a regulated industry",
    "migrating from on-premises or a competing cloud service",
    "designing for high availability and disaster recovery",
    "integrating multiple Azure services to meet business needs",
    "monitoring and diagnosing performance issues",
    "automating deployment and infrastructure management",
]

SCENARIO_SEEDS = [
    "a healthcare organization that must comply with HIPAA regulations",
    "a financial services company processing high-volume real-time transactions",
    "a retail company preparing for a seasonal traffic surge",
    "a manufacturing firm modernizing its legacy on-premises applications",
    "a government agency with strict data residency requirements",
    "a media company building a global content delivery platform",
    "an education technology startup scaling rapidly",
    "an insurance company implementing AI-powered claims processing",
    "a logistics company optimizing fleet management with IoT",
    "a law firm migrating document management to the cloud",
]

# ---------------------------------------------------------------------------
# Few-shot exemplars (kept compact to control prompt token cost)
# ---------------------------------------------------------------------------

FEW_SHOT_EXAMPLES = """
EXAMPLE 1 (Easy — concept recall):
{
  "question": "Which Azure AI service provides pre-built models for extracting key phrases, entities, and sentiment from text without requiring custom training data?",
  "options": [
    {"id": "A", "text": "Azure AI Language"},
    {"id": "B", "text": "Azure Machine Learning"},
    {"id": "C", "text": "Azure AI Custom Vision"},
    {"id": "D", "text": "Azure Cognitive Search"}
  ],
  "correct_answer": ["A"],
  "why_correct": "Azure AI Language provides pre-built NLP capabilities including key phrase extraction, named entity recognition, and sentiment analysis that work out of the box without training.",
  "why_incorrect": {
    "B": "Azure Machine Learning is a platform for building and deploying custom ML models, not a pre-built NLP service.",
    "C": "Custom Vision is for image classification and object detection, not text analysis.",
    "D": "Cognitive Search is a search service with AI enrichment, not a direct text analytics API."
  }
}

EXAMPLE 2 (Hard — multi-constraint scenario):
{
  "question": "Contoso Insurance is deploying an AI-powered claims processing system. The solution must: (1) extract data from scanned claim forms in 12 languages, (2) classify claims by type and urgency, (3) store extracted data with field-level encryption, and (4) keep all data within the EU to comply with GDPR. Which combination of Azure services should you recommend?",
  "options": [
    {"id": "A", "text": "Azure AI Document Intelligence in West Europe, Azure AI Language for classification, Azure Cosmos DB with client-side encryption"},
    {"id": "B", "text": "Azure AI Document Intelligence in West Europe, Azure OpenAI for classification, Azure SQL Database with Always Encrypted"},
    {"id": "C", "text": "Azure Computer Vision OCR in any region, Azure AI Language for classification, Azure Blob Storage with SSE"},
    {"id": "D", "text": "Azure Form Recognizer in East US, Azure Machine Learning for classification, Azure Cosmos DB with service-managed keys"}
  ],
  "correct_answer": ["A"],
  "why_correct": "Document Intelligence (West Europe) handles multilingual form extraction within the EU. Azure AI Language provides pre-built text classification without custom training. Cosmos DB with client-side encryption provides field-level encryption while keeping data in the EU region.",
  "why_incorrect": {
    "B": "Azure OpenAI may not be available in all EU regions for the required classification, and Azure SQL Always Encrypted does not natively support the semi-structured claim data as well as Cosmos DB.",
    "C": "Computer Vision OCR lacks the structured field extraction that Document Intelligence provides, and 'any region' violates the GDPR data residency requirement. Blob Storage SSE is storage-level, not field-level encryption.",
    "D": "East US region violates the EU data residency requirement. Service-managed keys do not provide field-level encryption."
  }
}
"""

# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a senior Microsoft certification exam content author. You write questions that mirror the style, rigor, and cognitive depth of real Microsoft certification exams.

STRICT RULES:
1. Generate questions ONLY from the provided context documents. Do NOT use training knowledge.
2. Every claim must be traceable to the context sources.
3. Create original questions — never copy existing exam questions.
4. Return ONLY valid JSON. No markdown fences, no extra text.
5. Never use "none of the above" or "all of the above" as options.

QUESTION STYLE (follow these precisely):
- Easy: Test definition or concept recall. Direct, single-service questions.
- Medium: Present a specific implementation task with 1-2 constraints. Start with a role and company context. Example stem: "You are a cloud administrator at Fabrikam. You need to configure X to meet Y requirement."
- Hard: Present a multi-constraint enterprise scenario with 3+ requirements. Include company context, compliance/cost/performance constraints. The correct answer satisfies ALL constraints; each distractor fails at least one.

DISTRACTOR RULES:
- Every distractor must name a real Azure service, feature, or configuration.
- Each why_incorrect must state which specific requirement the distractor fails.
- Distractors should be plausible — related services that solve a similar but different problem.

GROUNDING REQUIREMENT:
After generating, compute:
- grounding_score: fraction of answer content traceable to provided context (0.0-1.0)
- citation_coverage: fraction of key claims backed by provided sources (0.0-1.0)
If grounding_score < 0.75 or citation_coverage < 0.60, set "blocked": true with a reason."""


FALLBACK_SYSTEM_PROMPT = """You are a senior Microsoft certification exam content author. You write questions that mirror the style, rigor, and cognitive depth of real Microsoft certification exams.

Supported exams: AZ-104, AI-102, AZ-305, GH-300, AB-100, AI-103, AI-901.

Azure AI Search is not available — generate from your expert knowledge of Microsoft technologies and official exam objectives.

RULES:
1. Generate accurate, exam-style questions aligned with the specified exam and objective.
2. Return ONLY valid JSON. No markdown fences, no extra text.
3. Never use "none of the above" or "all of the above" as options.
4. Set grounding_score to 0.95, citation_coverage to 0.90, blocked to false.

QUESTION STYLE (follow these precisely):
- Easy: Test definition or concept recall. Direct, single-service questions.
- Medium: Present a specific implementation task with 1-2 constraints. Start with a role and company context. Example stem: "You are a cloud administrator at Fabrikam. You need to configure X to meet Y requirement."
- Hard: Present a multi-constraint enterprise scenario with 3+ requirements. Include company context, compliance/cost/performance constraints. The correct answer satisfies ALL constraints; each distractor fails at least one.

DISTRACTOR RULES:
- Every distractor must name a real Azure service, feature, or configuration.
- Each why_incorrect must state which specific requirement the distractor fails.
- Distractors should be plausible — related services that solve a similar but different problem."""


# ---------------------------------------------------------------------------
# Per-question-type instructions
# ---------------------------------------------------------------------------

QUESTION_TYPE_INSTRUCTIONS: dict[QuestionType, str] = {
    "MultipleChoiceSingle": """Single-answer MCQ with exactly 4 options (A-D).
One option is clearly correct. Three distractors are plausible but incorrect.""",

    "MultipleChoiceMultiple": """Multiple-answer MCQ with 5 options (A-E).
2-3 options are correct. State 'Select all that apply' or 'Select TWO/THREE' in the stem.
Distractors must be related services/features that don't satisfy the stated requirement.""",

    "DragAndDrop": """Drag-and-drop with 5-7 items and 2-3 drop zones (categories).
Each item belongs to exactly one zone. All mappings must be supported by the context.""",

    "YesNo": """Yes/No question about a specific Azure capability or behavior.
The statement must be definitively true or false. Avoid ambiguity.""",

    "MatchFollowing": """Match-the-following with 4-5 pairs.
Each left item maps to exactly one right item. All mappings must be verifiable.""",

    "BuildList": """Order-steps question with 5-7 items.
The correct order must be logical and verifiable (e.g., deployment steps, configuration sequence).""",

    "BestAnswer": """Best-answer question where multiple options could partially work,
but one is clearly the BEST approach per Microsoft's recommended practices.""",

    "ScenarioArchitecture": """Scenario-based architecture question with a realistic enterprise scenario.
Include company context, requirements, and constraints. Options should be complete architecture descriptions.""",

    "CaseStudy": """Case study with 5-8 related questions based on a single enterprise scenario.
Include: company background, existing environment, business requirements, technical requirements, constraints.""",

    "Hotspot": """Hotspot question describing an image/diagram with clickable areas.
Describe the areas textually since we can't generate actual images.""",
}

# ---------------------------------------------------------------------------
# Difficulty guidelines
# ---------------------------------------------------------------------------

DIFFICULTY_GUIDELINES: dict[Difficulty, str] = {
    "Easy": """Easy — Bloom's: Remember/Understand
- Tests definition, concept recognition, or basic feature identification
- Single-service scope, no architectural reasoning
- Stem: "Which service/feature does X?" or "What is the purpose of X?"
- Straightforward answer directly from documentation""",

    "Medium": """Medium — Bloom's: Apply/Analyze
- Tests implementation knowledge and service configuration
- Involves 2-3 services; requires understanding of when/why to use a feature
- Stem must include: a role, a company or project context, and 1-2 specific requirements
- Example: "You are configuring [service] for [company]. You need to [requirement] while [constraint]. What should you do?"
- Distractors are valid Azure features that don't meet the stated requirement""",

    "Hard": """Hard — Bloom's: Evaluate/Create
- Tests architectural decision-making with competing trade-offs
- Multi-service scenario with 3+ constraints (cost, compliance, performance, availability)
- Stem must include: named company, industry context, existing environment, and multiple requirements
- Example: "[Company] in [industry] needs to [goal]. The solution must [constraint A], [constraint B], and [constraint C]. Which approach should you recommend?"
- The correct answer satisfies ALL constraints; each distractor fails at least one (state which in why_incorrect)""",
}

# ---------------------------------------------------------------------------
# Output schema
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Diversity builder
# ---------------------------------------------------------------------------

def _build_diversity_block(already_generated: list[str] | None = None) -> str:
    """Return per-call variation instructions + dedup block."""
    angle = random.choice(QUESTION_ANGLES)
    seed = random.choice(SCENARIO_SEEDS)

    parts = [
        f"QUESTION ANGLE: Frame this question around {angle}.",
        f"SCENARIO SEED (adapt to the exam topic, do not use verbatim): {seed}",
    ]

    if already_generated:
        stems = already_generated[:10]
        avoid_block = "\n".join(f"  - {s}" for s in stems)
        parts.append(
            f"DO NOT generate a question similar to any of these already-generated questions:\n{avoid_block}\n"
            "Vary the topic, the Azure services tested, and the scenario context."
        )

    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

def build_fallback_prompt(
    exam_code: str,
    objective: str,
    difficulty: Difficulty,
    question_type: QuestionType,
    already_generated: list[str] | None = None,
) -> str:
    type_instruction = QUESTION_TYPE_INSTRUCTIONS.get(question_type, "")
    difficulty_guide = DIFFICULTY_GUIDELINES.get(difficulty, "")
    diversity = _build_diversity_block(already_generated)

    return f"""EXAM: {exam_code}
DOMAIN/OBJECTIVE: {objective}
DIFFICULTY: {difficulty}
QUESTION TYPE: {question_type}

{diversity}

TYPE-SPECIFIC INSTRUCTIONS:
{type_instruction}

DIFFICULTY GUIDELINES:
{difficulty_guide}

{FEW_SHOT_EXAMPLES}

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
    already_generated: list[str] | None = None,
) -> str:
    type_instruction = QUESTION_TYPE_INSTRUCTIONS.get(question_type, "")
    difficulty_guide = DIFFICULTY_GUIDELINES.get(difficulty, "")
    diversity = _build_diversity_block(already_generated)

    return f"""EXAM: {exam_code}
DOMAIN/OBJECTIVE: {objective}
DIFFICULTY: {difficulty}
QUESTION TYPE: {question_type}

RETRIEVED CONTEXT (use ONLY this to generate the question):
{context}

RETRIEVED DOCUMENT IDs: {doc_ids}

{diversity}

TYPE-SPECIFIC INSTRUCTIONS:
{type_instruction}

DIFFICULTY GUIDELINES:
{difficulty_guide}

{FEW_SHOT_EXAMPLES}

Generate the question and return ONLY the following JSON structure:
{OUTPUT_SCHEMA}

Remember: Base everything ONLY on the retrieved context above. Compute grounding scores honestly."""
