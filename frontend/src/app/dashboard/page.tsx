"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EXAM_BLUEPRINTS } from "@/types/exam";
import { getScoreColor, getScoreBg } from "@/lib/utils";
import { BarChart3, Target, Clock, BookOpen, TrendingUp, ArrowRight, Activity, Award, Zap, Lock, LogIn } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const MOCK_HISTORY = [
  { date: "Aug 5", score: 620, exam: "AI-102" },
  { date: "Aug 6", score: 660, exam: "AI-102" },
  { date: "Aug 7", score: 690, exam: "AI-102" },
  { date: "Aug 8", score: 700, exam: "AI-102" },
  { date: "Aug 9", score: 720, exam: "AZ-104" },
  { date: "Aug 10", score: 740, exam: "AZ-104" },
  { date: "Aug 12", score: 760, exam: "AI-102" },
];

const MOCK_DOMAINS = [
  { name: "Implement NLP Solutions", score: 75, total: 12, exam: "AI-102" },
  { name: "Implement GenAI Solutions", score: 65, total: 8, exam: "AI-102" },
  { name: "Computer Vision", score: 82, total: 10, exam: "AI-102" },
  { name: "Knowledge Mining", score: 70, total: 6, exam: "AI-102" },
  { name: "Manage Azure Identities", score: 80, total: 10, exam: "AZ-104" },
  { name: "Virtual Networking", score: 55, total: 15, exam: "AZ-104" },
];

const WEAK_AREAS = ["RAG Architecture", "Prompt Engineering", "Virtual Network Peering", "Azure AI Search Indexers"];
const RECOMMENDATIONS = [
  { title: "Implement Retrieval Augmented Generation", url: "#", priority: "high" as const, exam: "AI-102" },
  { title: "Prompt Engineering Techniques with Azure OpenAI", url: "#", priority: "high" as const, exam: "AI-102" },
  { title: "Configure Azure Virtual Networks", url: "#", priority: "medium" as const, exam: "AZ-104" },
  { title: "Azure AI Search - Skillsets and Knowledge Store", url: "#", priority: "medium" as const, exam: "AI-102" },
];

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back — keep up the practice!</p>
        </div>
        <Link href="/exams">
          <Button variant="azure" className="gap-2">
            <Zap className="h-4 w-4" /> Start Practice
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Activity className="h-5 w-5 text-blue-400" />} title="Total Sessions" value="14" sub="+3 this week" />
        <StatCard icon={<Award className="h-5 w-5 text-yellow-400" />} title="Best Score" value="760" sub="AI-102 · Aug 12" />
        <StatCard icon={<Target className="h-5 w-5 text-green-400" />} title="Avg Score" value="695" sub="Trending up ↑" />
        <StatCard icon={<Clock className="h-5 w-5 text-purple-400" />} title="Study Hours" value="18h" sub="Last 7 days" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Score Trend (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={MOCK_HISTORY}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0078d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0078d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[500, 1000]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}/1000`, "Score"]}
                />
                <Line type="monotone" dataKey="score" stroke="#0078d4" strokeWidth={2} dot={{ fill: "#0078d4", r: 4 }} />
                <Area type="monotone" dataKey="score" stroke="transparent" fill="url(#scoreGrad)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-0.5 bg-red-400 rounded" />
              <span>Pass threshold (700)</span>
            </div>
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
              const readiness = exam.examCode === "AI-102" ? 76 : exam.examCode === "AZ-104" ? 68 : 45;
              return (
                <div key={exam.examCode}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{exam.examCode}</span>
                    <span className={getScoreColor(readiness)}>{readiness}%</span>
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
            {MOCK_DOMAINS.map((d) => (
              <div key={d.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate flex-1 mr-2">{d.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-xs px-1">{d.exam}</Badge>
                    <span className={getScoreColor(d.score)}>{d.score}%</span>
                  </div>
                </div>
                <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full ${getScoreBg(d.score)}`} style={{ width: `${d.score}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-red-400">
              <Target className="h-4 w-4" />
              Weak Areas & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Focus Areas</p>
              <div className="flex flex-wrap gap-1.5">
                {WEAK_AREAS.map((a) => (
                  <Badge key={a} variant="destructive" className="text-xs">{a}</Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Recommended Learning</p>
              {RECOMMENDATIONS.map((r, i) => (
                <a key={i} href={r.url} className="flex items-center justify-between p-2 rounded border border-border hover:border-primary/50 transition-colors text-sm group">
                  <span className="text-foreground group-hover:text-primary truncate flex-1 mr-2">{r.title}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-xs">{r.exam}</Badge>
                    <Badge variant={r.priority === "high" ? "destructive" : "warning"} className="text-xs">{r.priority}</Badge>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
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
