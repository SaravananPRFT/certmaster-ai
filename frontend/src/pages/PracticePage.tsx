import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { questionsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Bookmark, BookmarkCheck, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option { id: string; option_text: string; is_correct: boolean; display_order: number; }
interface Question { id: string; question_text: string; options: Option[]; explanation: string; difficulty: string; skill_area: string; }

export default function PracticePage() {
  const [searchParams] = useSearchParams();
  const certId = searchParams.get("certId") || "";
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ["practice", certId],
    queryFn: () => questionsApi.getQuestions({ certification_id: certId, page_size: 20 }).then((r) => r.data),
    enabled: !!certId,
  });

  const bookmarkMutation = useMutation({ mutationFn: (id: string) => questionsApi.bookmark(id) });

  const questions: Question[] = data?.items || [];
  const current = questions[idx];

  if (!certId) return (
    <div className="max-w-lg mx-auto">
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Select a certification from the <a href="/certifications" className="text-primary hover:underline">Certifications page</a>.</p>
      </Card>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!questions.length) return (
    <Card className="p-8 text-center max-w-lg mx-auto">
      <p className="text-muted-foreground">No questions available. Use the AI Assistant to generate some.</p>
    </Card>
  );

  const handleAnswer = (optId: string) => {
    if (selected) return;
    setSelected(optId);
    const ok = current?.options.find((o) => o.id === optId)?.is_correct || false;
    setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
  };

  const handleNext = () => {
    if (idx < questions.length - 1) { setIdx((i) => i + 1); setSelected(null); }
  };

  const toggleBm = (id: string) => {
    if (bookmarked.has(id)) {
      setBookmarked((b) => { const n = new Set(b); n.delete(id); return n; });
    } else {
      bookmarkMutation.mutate(id);
      setBookmarked((b) => new Set(b).add(id));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Practice Mode</h1>
        <span className="text-sm text-muted-foreground">
          {score.correct}/{score.total} correct ({score.total ? Math.round(score.correct / score.total * 100) : 0}%)
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {idx + 1} of {questions.length}</span>
          <span>{Math.round((idx + 1) / questions.length * 100)}%</span>
        </div>
        <Progress value={(idx + 1) / questions.length * 100} />
      </div>
      {current && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{current.difficulty}</Badge>
                <Badge variant="secondary" className="max-w-[200px] truncate">{current.skill_area}</Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={() => toggleBm(current.id)}>
                {bookmarked.has(current.id) ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              </Button>
            </div>
            <CardTitle className="text-base font-medium mt-2 leading-relaxed">{current.question_text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {current.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleAnswer(opt.id)}
                disabled={!!selected}
                className={cn(
                  "w-full text-left p-4 rounded-lg border transition-colors flex items-center justify-between gap-3 text-sm",
                  !selected && "hover:bg-accent cursor-pointer bg-card",
                  selected && opt.is_correct && "bg-green-50 border-green-400 dark:bg-green-900/20",
                  selected && selected === opt.id && !opt.is_correct && "bg-red-50 border-red-400 dark:bg-red-900/20",
                  selected && !opt.is_correct && selected !== opt.id && "opacity-60"
                )}
              >
                <span>{opt.option_text}</span>
                {selected && opt.is_correct && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                {selected && selected === opt.id && !opt.is_correct && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
              </button>
            ))}
            {selected && (
              <div className="p-4 bg-muted rounded-lg border-l-4 border-primary mt-2">
                <p className="text-sm font-medium mb-1">Explanation</p>
                <p className="text-sm text-muted-foreground">{current.explanation}</p>
              </div>
            )}
            {selected && idx < questions.length - 1 && (
              <Button onClick={handleNext} className="w-full mt-2">
                Next Question <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {selected && idx === questions.length - 1 && (
              <div className="text-center p-4 bg-primary/5 rounded-lg mt-2">
                <p className="font-semibold">Session Complete!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Score: {score.correct}/{score.total} ({Math.round(score.correct / score.total * 100)}%)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
