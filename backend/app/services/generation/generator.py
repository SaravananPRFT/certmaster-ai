"""
Question generation service — orchestrates RAG pipeline.
"""
import json
import logging
import asyncio
import random
import time
from collections import OrderedDict
from typing import Optional
from uuid import uuid4

from openai import AsyncAzureOpenAI, AsyncOpenAI
import anthropic

from app.core.config import settings
from app.models.question import (
    Question, QuestionGenerationRequest, QuestionOption, Reference,
    GroundingInfo, MatchPair, QuestionType, Difficulty,
)
from app.services.rag.retriever import retriever, RetrievedChunk
from app.services.generation.prompts import (
    SYSTEM_PROMPT, FALLBACK_SYSTEM_PROMPT,
    build_generation_prompt, build_fallback_prompt,
)
from app.services.validation.validator import validator

logger = logging.getLogger(__name__)

# Weighted distribution matching real Microsoft exam composition.
# Applied per-question when the caller doesn't specify a type.
QUESTION_TYPE_WEIGHTS: list[tuple] = [
    ("MultipleChoiceSingle",   35),
    ("MultipleChoiceMultiple", 20),
    ("BestAnswer",             15),
    ("YesNo",                  10),
    ("MatchFollowing",          8),
    ("DragAndDrop",             7),
    ("BuildList",               5),
]

EXAM_BLUEPRINTS = {
    "AI-102": {
        "name": "Designing and Implementing a Microsoft Azure AI Solution",
        "duration_minutes": 100,
        "passing_score": 700,
        "domains": [
            {"name": "Plan and Manage an Azure AI Solution", "weight": 15, "objectives": ["Select Azure AI services", "Manage Azure AI environment", "Implement responsible AI", "Monitor AI services"]},
            {"name": "Implement Content Moderation Solutions", "weight": 10, "objectives": ["Implement Azure AI Content Safety", "Detect content violations"]},
            {"name": "Implement Computer Vision Solutions", "weight": 15, "objectives": ["Analyze images", "Implement Azure AI Vision", "Implement Custom Vision", "Implement video analysis"]},
            {"name": "Implement Natural Language Processing Solutions", "weight": 30, "objectives": ["Analyze text", "Translate text", "Implement conversational language understanding", "Build question answering solutions", "Implement Azure AI Language"]},
            {"name": "Implement Knowledge Mining and Document Intelligence Solutions", "weight": 10, "objectives": ["Implement Azure AI Search solution", "Implement document intelligence solution"]},
            {"name": "Implement Generative AI Solutions", "weight": 20, "objectives": ["Use Azure OpenAI Service", "Implement RAG with Azure AI Search", "Use prompt engineering techniques", "Deploy and consume OpenAI models"]},
        ],
    },
    "AZ-104": {
        "name": "Microsoft Azure Administrator",
        "duration_minutes": 100,
        "passing_score": 700,
        "domains": [
            {"name": "Manage Azure Identities and Governance", "weight": 20, "objectives": ["Manage Microsoft Entra users and groups", "Manage subscriptions and governance", "Manage Azure RBAC"]},
            {"name": "Implement and Manage Storage", "weight": 15, "objectives": ["Configure storage accounts", "Configure Blob Storage", "Configure Azure Files", "Configure file and folder backups"]},
            {"name": "Deploy and Manage Azure Compute Resources", "weight": 20, "objectives": ["Automate deployment", "Create and configure VMs", "Create and configure containers", "Create and configure App Service"]},
            {"name": "Implement and Manage Virtual Networking", "weight": 25, "objectives": ["Configure virtual networks", "Configure network routing and endpoints", "Configure Azure DNS", "Configure network security groups"]},
            {"name": "Monitor and Maintain Azure Resources", "weight": 20, "objectives": ["Monitor resources with Azure Monitor", "Implement backup and recovery"]},
        ],
    },
    "AZ-305": {
        "name": "Designing Microsoft Azure Infrastructure Solutions",
        "duration_minutes": 120,
        "passing_score": 700,
        "domains": [
            {"name": "Design Identity, Governance, and Monitoring Solutions", "weight": 25, "objectives": ["Design identity and access solutions", "Design governance solutions", "Design monitoring solutions"]},
            {"name": "Design Data Storage Solutions", "weight": 25, "objectives": ["Design data storage solutions for relational data", "Design data storage solutions for semi-structured and unstructured data", "Design data integration solutions"]},
            {"name": "Design Business Continuity Solutions", "weight": 15, "objectives": ["Design solutions for backup and disaster recovery", "Design for high availability"]},
            {"name": "Design Infrastructure Solutions", "weight": 35, "objectives": ["Design compute solutions", "Design network solutions", "Design application architecture", "Design migrations"]},
        ],
    },
    "GH-300": {
        "name": "GitHub Advanced Security",
        "duration_minutes": 100,
        "passing_score": 700,
        "domains": [
            {"name": "Describe GitHub Advanced Security Features", "weight": 20, "objectives": ["Describe secret scanning", "Describe Dependabot", "Describe code scanning"]},
            {"name": "Configure and Use Secret Scanning", "weight": 20, "objectives": ["Enable secret scanning", "Configure custom patterns", "Manage alerts"]},
            {"name": "Configure and Use Dependabot", "weight": 20, "objectives": ["Configure Dependabot alerts", "Configure Dependabot security updates", "Configure Dependabot version updates"]},
            {"name": "Configure and Use Code Scanning", "weight": 20, "objectives": ["Configure code scanning with CodeQL", "Interpret code scanning results", "Manage code scanning alerts"]},
            {"name": "Use GitHub Advanced Security in GitHub Actions", "weight": 20, "objectives": ["Integrate GHAS in CI/CD", "Configure security policies", "Use security workflows"]},
        ],
    },
    "AB-100": {
        "name": "Agentic AI Business Solutions Architect",
        "duration_minutes": 120,
        "passing_score": 700,
        "domains": [
            {"name": "Plan AI-powered business solutions", "weight": 28, "objectives": ["Analyze requirements for AI-powered business solutions", "Design overall AI strategy for business solutions", "Evaluate the costs and benefits of an AI-powered business solution"]},
            {"name": "Design AI-powered business solutions", "weight": 28, "objectives": ["Design AI and agents for business solutions", "Design extensibility of AI solutions with Copilot Studio and Microsoft Foundry", "Orchestrate configuration for prebuilt agents and apps"]},
            {"name": "Deploy AI-powered business solutions", "weight": 44, "objectives": ["Analyze, monitor, and tune AI-powered business solutions", "Manage the testing of AI-powered business solutions", "Design the ALM process for AI-powered business solutions", "Design responsible AI, security, governance, risk management, and compliance"]},
        ],
    },
    "AI-103": {
        "name": "Developing AI Apps and Agents on Azure",
        "duration_minutes": 120,
        "passing_score": 700,
        "domains": [
            {"name": "Plan and manage an Azure AI solution", "weight": 28, "objectives": ["Choose the appropriate Foundry services for generative AI and agents", "Set up AI solutions in Foundry", "Manage, monitor, and secure AI systems", "Implement responsible AI across generative AI and agentic systems"]},
            {"name": "Implement generative AI and agentic solutions", "weight": 33, "objectives": ["Build generative applications by using Foundry", "Build agents by using Foundry", "Optimize and operationalize generative AI systems"]},
            {"name": "Implement computer vision solutions", "weight": 13, "objectives": ["Design and implement image- and video-generation solutions", "Design and implement multimodal understanding workflows", "Implement responsible AI for multimodal content"]},
            {"name": "Implement text analysis solutions", "weight": 13, "objectives": ["Apply language model text analysis", "Implement speech solutions"]},
            {"name": "Implement information extraction solutions", "weight": 13, "objectives": ["Build retrieval and grounding pipelines", "Extract content from documents using Content Understanding"]},
        ],
    },
    "AI-901": {
        "name": "Microsoft Azure AI Fundamentals",
        "duration_minutes": 65,
        "passing_score": 700,
        "domains": [
            {"name": "Identify AI concepts and capabilities", "weight": 43, "objectives": ["Identify features of common AI workloads", "Identify guiding principles for responsible AI", "Describe capabilities of computer vision workloads", "Describe capabilities of NLP workloads", "Describe capabilities of generative AI workloads"]},
            {"name": "Implement AI solutions by using Microsoft Foundry", "weight": 57, "objectives": ["Implement Azure AI services using Microsoft Foundry", "Deploy and consume AI models in Foundry", "Implement generative AI solutions in Foundry", "Implement NLP and vision solutions using Foundry Tools"]},
        ],
    },
}


def _parse_extra_headers(raw: str) -> dict[str, str]:
    """Parse 'key:value,key2:value2' or single 'key:value' into a dict."""
    headers: dict[str, str] = {}
    if not raw:
        return headers
    for part in raw.split(","):
        part = part.strip()
        if ":" in part:
            k, v = part.split(":", 1)
            headers[k.strip()] = v.strip()
    return headers


class QuestionGenerator:
    def __init__(self):
        self._openai_client: Optional[AsyncAzureOpenAI] = None
        self._portkey_client: Optional[AsyncOpenAI] = None
        self._anthropic_client: Optional[anthropic.AsyncAnthropic] = None
        self._embedding_cache: OrderedDict[str, tuple[float, list[float]]] = OrderedDict()
        self._embedding_tasks: dict[str, asyncio.Task[Optional[list[float]]]] = {}
        self._embedding_lock = asyncio.Lock()

    def _get_openai_client(self) -> AsyncAzureOpenAI:
        if not self._openai_client:
            self._openai_client = AsyncAzureOpenAI(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION,
            )
        return self._openai_client

    def _get_portkey_client(self) -> AsyncOpenAI:
        if not self._portkey_client:
            extra_headers = _parse_extra_headers(settings.EXTRA_HEADERS)
            self._portkey_client = AsyncOpenAI(
                base_url=settings.PORTKEY_BASE_URL,
                api_key=settings.PORTKEY_API_KEY,
                default_headers=extra_headers,
            )
        return self._portkey_client

    def _get_anthropic_client(self) -> anthropic.AsyncAnthropic:
        if not self._anthropic_client:
            self._anthropic_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._anthropic_client

    async def get_embedding(self, text: str) -> Optional[list[float]]:
        if not settings.AZURE_OPENAI_KEY or not settings.AZURE_OPENAI_ENDPOINT:
            return None
        cache_key = f"{settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}:{text}"
        now = time.monotonic()
        async with self._embedding_lock:
            cached = self._embedding_cache.get(cache_key)
            if cached and cached[0] > now:
                self._embedding_cache.move_to_end(cache_key)
                return cached[1]
            if cached:
                del self._embedding_cache[cache_key]

            task = self._embedding_tasks.get(cache_key)
            if task is None:
                task = asyncio.create_task(self._fetch_and_cache_embedding(cache_key, text))
                self._embedding_tasks[cache_key] = task
        return await asyncio.shield(task)

    async def _fetch_and_cache_embedding(
        self, cache_key: str, text: str
    ) -> Optional[list[float]]:
        try:
            client = self._get_openai_client()
            resp = await client.embeddings.create(
                model=settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
                input=text,
            )
            embedding = resp.data[0].embedding
        except Exception as e:
            logger.warning("Embedding generation failed: %s", e)
            embedding = None

        async with self._embedding_lock:
            self._embedding_tasks.pop(cache_key, None)
            if embedding:
                ttl = max(0, settings.CACHE_TTL_SECONDS)
                self._embedding_cache[cache_key] = (time.monotonic() + ttl, embedding)
                self._embedding_cache.move_to_end(cache_key)
                while len(self._embedding_cache) > 512:
                    self._embedding_cache.popitem(last=False)
        return embedding

    async def generate_with_openai(self, system: str, user: str) -> str:
        client = self._get_openai_client()
        resp = await client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.7,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content or "{}"

    async def generate_with_portkey(self, system: str, user: str) -> str:
        client = self._get_portkey_client()
        resp = await client.chat.completions.create(
            model=settings.CLAUDE_MODEL,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.7,
            max_tokens=4096,
        )
        return resp.choices[0].message.content or "{}"

    async def generate_with_anthropic(self, system: str, user: str) -> str:
        client = self._get_anthropic_client()
        resp = await client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=4096,
            system=system,
            messages=[{"role": "user", "content": user}],
            temperature=0.7,
        )
        return resp.content[0].text

    async def _llm_generate(self, system: str, user: str) -> str:
        """Try providers in priority order based on configuration."""
        if settings.PORTKEY_API_KEY and settings.PORTKEY_BASE_URL:
            try:
                return await self.generate_with_portkey(system, user)
            except Exception as e:
                logger.warning("Portkey generation failed: %s, trying next provider", e)

        try:
            if settings.AZURE_OPENAI_KEY and settings.AZURE_OPENAI_ENDPOINT:
                return await self.generate_with_openai(system, user)
        except Exception as e:
            logger.warning("OpenAI generation failed: %s, trying Anthropic", e)

        try:
            if settings.ANTHROPIC_API_KEY:
                return await self.generate_with_anthropic(system, user)
        except Exception as e:
            logger.warning("Anthropic generation failed: %s", e)

        return self._mock_response()

    def _mock_response(self) -> str:
        """Return a development mock when no LLM is configured."""
        return json.dumps({
            "question_id": str(uuid4()),
            "exam": "AI-102",
            "objective": "Implement Natural Language Processing Solutions",
            "difficulty": "Medium",
            "type": "MultipleChoiceSingle",
            "question": "You are developing a solution to analyze customer feedback and extract key phrases. Which Azure AI Language feature should you use?",
            "context": None,
            "options": [
                {"id": "A", "text": "Custom text classification"},
                {"id": "B", "text": "Key phrase extraction"},
                {"id": "C", "text": "Conversational Language Understanding"},
                {"id": "D", "text": "Named entity recognition"},
            ],
            "drag_items": None,
            "drop_zones": None,
            "match_pairs": None,
            "build_items": None,
            "code_snippet": None,
            "correct_answer": ["B"],
            "explanation": "Key phrase extraction identifies the main concepts in text without requiring training data.",
            "why_correct": "Key phrase extraction is a pre-built capability in Azure AI Language that identifies important phrases from text without any model training required.",
            "why_incorrect": {
                "A": "Custom text classification categorizes documents into user-defined categories and requires training data.",
                "C": "CLU is for building conversational AI applications that understand user intents.",
                "D": "NER identifies and categorizes named entities (people, places, organizations) in text.",
            },
            "references": [
                {"title": "Azure AI Language Key Phrase Extraction", "url": "https://learn.microsoft.com/azure/ai-services/language-service/key-phrase-extraction/overview"},
            ],
            "grounding": {
                "grounding_score": 0.92,
                "citation_coverage": 0.88,
                "retrieved_document_ids": ["fallback-001"],
            },
            "tags": ["NLP", "Language Service"],
            "blocked": False,
            "block_reason": None,
        })

    def _parse_question(self, raw: str, request: QuestionGenerationRequest, bypass_grounding: bool = False) -> Optional[Question]:
        try:
            # Strip markdown fences that some models add despite instructions.
            # split("```", 2) → ['', 'json\n{...}\n', ''] so index [1] is the content.
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                parts = cleaned.split("```", 2)
                cleaned = parts[1] if len(parts) >= 2 else cleaned
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
                cleaned = cleaned.strip()
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error("Failed to parse LLM response as JSON: %s\nRaw: %s", e, raw[:500])
            return None

        grounding = data.get("grounding", {})
        grounding_score = grounding.get("grounding_score", 0.0)
        citation_coverage = grounding.get("citation_coverage", 0.0)

        if not bypass_grounding:
            if data.get("blocked"):
                logger.warning("Question blocked by grounding validator: %s", data.get("block_reason"))
                return None
            if grounding_score < settings.MIN_GROUNDING_SCORE:
                logger.warning("Question blocked: grounding_score %.2f < %.2f", grounding_score, settings.MIN_GROUNDING_SCORE)
                return None
            if citation_coverage < settings.MIN_CITATION_COVERAGE:
                logger.warning("Question blocked: citation_coverage %.2f < %.2f", citation_coverage, settings.MIN_CITATION_COVERAGE)
                return None

        try:
            options = None
            if data.get("options"):
                options = [QuestionOption(**o) for o in data["options"]]

            match_pairs = None
            if data.get("match_pairs"):
                match_pairs = [MatchPair(**p) for p in data["match_pairs"]]

            references = [Reference(**r) for r in data.get("references", [])]

            grounding_info = GroundingInfo(
                grounding_score=grounding_score,
                citation_coverage=citation_coverage,
                retrieved_document_ids=grounding.get("retrieved_document_ids", []),
            )

            # LLM occasionally returns why_correct as a dict (like why_incorrect).
            # Coerce to a string so Pydantic validation doesn't drop the question.
            why_correct = data.get("why_correct", "")
            if isinstance(why_correct, dict):
                why_correct = " ".join(str(v) for v in why_correct.values())

            return Question(
                question_id=data.get("question_id", str(uuid4())),
                exam=data.get("exam", request.exam_code),
                objective=data.get("objective", request.objective or ""),
                difficulty=data.get("difficulty", request.difficulty or "Medium"),
                type=data.get("type", request.question_type or "MultipleChoiceSingle"),
                question=data.get("question", ""),
                context=data.get("context"),
                options=options,
                drag_items=data.get("drag_items"),
                drop_zones=data.get("drop_zones"),
                match_pairs=match_pairs,
                build_items=data.get("build_items"),
                code_snippet=data.get("code_snippet"),
                correct_answer=data.get("correct_answer", []),
                explanation=data.get("explanation", ""),
                why_correct=why_correct,
                why_incorrect=data.get("why_incorrect", {}),
                references=references,
                grounding=grounding_info,
                tags=data.get("tags", []),
            )
        except Exception as e:
            logger.error("Failed to construct Question model: %s", e)
            return None

    def _select_question_type(self, requested: Optional[str]) -> str:
        """Return requested type, or pick one from the weighted distribution."""
        if requested:
            return requested
        import random
        types, weights = zip(*QUESTION_TYPE_WEIGHTS)
        return random.choices(types, weights=weights, k=1)[0]

    def _select_objective(self, exam_code: str, requested_objective: Optional[str]) -> str:
        blueprint = EXAM_BLUEPRINTS.get(exam_code, {})
        domains = blueprint.get("domains", [])
        if requested_objective:
            for domain in domains:
                if requested_objective.casefold() == domain["name"].casefold():
                    objectives = domain.get("objectives", [])
                    return random.choice(objectives) if objectives else domain["name"]
            return requested_objective
        if not domains:
            return "General"
        weights = [d["weight"] for d in domains]
        total = sum(weights)
        r = random.uniform(0, total)
        cumulative = 0
        for domain in domains:
            cumulative += domain["weight"]
            if r <= cumulative:
                objectives = domain.get("objectives", [])
                return random.choice(objectives) if objectives else domain["name"]
        return domains[-1]["name"]

    async def generate_question(
        self,
        request: QuestionGenerationRequest,
        previously_generated: list[Question] | None = None,
    ) -> Optional[Question]:
        """Full RAG pipeline: retrieve → context → generate → validate."""
        objective = self._select_objective(request.exam_code, request.objective)
        difficulty = request.difficulty or random.choice(("Easy", "Medium", "Hard"))
        question_type = self._select_question_type(request.question_type)

        query = f"{request.exam_code} {objective} {difficulty} question"
        embedding = await self.get_embedding(query) if retriever.uses_azure_search else None

        chunks = await retriever.retrieve(
            query=query,
            exam_code=request.exam_code,
            objective=objective,
            top_k=settings.TOP_K_RETRIEVAL,
            embedding=embedding,
        )

        context, doc_ids = retriever.build_context(chunks, max_tokens=settings.MAX_CONTEXT_TOKENS)
        is_fallback = "fallback-001" in doc_ids

        prior_stems = [q.question[:80] for q in (previously_generated or [])]

        if is_fallback:
            logger.info("Using knowledge-based generation for %s / %s", request.exam_code, objective)
            prompt = build_fallback_prompt(
                exam_code=request.exam_code,
                objective=objective,
                difficulty=difficulty,
                question_type=question_type,
                already_generated=prior_stems or None,
            )
            raw = await self._llm_generate(FALLBACK_SYSTEM_PROMPT, prompt)
        else:
            prompt = build_generation_prompt(
                exam_code=request.exam_code,
                objective=objective,
                difficulty=difficulty,
                question_type=question_type,
                context=context,
                doc_ids=doc_ids,
                already_generated=prior_stems or None,
            )
            raw = await self._llm_generate(SYSTEM_PROMPT, prompt)

        question = self._parse_question(raw, request, bypass_grounding=is_fallback)

        if question:
            quality_result = validator.score_quality(question)
            question.quality_score = quality_result.score
            if not quality_result.passed:
                logger.warning("Question failed quality gate (%.2f): %s", quality_result.score, quality_result.issues)
                return None

        return question

    async def generate_batch(self, request: QuestionGenerationRequest) -> list[Question]:
        """Generate questions in parallel waves, feeding prior stems between waves."""
        questions: list[Question] = []
        remaining = request.count
        wave_size = 4

        while remaining > 0 and len(questions) < request.count:
            batch = min(wave_size, remaining)
            tasks = [
                self.generate_question(request, previously_generated=questions)
                for _ in range(batch)
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for r in results:
                if isinstance(r, Exception):
                    logger.error("Generation task failed: %s", r)
                    continue
                if r is None:
                    continue
                if validator.check_duplicate(r, questions):
                    logger.info("Duplicate detected, skipping")
                    continue
                questions.append(r)

            remaining -= batch

        return questions


generator = QuestionGenerator()
