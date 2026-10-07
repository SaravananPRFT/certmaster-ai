"""
Quality validation and scoring for generated questions.
"""
import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class QualityResult:
    score: float
    passed: bool
    issues: list[str]
    hallucination_risk: float


class QuestionValidator:
    MIN_QUALITY_SCORE = 0.70
    MIN_OPTIONS = 2
    MIN_EXPLANATION_LENGTH = 80
    MIN_QUESTION_LENGTH = 30

    def score_quality(self, question) -> QualityResult:
        """Compute a composite quality score for a generated question."""
        issues = []
        score = 1.0

        if len(question.question) < self.MIN_QUESTION_LENGTH:
            issues.append(f"Question too short ({len(question.question)} chars)")
            score -= 0.2

        if question.type in ("MultipleChoiceSingle", "MultipleChoiceMultiple", "BestAnswer"):
            if not question.options or len(question.options) < self.MIN_OPTIONS:
                issues.append("Insufficient answer options")
                score -= 0.3

        if not question.correct_answer:
            issues.append("No correct answer defined")
            score -= 0.4

        if len(question.explanation) < self.MIN_EXPLANATION_LENGTH:
            issues.append(f"Explanation too short ({len(question.explanation)} chars)")
            score -= 0.15

        if not question.why_correct:
            issues.append("Missing why_correct explanation")
            score -= 0.1

        if not question.references:
            issues.append("No references provided")
            score -= 0.1

        grounding = question.grounding.grounding_score
        if grounding < 0.80:
            issues.append(f"Low grounding score ({grounding:.2f})")
            score -= 0.15

        if question.type in ("MultipleChoiceSingle", "MultipleChoiceMultiple", "BestAnswer"):
            if question.options:
                for correct_id in question.correct_answer:
                    if not any(o.id == correct_id for o in question.options):
                        issues.append(f"Correct answer {correct_id} not in options")
                        score -= 0.3

        score = max(0.0, min(1.0, score))
        hallucination_risk = 1.0 - grounding

        return QualityResult(
            score=round(score, 3),
            passed=score >= self.MIN_QUALITY_SCORE,
            issues=issues,
            hallucination_risk=round(hallucination_risk, 3),
        )

    def check_duplicate(self, question, existing_questions: list) -> bool:
        """Simple token-overlap similarity check (cosine similarity via embeddings preferred in prod)."""
        q_tokens = set(question.question.lower().split())
        for existing in existing_questions:
            e_tokens = set(existing.question.lower().split())
            if not q_tokens or not e_tokens:
                continue
            intersection = len(q_tokens & e_tokens)
            union = len(q_tokens | e_tokens)
            similarity = intersection / union if union > 0 else 0
            if similarity > 0.70:
                logger.info("Duplicate detected: similarity %.2f", similarity)
                return True
        return False

    def validate_blueprint_alignment(self, question, exam_code: str) -> bool:
        """Check that the question's objective matches a valid domain for the exam."""
        from app.services.generation.generator import EXAM_BLUEPRINTS
        blueprint = EXAM_BLUEPRINTS.get(exam_code)
        if not blueprint:
            return True
        all_objectives = []
        for domain in blueprint.get("domains", []):
            all_objectives.append(domain["name"].lower())
            all_objectives.extend([o.lower() for o in domain.get("objectives", [])])
        obj_lower = question.objective.lower()
        return any(obj_lower in a or a in obj_lower for a in all_objectives)


validator = QuestionValidator()
