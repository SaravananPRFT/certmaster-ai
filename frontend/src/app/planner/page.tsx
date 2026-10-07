"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { EXAM_BLUEPRINTS } from "@/lib/examConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Clock, ChevronDown, ChevronUp, CheckCircle2,
  BookOpen, FlaskConical, Eye, PenLine, Target, Lightbulb,
  Loader2, LogIn, Copy, Check,
} from "lucide-react";
import { plannerApi } from "@/lib/api";

interface StudyPlanTask {
  day: string;
  task: string;
  durationMinutes: number;
  type: "reading" | "practice" | "review" | "lab" | "quiz";
}

interface StudyPlanWeek {
  week: number;
  title: string;
  focusDomain: string;
  topics: string[];
  dailyTasks: StudyPlanTask[];
  milestone: string;
  resources: string[];
}

interface StudyPlan {
  examCode: string;
  examName: string;
  totalWeeks: number;
  dailyHours: number;
  overview: string;
  weeks: StudyPlanWeek[];
  examTips: string[];
  recommendedPractice: string;
}

const TASK_TYPE_CONFIG = {
  reading:  { icon: BookOpen,      label: "Reading",  color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  practice: { icon: PenLine,       label: "Practice", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  review:   { icon: Eye,           label: "Review",   color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  lab:      { icon: FlaskConical,  label: "Lab",      color: "text-green-400 bg-green-400/10 border-green-400/20" },
  quiz:     { icon: CheckCircle2,  label: "Quiz",     color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
} as const;

const EXPERIENCE_LEVELS = [
  { value: "beginner",     label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced",     label: "Advanced" },
];

export default function PlannerPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [examCode, setExamCode]             = useState("AZ-104");
  const [examDate, setExamDate]             = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0];
  });
  const [dailyHours, setDailyHours]         = useState(2);
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [weakDomains, setWeakDomains]       = useState<string[]>([]);
  const [loading, setLoading]               = useState(false);
  const [plan, setPlan]                     = useState<StudyPlan | null>(null);
  const [error, setError]                   = useState("");
  const [expandedWeeks, setExpandedWeeks]   = useState<Set<number>>(new Set([1]));
  const [copied, setCopied]                 = useState(false);

  useEffect(() => setMounted(true), []);

  const currentExam = EXAM_BLUEPRINTS[examCode];

  const toggleDomain = (domain: string) =>
    setWeakDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );

  const toggleWeek = (week: number) =>
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      next.has(week) ? next.delete(week) : next.add(week);
      return next;
    });

  const handleGenerate = async () => {
    if (!examDate) { setError("Please select a target exam date."); return; }
    setLoading(true);
    setError("");
    try {
      const result = await plannerApi.generatePlan({
        exam_code: examCode,
        exam_date: examDate,
        daily_hours: dailyHours,
        experience_level: experienceLevel,
        weak_domains: weakDomains,
      });
      setPlan(result as StudyPlan);
      setExpandedWeeks(new Set([1]));
    } catch {
      setError("Failed to generate study plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!plan) return;
    const text = [
      `${plan.examCode} — ${plan.examName}`,
      `${plan.totalWeeks}-week plan · ${plan.dailyHours}h/day`,
      "",
      plan.overview,
      "",
      ...plan.weeks.map(
        (w) =>
          `Week ${w.week}: ${w.title}\nFocus: ${w.focusDomain}\nTopics: ${w.topics.join(", ")}\nMilestone: ${w.milestone}`
      ),
      "",
      "Exam Tips:",
      ...plan.examTips.map((t, i) => `${i + 1}. ${t}`),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return <div className="min-h-[calc(100vh-3.5rem)]" />;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-10 pb-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-[#0078d4]/10 border border-[#0078d4]/20 flex items-center justify-center mx-auto">
              <Calendar className="h-6 w-6 text-[#0078d4]" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Study Planner</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to generate a personalized AI-powered study plan tailored to your certification goals.
              </p>
            </div>
            <div className="space-y-2 text-left">
              {["Week-by-week roadmap", "Domain-prioritized schedule", "Daily task breakdown", "AI exam tips & milestones"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Button variant="azure" className="w-full gap-2" onClick={() => router.push("/login")}>
              <LogIn className="h-4 w-4" /> Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Study Planner</h1>
        <p className="text-muted-foreground">
          Generate a personalized AI-powered study plan for your certification exam.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        {/* ── Configuration Form ─────────────────── */}
        <div className="lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configure Your Plan</CardTitle>
              <CardDescription>Tell us your goals and we'll build a personalized roadmap.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Certification */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Certification</label>
                <select
                  value={examCode}
                  onChange={(e) => { setExamCode(e.target.value); setWeakDomains([]); }}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {Object.values(EXAM_BLUEPRINTS).map((e) => (
                    <option key={e.examCode} value={e.examCode}>
                      {e.examCode} — {e.examName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exam date + daily hours */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Exam Date
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Daily Hours
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDailyHours((h) => Math.max(0.5, +(h - 0.5).toFixed(1)))}
                      className="w-8 h-9 rounded-md border border-input flex items-center justify-center hover:bg-accent text-base"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center text-sm font-semibold">{dailyHours}h</span>
                    <button
                      onClick={() => setDailyHours((h) => Math.min(8, +(h + 0.5).toFixed(1)))}
                      className="w-8 h-9 rounded-md border border-input flex items-center justify-center hover:bg-accent text-base"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Experience level */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Experience Level</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {EXPERIENCE_LEVELS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setExperienceLevel(l.value)}
                      className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all border ${
                        experienceLevel === l.value
                          ? "bg-[#0078d4] text-white border-[#0078d4]"
                          : "border-input hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weak domains */}
              {currentExam && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Weak Areas{" "}
                    <span className="text-muted-foreground/50 font-normal">(optional — AI will prioritize these)</span>
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {currentExam.domains.map((d) => (
                      <label key={d.id} className="flex items-start gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={weakDomains.includes(d.name)}
                          onChange={() => toggleDomain(d.name)}
                          className="mt-0.5 rounded accent-[#0078d4]"
                        />
                        <span className="text-xs leading-tight text-muted-foreground group-hover:text-foreground transition-colors">
                          {d.name}{" "}
                          <span className="text-muted-foreground/50">({d.weight}%)</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}

              <Button
                variant="azure"
                className="w-full gap-2"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating Plan…</>
                ) : (
                  <><Calendar className="h-4 w-4" /> Generate Study Plan</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── Plan Output ─────────────────────────── */}
        <div>
          {loading ? (
            <Card>
              <CardContent className="py-16 text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#0078d4] mx-auto" />
                <p className="font-medium">Building your personalized study plan…</p>
                <p className="text-xs text-muted-foreground">
                  AI is analyzing your goals and exam objectives. This takes 15–30 seconds.
                </p>
              </CardContent>
            </Card>
          ) : !plan ? (
            <div className="flex flex-col items-center justify-center py-24 px-8 border-2 border-dashed border-border rounded-xl text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#0078d4]/10 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-[#0078d4]" />
              </div>
              <h3 className="font-semibold mb-2">Your Plan Will Appear Here</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Configure your goals on the left and click{" "}
                <strong>Generate Study Plan</strong> to get a week-by-week roadmap.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Plan header */}
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="info">{plan.examCode}</Badge>
                        <Badge variant="outline">{plan.totalWeeks} weeks</Badge>
                        <Badge variant="outline">{plan.dailyHours}h / day</Badge>
                      </div>
                      <h2 className="text-lg font-bold mb-2 leading-snug">{plan.examName}</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">{plan.overview}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 flex-shrink-0"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <><Check className="h-3.5 w-3.5 text-green-400" /> Copied!</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" /> Copy Plan</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Week cards */}
              {(plan.weeks ?? []).map((week) => {
                const isOpen = expandedWeeks.has(week.week);
                return (
                  <Card
                    key={week.week}
                    className={`transition-colors ${isOpen ? "border-[#0078d4]/30" : ""}`}
                  >
                    <button
                      className="w-full text-left px-5 py-4 flex items-center gap-4"
                      onClick={() => toggleWeek(week.week)}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#0078d4]/10 border border-[#0078d4]/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[#0078d4]">{week.week}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{week.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{week.focusDomain}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs hidden sm:flex">
                          {(week.dailyTasks ?? []).length} days
                        </Badge>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <CardContent className="pb-5 pt-0 px-5 border-t border-border/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                          {/* Topics */}
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                              Topics
                            </h4>
                            <ul className="space-y-1.5">
                              {(week.topics ?? []).map((topic, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#0078d4] flex-shrink-0" />
                                  {topic}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Milestone + Resources */}
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                                Week Milestone
                              </h4>
                              <div className="flex items-start gap-2 text-sm p-3 bg-green-400/10 rounded-lg border border-green-400/20">
                                <Target className="h-3.5 w-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                                <span>{week.milestone}</span>
                              </div>
                            </div>
                            {(week.resources ?? []).length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                  Resources
                                </h4>
                                <ul className="space-y-1">
                                  {week.resources.map((r, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                      <span className="text-[#0078d4] flex-shrink-0">→</span>
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Daily schedule */}
                        {(week.dailyTasks ?? []).length > 0 && (
                          <div className="mt-5">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                              Daily Schedule
                            </h4>
                            <div className="space-y-1">
                              {week.dailyTasks.map((task, i) => {
                                const cfg =
                                  TASK_TYPE_CONFIG[task.type] ?? TASK_TYPE_CONFIG.reading;
                                const Icon = cfg.icon;
                                return (
                                  <div
                                    key={i}
                                    className="flex items-center gap-3 text-sm py-1.5 px-3 rounded-md hover:bg-muted/40 transition-colors"
                                  >
                                    <span className="w-8 text-xs font-medium text-muted-foreground flex-shrink-0">
                                      {task.day}
                                    </span>
                                    <span className="flex-1 text-sm">{task.task}</span>
                                    <span className="text-xs text-muted-foreground flex-shrink-0">
                                      {task.durationMinutes}m
                                    </span>
                                    <div
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border flex-shrink-0 ${cfg.color}`}
                                    >
                                      <Icon className="h-2.5 w-2.5" />
                                      <span className="hidden sm:inline">{cfg.label}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}

              {/* Exam tips */}
              {((plan.examTips ?? []).length > 0 || plan.recommendedPractice) && (
                <Card>
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="h-4 w-4 text-yellow-400" />
                      <h3 className="font-semibold text-sm">Exam Tips</h3>
                    </div>
                    <ul className="space-y-3">
                      {(plan.examTips ?? []).map((tip, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <span className="text-xs font-bold text-[#0078d4] mt-0.5 flex-shrink-0 w-5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-muted-foreground">{tip}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.recommendedPractice && (
                      <div className="mt-4 p-3 bg-[#0078d4]/5 border border-[#0078d4]/20 rounded-lg text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Practice Tests: </strong>
                        {plan.recommendedPractice}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
