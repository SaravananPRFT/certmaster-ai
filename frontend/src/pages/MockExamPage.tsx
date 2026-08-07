import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { practiceApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Timer, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamOption { id: string; option_text: string; display_order: number; }
interface ExamQ { question_id: string; question_text: string; options: ExamOption[]; }
interface ExamData { id: string; duration_minutes: number; questions: ExamQ[]; }
interface ResultItem { question_id: string; question_text: string; is_correct: boolean; explanation: string; }
interface ExamResult { total_questions: number; correct_answers: number; score_percentage: number; passed: boolean; results: ResultItem[]; }

export default function MockExamPage() {
  const [searchParams] = useSearchParams();
  const certId = searchParams.get("certId") || "";
  const [exam, setExam] = useState<ExamData | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);

  const startMutation = useMutation({
    mutationFn: () => practiceApi.startMockExam({ certification_id: certId, duration_minutes: 60, question_count: 20 }),
    onSuccess: (res) => { setExam(res.data); setTimeLeft(res.data.duration_minutes * 60); },
  });

  const submitMutation = useMutation({
    mutationFn: (ans: { question_id: string; selected_option_id?: string; time_taken_seconds: number }[]) =>
      practiceApi.submitMockExam({ mock_exam_id: exam!.id, answers: ans }),
    onSuccess: (res) => setResult(res.data),
  });

  useEffect(() => {
    if (!exam || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((v) => {
        if (v <= 1) { clearInterval(t); doSubmit(); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam]);

  const doSubmit = () => {
    if (!exam) return;
    submitMutation.mutate(
      exam.questions.map((q) => ({
        question_id: q.question_id,
        selected_option_id: answers.get(q.question_id),
        time_taken_seconds: 30,
      }))
    );
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (result) return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className={cn("border-2 text-center", result.passed ? "border-green-500" : "border-destructive")}>
        <CardContent className="p-8">
          <div className={cn("text-6xl font-bold mb-3", result.passed ? "text-green-500" : "text-destructive")}>
            {result.score_percentage}%
          </div>
          <h2 className={cn("text-2xl font-bold mb-2", result.passed ? "text-green-600" : "text-destructive")}>
            {result.passed ? "Passed!" : "Not Passed"}
          </h2>
          <p className="text-muted-foreground">{result.correct_answers} / {result.total_questions} correct · 70% required to pass</p>
        </CardContent>
      </Card>
      <h3 className="font-semibold text-lg">Answer Review</h3>
      {result.results?.map((r, i) => (
        <Card key={r.question_id} className={cn("border-l-4", r.is_correct ? "border-l-green-500" : "border-l-destructive")}>
          <CardContent className="p-4">
            <div className="flex gap-2 mb-2">
              {r.is_correct
                ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                : <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
              <p className="text-sm font-medium">{i + 1}. {r.question_text}</p>
            </div>
            <p className="text-xs text-muted-foreground ml-6">{r.explanation}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!exam) return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader><CardTitle>Mock Exam</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• 20 randomly selected questions</li>
            <li>• 60 minute time limit</li>
            <li>• 70% required to pass</li>
          </ul>
          <Button className="w-full" onClick={() => startMutation.mutate()} disabled={startMutation.isPending || !certId}>
            {startMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...</> : "Start Exam"}
          </Button>
          {!certId && <p className="text-sm text-muted-foreground text-center">Go to Certifications to pick one first.</p>}
          {startMutation.isError && <p className="text-sm text-destructive text-center">Failed to start. Make sure questions exist.</p>}
        </CardContent>
      </Card>
    </div>
  );

  const current = exam.questions[idx];
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Question {idx + 1} / {exam.questions.length}</span>
        <span className={cn("flex items-center gap-1.5 font-mono font-bold", timeLeft < 300 && "text-destructive")}>
          <Timer className="h-4 w-4" />{fmt(timeLeft)}
        </span>
      </div>
      <Progress value={(idx + 1) / exam.questions.length * 100} />
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="font-medium leading-relaxed">{current.question_text}</p>
          <div className="space-y-2">
            {current.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setAnswers((a) => new Map(a).set(current.question_id, opt.id))}
                className={cn(
                  "w-full text-left p-3 rounded-lg border text-sm transition-colors",
                  answers.get(current.question_id) === opt.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent border-input"
                )}
              >
                {opt.option_text}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={() => setIdx((i) => i - 1)} disabled={idx === 0}>Previous</Button>
            <span className="text-xs text-muted-foreground">{answers.size}/{exam.questions.length} answered</span>
            {idx < exam.questions.length - 1
              ? <Button size="sm" onClick={() => setIdx((i) => i + 1)}>Next</Button>
              : <Button size="sm" onClick={doSubmit} disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
                </Button>
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
