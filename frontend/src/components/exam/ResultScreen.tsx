"use client";
import React from "react";
import { ExamScore, StudyProgress, EXAM_BLUEPRINTS } from "@/types/exam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn, formatTime, getScoreColor, getScoreBg } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, BarChart3, Target, BookOpen, RotateCcw, TrendingUp, AlertCircle } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface Props {
  score: ExamScore;
  examCode: string;
  progress?: StudyProgress;
  onRetry: () => void;
  onReview: () => void;
  onHome: () => void;
}

export function ResultScreen({ score, examCode, progress, onRetry, onReview, onHome }: Props) {
  const blueprint = EXAM_BLUEPRINTS[examCode];
  const passPercent = Math.round((score.score / 1000) * 100);
  const passed = score.passed;

  const radarData = score.domainScores.map((d) => ({
    domain: d.domain.length > 20 ? d.domain.substring(0, 20) + "…" : d.domain,
    score: d.percentage,
    fullMark: 100,
  }));

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className={cn(
        "rounded-2xl border p-8 text-center",
        passed ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
      )}>
        <div className={cn("text-7xl font-bold mb-2", passed ? "text-green-400" : "text-red-400")}>
          {score.score}
        </div>
        <div className="text-lg text-muted-foreground mb-4">out of 1000 points</div>
        <Badge
          variant={passed ? "success" : "destructive"}
          className="text-lg px-6 py-2"
        >
          {passed ? "✓ PASSED" : "✗ FAILED"}
        </Badge>
        <p className="text-sm text-muted-foreground mt-3">
          Passing score: {score.passingScore} · {blueprint?.examName || examCode}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<CheckCircle className="h-5 w-5 text-green-400" />} label="Correct" value={score.correct} color="text-green-400" total={score.totalQuestions} />
        <StatCard icon={<XCircle className="h-5 w-5 text-red-400" />} label="Incorrect" value={score.incorrect} color="text-red-400" total={score.totalQuestions} />
        <StatCard icon={<AlertCircle className="h-5 w-5 text-yellow-400" />} label="Skipped" value={score.skipped} color="text-yellow-400" total={score.totalQuestions} />
        <StatCard icon={<Clock className="h-5 w-5 text-blue-400" />} label="Time Spent" value={formatTime(score.timeSpent)} color="text-blue-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Domain Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {score.domainScores.map((d) => (
              <div key={d.domain} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground truncate flex-1 mr-2">{d.domain}</span>
                  <span className={cn("font-semibold shrink-0", getScoreColor(d.percentage))}>
                    {d.percentage}%
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", getScoreBg(d.percentage))}
                    style={{ width: `${d.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{d.correct}/{d.total} questions</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Skill Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Radar name="Score" dataKey="score" stroke="#0078d4" fill="#0078d4" fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {progress && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Exam Readiness & Skill Gap Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={cn("text-4xl font-bold", getScoreColor(progress.examReadiness))}>
                  {progress.examReadiness}%
                </div>
                <div className="text-xs text-muted-foreground">Exam Readiness</div>
              </div>
              <div className="flex-1">
                <Progress value={progress.examReadiness} className="h-3" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-green-400 mb-2">Strong Areas</p>
                {progress.strongAreas.map((area) => (
                  <Badge key={area} variant="success" className="mr-1 mb-1">{area}</Badge>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-red-400 mb-2">Weak Areas</p>
                {progress.weakAreas.map((area) => (
                  <Badge key={area} variant="destructive" className="mr-1 mb-1">{area}</Badge>
                ))}
              </div>
            </div>

            {progress.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Recommended Learning
                </p>
                <div className="space-y-2">
                  {progress.recommendations.slice(0, 4).map((rec, i) => (
                    <a key={i} href={rec.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded border border-border hover:border-primary/50 hover:bg-accent text-sm transition-colors"
                    >
                      <span className="text-foreground">{rec.title}</span>
                      <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "warning" : "secondary"} className="text-xs">
                        {rec.priority}
                      </Badge>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onHome}>← Dashboard</Button>
        <Button variant="outline" onClick={onReview}>Review Answers</Button>
        <Button variant="azure" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, total }: { icon: React.ReactNode; label: string; value: string | number; color: string; total?: number }) {
  return (
    <Card>
      <CardContent className="pt-4 text-center">
        <div className="flex justify-center mb-2">{icon}</div>
        <div className={cn("text-2xl font-bold", color)}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {total && <div className="text-xs text-muted-foreground">of {total}</div>}
      </CardContent>
    </Card>
  );
}
