"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { examApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EXAM_BLUEPRINTS } from "@/types/exam";
import { getScoreColor, getScoreBg } from "@/lib/utils";
import { BarChart3, Target, Clock, TrendingUp, Activity, Award, Zap, Lock, LogIn, Loader2 } from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface ProgressData {
  examCode: string;
  totalAttempted: number;
  averageScore: number;
  bestScore: number;
  lastAttempt: string | null;
  domainProgress: { domain: string; correct: number; total: number; percentage: number }[];
  weakAreas: string[];
  strongAreas: string[];
  examReadiness: number;
}

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [progressMap, setProgressMap] = useState<Record<string, ProgressData>>({});
  const [loading, setLoading] = useState(true);
  const [progressError, setProgressError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchAll = async () => {
      setLoading(true);
      const results: Record<string, ProgressData> = {};
      const codes = Object.keys(EXAM_BLUEPRINTS);
      const responses = await Promise.allSettled(codes.map((code) =>
        examApi.getProgress(code).then((data) => ({ ...data, examCode: code }))
      ));
      const failedCodes: string[] = [];
      responses.forEach((response, index) => {
        if (response.status === "fulfilled") results[codes[index]] = response.value;
        else failedCodes.push(codes[index]);
      });
      setProgressMap(results);
      setProgressError(failedCodes.length
        ? `Progress could not be loaded for: ${failedCodes.join(", ")}. Please refresh to try again.`
        : null);
      setLoading(false);
    };
    fetchAll();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">Dashboard Requires Sign In</h2>
            <p className="text-sm text-muted-foreground">
              Your exam history, progress analytics, and domain scores are only available to signed-in users.
            </p>
          </div>
          <div className="space-y-2">
            <Button variant="azure" className="w-full gap-2" onClick={() => router.push("/login")}>
              <LogIn className="h-4 w-4" /> Sign In to View Dashboard
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/exams")}>
              Browse Exams as Guest
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const allProgress = Object.values(progressMap);
  const totalSessions = allProgress.reduce((s, p) => s + p.totalAttempted, 0);
  const attemptedProgress = allProgress.filter((p) => p.totalAttempted > 0);
  const bestScore = attemptedProgress.length ? Math.max(...attemptedProgress.map((p) => p.bestScore)) : 0;
  const avgScore = totalSessions
    ? Math.round(attemptedProgress.reduce((sum, p) => sum + p.averageScore * p.totalAttempted, 0) / totalSessions)
    : 0;

  const allDomains = allProgress.flatMap((p) =>
    p.domainProgress.map((d) => ({ ...d, exam: p.examCode }))
  );
  const allWeak = allProgress.flatMap((p) => p.weakAreas);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalSessions > 0 ? "Welcome back — keep up the practice!" : "Start your first practice session to see progress here."}
          </p>
        </div>
        <Link href="/exams">
          <Button variant="azure" className="gap-2">
            <Zap className="h-4 w-4" /> Start Practice
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {progressError && (
            <p role="alert" className="rounded-md border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
              {progressError}
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Activity className="h-5 w-5 text-blue-400" />} title="Total Sessions" value={String(totalSessions)} sub={totalSessions === 0 ? "No sessions yet" : `Across ${allProgress.filter((p) => p.totalAttempted > 0).length} exams`} />
            <StatCard icon={<Award className="h-5 w-5 text-yellow-400" />} title="Best Score" value={totalSessions > 0 ? String(bestScore) : "—"} sub={totalSessions > 0 ? (bestScore >= 700 ? "Passing!" : "Below passing (700)") : "Take an exam"} />
            <StatCard icon={<Target className="h-5 w-5 text-green-400" />} title="Avg Score" value={totalSessions > 0 ? String(avgScore) : "—"} sub={totalSessions > 0 ? (avgScore >= 700 ? "Above passing" : "Keep practicing") : "No data"} />
            <StatCard icon={<Clock className="h-5 w-5 text-purple-400" />} title="Exams Tried" value={String(allProgress.filter((p) => p.totalAttempted > 0).length)} sub={`of ${Object.keys(EXAM_BLUEPRINTS).length} available`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Average Scores by Exam
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allProgress.filter((p) => p.totalAttempted > 0).length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={allProgress.filter((p) => p.totalAttempted > 0).map((p) => ({ exam: p.examCode, score: p.averageScore }))}>
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0078d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0078d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="exam" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 1000]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [`${v}/1000`, "Avg Score"]}
                      />
                      <Area type="monotone" dataKey="score" stroke="#0078d4" strokeWidth={2} fill="url(#scoreGrad)" dot={{ fill: "#0078d4", r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
                    Complete your first exam to see score trends
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Exam Readiness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.values(EXAM_BLUEPRINTS).map((exam) => {
                  const prog = progressMap[exam.examCode];
                  const readiness = prog?.examReadiness ?? 0;
                  return (
                    <div key={exam.examCode}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{exam.examCode}</span>
                        <span className={readiness > 0 ? getScoreColor(readiness) : "text-muted-foreground"}>{readiness > 0 ? `${readiness}%` : "—"}</span>
                      </div>
                      <Progress value={readiness} className="h-2" />
                      <Link href={`/exams/${exam.examCode}`} className="text-xs text-primary hover:underline mt-1 block">Practice →</Link>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Domain Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allDomains.length > 0 ? (
                  allDomains.slice(0, 8).map((d) => (
                    <div key={`${d.exam}-${d.domain}`} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate flex-1 mr-2">{d.domain}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className="text-xs px-1">{d.exam}</Badge>
                          <span className={getScoreColor(d.percentage)}>{d.percentage}%</span>
                        </div>
                      </div>
                      <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${getScoreBg(d.percentage)}`} style={{ width: `${d.percentage}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No domain data yet — complete an exam to see performance</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                  <Target className="h-4 w-4" />
                  Weak Areas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {allWeak.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Focus Areas (below 60%)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allWeak.map((a) => (
                        <Badge key={a} variant="destructive" className="text-xs">{a}</Badge>
                      ))}
                    </div>
                  </div>
                ) : totalSessions > 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No weak areas — great job!</p>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Complete exams to identify areas for improvement</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, sub }: { icon: React.ReactNode; title: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted/50">{icon}</div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{title}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">{sub}</div>
      </CardContent>
    </Card>
  );
}
