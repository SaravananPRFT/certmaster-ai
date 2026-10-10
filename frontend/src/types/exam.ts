export type QuestionType =
  | "MultipleChoiceSingle"
  | "MultipleChoiceMultiple"
  | "DragAndDrop"
  | "CaseStudy"
  | "Hotspot"
  | "YesNo"
  | "MatchFollowing"
  | "BestAnswer"
  | "ScenarioArchitecture"
  | "BuildList";

export type Difficulty = "Easy" | "Medium" | "Hard";
export type ExamMode = "certification" | "practice" | "study";

export interface ExamBlueprint {
  examCode: string;
  examName: string;
  totalQuestions: number;
  passingScore: number;
  durationMinutes: number;
  domains: Domain[];
}

export interface Domain {
  id: string;
  name: string;
  weight: number;
  objectives: string[];
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface Reference {
  title: string;
  url: string;
}

export interface GroundingInfo {
  groundingScore: number;
  citationCoverage: number;
  retrievedDocumentIds: string[];
}

export interface Question {
  questionId: string;
  exam: string;
  objective: string;
  difficulty: Difficulty;
  type: QuestionType;
  question: string;
  context?: string;
  options?: QuestionOption[];
  dragItems?: string[];
  dropZones?: string[];
  matchPairs?: MatchPair[];
  buildItems?: string[];
  hotspotAreas?: HotspotArea[];
  imageUrl?: string;
  codeSnippet?: string;
  correctAnswer?: string[];
  explanation?: string;
  whyCorrect?: string;
  whyIncorrect?: Record<string, string>;
  references: Reference[];
  grounding: GroundingInfo;
  caseStudyId?: string;
  tags?: string[];
  createdAt?: string;
  qualityScore?: number;
}

export interface HotspotArea {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isCorrect: boolean;
}

export interface CaseStudy {
  id: string;
  title: string;
  companyBackground: string;
  existingEnvironment: string;
  businessRequirements: string;
  technicalRequirements: string;
  constraints: string;
  questions: Question[];
}

export interface ExamSession {
  sessionId: string;
  examCode: string;
  mode: ExamMode;
  startedAt: string;
  durationMinutes: number;
  questions: Question[];
  answers: Record<string, UserAnswer>;
  markedForReview: string[];
  currentQuestionIndex: number;
  submitted: boolean;
  score?: ExamScore;
}

export interface UserAnswer {
  questionId: string;
  selectedOptions: string[];
  timeSpent: number;
  flagged: boolean;
}

export interface ExamScore {
  totalQuestions: number;
  correct: number;
  incorrect: number;
  skipped: number;
  score: number;
  passed: boolean;
  passingScore: number;
  timeSpent: number;
  domainScores: DomainScore[];
}

export interface DomainScore {
  domain: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface QuestionGenerationRequest {
  examCode: string;
  objective?: string;
  difficulty?: Difficulty;
  questionType?: QuestionType;
  count?: number;
  caseStudy?: boolean;
}

export interface QuestionFeedback {
  questionId: string;
  issueType: "inaccurate" | "unclear" | "outdated" | "typo" | "other";
  comment: string;
  userId?: string;
}

export interface StudyProgress {
  userId: string;
  examCode: string;
  totalAttempted: number;
  averageScore: number;
  bestScore: number;
  lastAttempt: string | null;
  domainProgress: DomainScore[];
  weakAreas: string[];
  strongAreas: string[];
  examReadiness: number;
  recommendations: LearningRecommendation[];
}

export interface LearningRecommendation {
  title: string;
  url: string;
  domain: string;
  priority: "high" | "medium" | "low";
}

export { EXAM_BLUEPRINTS } from "@/lib/examConfig";
