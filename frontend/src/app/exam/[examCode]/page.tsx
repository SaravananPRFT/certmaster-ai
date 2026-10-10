"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useExamStore } from "@/lib/store";
import { examApi } from "@/lib/api";
import { Question, UserAnswer, ExamMode } from "@/types/exam";
import { QuestionNavigator } from "@/components/exam/QuestionNavigator";
import { QuestionRenderer } from "@/components/exam/QuestionRenderer";
import { ExplanationPanel } from "@/components/exam/ExplanationPanel";
import { ExamTimer } from "@/components/exam/ExamTimer";
import { ResultScreen } from "@/components/exam/ResultScreen";
import { FeedbackModal } from "@/components/exam/FeedbackModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flag, ChevronLeft, ChevronRight, Send, Maximize2, Minimize2, Lightbulb, MessageSquare, Loader2, Eye, LogIn } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function ExamPlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const examCode = String(params.examCode);
  const mode = (searchParams.get("mode") || "practice") as ExamMode;
  const count = Number(searchParams.get("count") || 20);
  const difficultyParam = searchParams.get("difficulty") || undefined;
  const domainParam = searchParams.get("domain") || undefined;
  const questionTypeParam = searchParams.get("type") || undefined;
  const difficulty = difficultyParam === "Mixed" ? undefined : difficultyParam;
  const domain = domainParam && !["All", "All Domains"].includes(domainParam) ? domainParam : undefined;
  const questionType = questionTypeParam === "Mixed" ? undefined : questionTypeParam;

  const { isGuest } = useAuth();
  const { session, currentIndex, setSession, setCurrentIndex, setAnswer, toggleMarkForReview, isFullscreen, setFullscreen, showExplanation, setShowExplanation, clearSession } = useExamStore();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHintPanel, setShowHintPanel] = useState(false);
  const [submitConfirm, setSubmitConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const effectiveCount = Math.min(count, isGuest ? 5 : 100);
      try {
        const backendSession = await examApi.startSession(examCode, mode, effectiveCount, { difficulty, domain, questionType });
        setSession(backendSession);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[ExamPlayer] Failed to create exam session:", msg);
        clearSession();
        setLoadError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examCode, mode, count, difficulty, domain, questionType, isGuest, setSession, clearSession]);

  const handleNext = useCallback(() => {
    if (!session) return;
    if (currentIndex < session.questions.length - 1) setCurrentIndex(currentIndex + 1);
    setShowExplanation(false);
    setShowHintPanel(false);
  }, [session, currentIndex, setCurrentIndex, setShowExplanation, setShowHintPanel]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    setShowExplanation(false);
    setShowHintPanel(false);
  }, [currentIndex, setCurrentIndex, setShowExplanation, setShowHintPanel]);

  const handleToggleMark = useCallback(() => {
    if (!session) return;
    toggleMarkForReview(session.questions[currentIndex].questionId);
  }, [session, currentIndex, toggleMarkForReview]);

  const handleAnswer = useCallback((ans: UserAnswer) => {
    setAnswer(ans.questionId, ans);
    if (mode === "study") setShowExplanation(true);

    if (session?.sessionId) {
      examApi.saveAnswer(session.sessionId, ans.questionId, ans.selectedOptions)
        .catch(() => {});
    }
  }, [mode, session, setAnswer, setShowExplanation]);

  const handleSubmit = useCallback(async () => {
    if (!session) return;
    setSubmitConfirm(false);

    const answersMap: Record<string, string[]> = {};
    for (const [qid, ans] of Object.entries(session.answers)) {
      answersMap[qid] = ans.selectedOptions;
    }

    try {
      const result = await examApi.submitSession(session.sessionId, answersMap);
      const fullQuestions = result.questions ?? session.questions;
      setSession({ ...session, submitted: true, score: result, questions: fullQuestions });
    } catch {
      // Fallback: client-side scoring if backend is unavailable
    }
    setSubmitted(true);
  }, [session, setSession]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") handleNext();
      if (e.key === "ArrowLeft" || e.key === "PageUp") handlePrev();
      if (e.key === "m" || e.key === "M") handleToggleMark();
      if (e.key === "F11") { e.preventDefault(); setFullscreen(!isFullscreen); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleNext, handlePrev, handleToggleMark, isFullscreen, setFullscreen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <p className="font-semibold text-lg">Generating Questions</p>
            <p className="text-sm text-muted-foreground mt-1">Searching indexed exam content · Grounding with Microsoft docs...</p>
          </div>
          <div className="flex gap-2 justify-center flex-wrap text-xs text-muted-foreground">
            {["Analyzing blueprint", "Retrieving chunks", "Building context", "Generating", "Validating"].map((step) => (
              <Badge key={step} variant="outline">{step}</Badge>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-6">
        <div className="max-w-lg space-y-4 text-center">
          <h1 className="text-xl font-semibold">Could not start your exam</h1>
          <p className="text-sm text-muted-foreground">
            The backend did not create a session. Check that it is running and that question generation succeeded, then try again.
          </p>
          <p className="text-xs text-muted-foreground" role="status">{loadError}</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.push("/exams")}>Back to Exams</Button>
            <Button variant="azure" onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return <div className="p-8 text-center">Session not found. <Button variant="outline" onClick={() => router.push("/exams")}>Back</Button></div>;

  const currentQuestion = session.questions[currentIndex];
  const currentAnswer = session.answers[currentQuestion?.questionId];
  const markedForReviewArr = session.markedForReview ?? [];
  const markedForReview = new Set<string>(markedForReviewArr);

  if (submitted) {
    const serverScore = session.score;
    let scoreData;

    if (serverScore) {
      scoreData = serverScore;
    } else {
      const answers = session.answers;
      const correct = session.questions.filter((q) => {
        const ans = answers[q.questionId];
        const ca = q.correctAnswer ?? [];
        if (!ans || ans.selectedOptions.length === 0 || ca.length === 0) return false;
        return ca.every((a) => ans.selectedOptions.includes(a)) &&
          ans.selectedOptions.every((a) => ca.includes(a));
      }).length;
      const skipped = session.questions.filter((q) => !answers[q.questionId]?.selectedOptions?.length).length;
      const incorrect = session.questions.length - correct - skipped;
      const score = Math.round((correct / session.questions.length) * 1000);
      scoreData = { totalQuestions: session.questions.length, correct, incorrect, skipped, score, passed: score >= 700, passingScore: 700, timeSpent: 0, domainScores: buildDomainScores(session.questions, session.answers) };
    }

    return (
      <div className="flex flex-col min-h-[calc(100vh-56px)]">
        {isGuest && (
          <div className="border-b border-[#0078d4]/20 bg-[#0078d4]/5 px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
            <span className="text-sm text-muted-foreground">
              You&apos;ve used your <strong className="text-foreground">5 free questions</strong>. Sign in for unlimited practice.
            </span>
            <Link href="/login">
              <Button variant="azure" size="sm" className="flex-shrink-0 gap-1.5 text-xs whitespace-nowrap">
                <LogIn className="h-3.5 w-3.5" /> Sign In Free
              </Button>
            </Link>
          </div>
        )}
        <ResultScreen
          score={scoreData}
          examCode={examCode}
          onRetry={() => { clearSession(); setSubmitted(false); router.refresh(); }}
          onReview={() => setSubmitted(false)}
          onHome={() => router.push("/dashboard")}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-[calc(100vh-56px)]")}>
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-bold text-sm text-[#0078d4] shrink-0">{examCode}</span>
          <Badge variant={mode === "study" ? "success" : mode === "practice" ? "warning" : "info"} className="shrink-0">
            {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
          </Badge>
          {isGuest && (
            <Badge variant="warning" className="shrink-0 text-xs gap-1">
              Guest · 5Q limit
            </Badge>
          )}
          <span className="text-xs text-muted-foreground hidden md:block truncate">
            Q{currentIndex + 1} of {session.questions.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {mode !== "study" && <ExamTimer mode={mode} onTimeUp={() => setSubmitted(true)} />}
          <Button variant="ghost" size="icon" onClick={() => setFullscreen(!isFullscreen)} className="shrink-0">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <QuestionNavigator
          questions={session.questions}
          currentIndex={currentIndex}
          answers={session.answers}
          markedForReview={markedForReview}
          onNavigate={(i) => { setCurrentIndex(i); setShowExplanation(false); }}
        />

        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto p-6">
            {currentQuestion && (
              <>
                <QuestionRenderer
                  question={currentQuestion}
                  answer={currentAnswer}
                  onAnswer={handleAnswer}
                  showResult={mode === "study" && showExplanation}
                  mode={mode === "study" ? "study" : mode === "practice" ? "practice" : "exam"}
                />

                {mode === "practice" && showHintPanel && currentQuestion.explanation && (
                  <div className="mt-4 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                    <div className="flex items-center gap-2 mb-2 text-yellow-400 text-sm font-medium">
                      <Lightbulb className="h-4 w-4" />
                      Hint
                    </div>
                    <p className="text-sm text-muted-foreground">{currentQuestion.explanation.substring(0, 150)}...</p>
                  </div>
                )}

                {(mode === "study" && showExplanation) && (
                  <ExplanationPanel question={currentQuestion} selectedAnswer={currentAnswer?.selectedOptions ?? []} />
                )}

                {mode === "practice" && currentAnswer?.selectedOptions?.length && showExplanation && (
                  <ExplanationPanel question={currentQuestion} selectedAnswer={currentAnswer.selectedOptions} />
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      <footer className="flex items-center justify-between px-4 py-2 border-t border-border bg-card shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentIndex === 0}>
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleMark}
            className={markedForReview.has(currentQuestion?.questionId) ? "border-yellow-500/50 text-yellow-400" : ""}
          >
            <Flag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">
              {markedForReview.has(currentQuestion?.questionId) ? "Marked" : "Mark"}
            </span>
          </Button>

          {mode === "practice" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowHintPanel(!showHintPanel)}>
                <Lightbulb className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Hint</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowExplanation(!showExplanation)} disabled={!currentAnswer?.selectedOptions?.length}>
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Explain</span>
              </Button>
            </>
          )}

          <Button variant="outline" size="sm" onClick={() => setShowFeedback(true)}>
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Feedback</span>
          </Button>

          {currentIndex === session.questions.length - 1 ? (
            <Button variant="azure" size="sm" onClick={() => setSubmitConfirm(true)}>
              <Send className="h-3.5 w-3.5" />
              <span className="text-xs">Submit</span>
            </Button>
          ) : null}
        </div>

        <Button variant="outline" size="sm" onClick={handleNext} disabled={currentIndex === session.questions.length - 1}>
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </footer>

      {submitConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full text-center space-y-4">
            <h3 className="font-bold text-lg">Submit Exam?</h3>
            <p className="text-sm text-muted-foreground">
              You have answered {Object.values(session.answers).filter((a) => a.selectedOptions.length).length} of {session.questions.length} questions.
              {markedForReview.size > 0 && ` (${markedForReview.size} marked for review)`}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSubmitConfirm(false)}>Review</Button>
              <Button variant="azure" className="flex-1" onClick={handleSubmit}>Submit</Button>
            </div>
          </div>
        </div>
      )}

      {showFeedback && currentQuestion && (
        <FeedbackModal question={currentQuestion} onClose={() => setShowFeedback(false)} />
      )}
    </div>
  );
}

function buildDomainScores(questions: Question[], answers: Record<string, UserAnswer>) {
  const map: Record<string, { correct: number; total: number }> = {};
  for (const q of questions) {
    if (!map[q.objective]) map[q.objective] = { correct: 0, total: 0 };
    map[q.objective].total++;
    const ans = answers[q.questionId];
    const ca = q.correctAnswer ?? [];
    if (ans?.selectedOptions?.length && ca.length > 0 &&
      ca.every((a) => ans.selectedOptions.includes(a)) &&
      ans.selectedOptions.every((a) => ca.includes(a))) {
      map[q.objective].correct++;
    }
  }
  return Object.entries(map).map(([domain, { correct, total }]) => ({
    domain,
    correct,
    total,
    percentage: Math.round((correct / total) * 100),
  }));
}
