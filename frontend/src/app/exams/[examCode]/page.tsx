"use client";
import React, { useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { EXAM_BLUEPRINTS, ExamMode, Difficulty, QuestionType } from "@/types/exam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Clock, Target, BookOpen, Zap, Play, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: "MultipleChoiceSingle", label: "Multiple Choice (Single)" },
  { value: "MultipleChoiceMultiple", label: "Multiple Choice (Multi)" },
  { value: "DragAndDrop", label: "Drag & Drop" },
  { value: "CaseStudy", label: "Case Study" },
  { value: "YesNo", label: "Yes / No" },
  { value: "MatchFollowing", label: "Match the Following" },
  { value: "BuildList", label: "Build List / Order Steps" },
  { value: "ScenarioArchitecture", label: "Scenario / Architecture" },
  { value: "BestAnswer", label: "Best Answer" },
  { value: "Hotspot", label: "Hotspot" },
];

export default function ExamDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const examCode = String(params.examCode);
  const initialMode = (searchParams.get("mode") || "practice") as ExamMode;

  const blueprint = EXAM_BLUEPRINTS[examCode];
  const [mode, setMode] = useState<ExamMode>(initialMode);
  const [questionCount, setQuestionCount] = useState(20);
  const [difficulty, setDifficulty] = useState<Difficulty | "Mixed">("Mixed");
  const [selectedDomain, setSelectedDomain] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<QuestionType | "Mixed">("Mixed");
  const { isGuest } = useAuth();

  if (!blueprint) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Exam Not Found</h1>
        <Link href="/exams"><Button variant="outline">← Back to Exams</Button></Link>
      </div>
    );
  }

  const handleStart = () => {
    const effectiveCount = isGuest ? 5 : questionCount;
    const params = new URLSearchParams({
      mode,
      count: String(effectiveCount),
      difficulty,
      domain: selectedDomain,
      type: selectedType,
    });
    router.push(`/exam/${examCode}?${params.toString()}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/exams" className="text-sm text-muted-foreground hover:text-foreground">← Back to Exams</Link>
        <div className="flex items-center gap-3 mt-3">
          <Badge variant="info" className="text-base px-3">{blueprint.examCode}</Badge>
          <h1 className="text-2xl font-bold">{blueprint.examName}</h1>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{blueprint.durationMinutes} min</span>
          <span className="flex items-center gap-1"><Target className="h-3 w-3" />{blueprint.totalQuestions} questions</span>
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />Pass: {blueprint.passingScore}/1000</span>
        </div>
      </div>

      {isGuest && (
        <div className="mb-6 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
            <span className="text-muted-foreground">
              <strong className="text-foreground">Guest mode:</strong> Limited to <strong className="text-foreground">5 practice questions</strong> per session.
            </span>
          </div>
          <Link href="/login">
            <Button variant="outline" size="sm" className="flex-shrink-0 text-xs whitespace-nowrap">Sign In for More</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Exam Mode</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              {(["study", "practice", "certification"] as ExamMode[]).map((m) => (
                <ModeCard
                  key={m}
                  mode={m}
                  selected={mode === m}
                  onSelect={() => setMode(m)}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Session Configuration</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Number of Questions</label>
                {isGuest ? (
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/30">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm flex-1">5 questions</span>
                    <span className="text-xs text-muted-foreground">Guest limit</span>
                  </div>
                ) : (
                  <Select value={String(questionCount)} onValueChange={(v) => setQuestionCount(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 20, 30, 40, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Difficulty</label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty | "Mixed")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Domain</label>
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Domains</SelectItem>
                    {blueprint.domains.map((d) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Question Type</label>
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as QuestionType | "Mixed")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mixed">Mixed Types</SelectItem>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{isGuest ? 5 : questionCount}</div>
                <div className="text-xs text-muted-foreground">Questions</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-background border border-border">
                  <div className="font-semibold">{mode === "certification" ? blueprint.durationMinutes : "∞"}</div>
                  <div className="text-muted-foreground">Minutes</div>
                </div>
                <div className="p-2 rounded bg-background border border-border">
                  <div className="font-semibold">{difficulty}</div>
                  <div className="text-muted-foreground">Difficulty</div>
                </div>
              </div>
              <Button variant="azure" className="w-full gap-2" size="lg" onClick={handleStart}>
                <Play className="h-4 w-4" /> Start {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Domain Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {blueprint.domains.map((d) => (
                <div key={d.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground truncate">{d.name}</span>
                    <span className="text-foreground font-medium">{d.weight}%</span>
                  </div>
                  <Progress value={d.weight} className="h-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ModeCard({ mode, selected, onSelect }: { mode: ExamMode; selected: boolean; onSelect: () => void }) {
  const config = {
    study: { icon: <BookOpen className="h-5 w-5" />, label: "Study", desc: "Instant explanations", color: "text-green-400" },
    practice: { icon: <Zap className="h-5 w-5" />, label: "Practice", desc: "Optional timer, hints", color: "text-yellow-400" },
    certification: { icon: <Target className="h-5 w-5" />, label: "Exam Sim", desc: "Full exam experience", color: "text-[#0078d4]" },
  };
  const c = config[mode];
  return (
    <button
      onClick={onSelect}
      className={`p-4 rounded-lg border text-left transition-all ${selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
    >
      <div className={`mb-2 ${c.color}`}>{c.icon}</div>
      <div className="font-medium text-sm">{c.label}</div>
      <div className="text-xs text-muted-foreground">{c.desc}</div>
    </button>
  );
}
