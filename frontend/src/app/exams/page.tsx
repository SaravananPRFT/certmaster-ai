"use client";
import React, { useState } from "react";
import Link from "next/link";
import { EXAM_BLUEPRINTS } from "@/lib/examConfig";
import { ExamBlueprint } from "@/types/exam";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Target, ChevronRight, BarChart3 } from "lucide-react";
import { useGameMode, computeLevel } from "@/lib/game-mode";

/* ── Continent theming map ─────────────────────────────── */
const CONTINENT: Record<string, { name: string; color: string; bg: string; castle: string }> = {
  "AI-102": { name: "NEURAL FRONTIER",  color: "#4ecdc4", bg: "#08232b", castle: "castle-teal"   },
  "AZ-104": { name: "CLOUD KINGDOM",    color: "#45b7d1", bg: "#08192a", castle: "castle-blue"   },
  "AZ-305": { name: "ARCHITECT'S PEAK", color: "#a78bfa", bg: "#160c30", castle: "castle-violet" },
  "GH-300": { name: "CODE FORTRESS",    color: "#f87171", bg: "#280c0c", castle: "castle-red"    },
  "AB-100": { name: "AGENT EMPIRE",     color: "#fb923c", bg: "#261208", castle: "castle-amber"  },
  "AI-103": { name: "DEV CITADEL",      color: "#34d399", bg: "#062616", castle: "castle-green"  },
  "AI-901": { name: "BEGINNER'S KEEP",  color: "#fbbf24", bg: "#201a06", castle: "castle-gold"   },
};

/* ══════════════════════════════════════════════════════════
   Page
══════════════════════════════════════════════════════════ */
export default function ExamsPage() {
  const exams = Object.values(EXAM_BLUEPRINTS);
  const { isGameMode } = useGameMode();

  /* ── SERIOUS view ── */
  if (!isGameMode) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Available Certifications</h1>
          <p className="text-muted-foreground">
            Select an exam to start practicing with AI-generated, RAG-grounded questions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => <ExamCard key={exam.examCode} exam={exam} />)}
        </div>
      </div>
    );
  }

  /* ── PIXEL / GAME view ── */
  const xp = 0;
  const lvl = computeLevel(xp);
  const pct = lvl.xpToNext > 0 ? (lvl.xpInLevel / lvl.xpToNext) * 100 : 100;

  return (
    <div className="relative overflow-x-hidden" style={{ minHeight: "calc(100vh - 56px)" }}>
      <div className="relative flex" style={{ minHeight: "calc(100vh - 56px)" }}>

        {/* Left sidebar */}
        <aside className="w-60 shrink-0 p-4 hidden md:flex flex-col gap-4 sticky top-14 self-start">

          {/* Level + XP */}
          <div className="pixel-panel p-4">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: "hsl(43 90% 56%)", fontSize: "18px", lineHeight: 1 }}>★</span>
              <span className="pixel-font" style={{ fontSize: "10px", color: "hsl(43 90% 65%)" }}>
                LVL {lvl.level}
              </span>
            </div>
            <div className="pixel-font mb-3" style={{ fontSize: "9px", color: "hsl(220 15% 55%)" }}>
              {lvl.title}
            </div>
            <div className="xp-bar-track mb-1">
              <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="pixel-font" style={{ fontSize: "8px", color: "hsl(220 15% 45%)" }}>
                {xp} XP
              </span>
              <span className="pixel-font" style={{ fontSize: "8px", color: "hsl(220 15% 45%)" }}>
                {lvl.xpInLevel}/{lvl.xpToNext}
              </span>
            </div>
          </div>

          {/* Quest info */}
          <div className="pixel-panel p-4">
            <div className="pixel-font mb-3" style={{ fontSize: "9px", color: "hsl(43 90% 65%)" }}>
              ACTIVE QUEST
            </div>
            <div className="pixel-font leading-loose" style={{ fontSize: "8px", color: "hsl(220 15% 55%)" }}>
              Choose a continent below to begin your certification journey.
            </div>
          </div>

          {/* Stars */}
          <div className="pixel-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: "hsl(43 90% 56%)", fontSize: "14px" }}>★</span>
              <span className="pixel-font" style={{ fontSize: "9px" }}>
                <span style={{ color: "hsl(43 90% 65%)" }}>0</span>
                <span style={{ color: "hsl(220 15% 55%)" }}> stars earned</span>
              </span>
            </div>
            <div className="pixel-font" style={{ fontSize: "8px", color: "hsl(220 15% 45%)" }}>
              Complete exams to earn stars and level up your hero.
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 px-5 py-8 pb-20">

          {/* Title */}
          <div className="text-center mb-10">
            <h1
              className="game-label mb-5 tracking-widest"
              style={{
                fontSize: "clamp(13px, 2vw, 22px)",
                color: "hsl(43 90% 60%)",
                textShadow: "3px 3px 0 rgba(0,0,0,0.8), 0 0 20px rgba(232,184,75,0.35)",
              }}
            >
              CHOOSE YOUR CONTINENT
            </h1>

            {/* Info speech bubble */}
            <div
              className="inline-block max-w-lg text-left mb-4 px-5 py-4 relative"
              style={{
                background: "hsl(231 45% 9%)",
                border: "3px solid hsl(231 45% 22%)",
                boxShadow: "inset -3px -3px 0 rgba(0,0,0,0.4), 4px 4px 0 rgba(0,0,0,0.7)",
              }}
            >
              <p className="pixel-font leading-loose" style={{ fontSize: "9px", color: "hsl(43 65% 85%)" }}>
                Each continent is a certification realm. Clear every<br />
                domain castle to master its syllabus and earn XP.
              </p>
              {/* Triangle tail */}
              <div
                style={{
                  position: "absolute", bottom: "-12px", left: "32px",
                  width: 0, height: 0,
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderTop: "12px solid hsl(231 45% 22%)",
                }}
              />
            </div>
            <div
              className="inline-block max-w-xl px-4 py-2"
              style={{ background: "hsl(231 40% 8%)", border: "1px solid hsl(231 45% 18%)" }}
            >
              <p className="pixel-font leading-loose" style={{ fontSize: "7px", color: "hsl(220 15% 45%)" }}>
                <span style={{ color: "hsl(43 90% 56%)" }}>NO ACCOUNT NEEDED.</span>{" "}
                Practice free — sign in to sync progress across devices.
              </p>
            </div>
          </div>

          {/* Continent grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {exams.map((exam) => {
              const cfg = CONTINENT[exam.examCode] ?? {
                name: exam.examCode, color: "#e0c87a", bg: "#14180a", castle: "castle-gold",
              };
              return <ContinentCard key={exam.examCode} exam={exam} cfg={cfg} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── SERIOUS: original exam card ──────────────────────── */
function ExamCard({ exam }: { exam: ExamBlueprint }) {
  return (
    <Card className="hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="info">{exam.examCode}</Badge>
              <Badge variant="outline">Passing: {exam.passingScore}/1000</Badge>
            </div>
            <CardTitle className="text-lg">{exam.examName}</CardTitle>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#0078d4]/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-6 w-6 text-[#0078d4]" />
          </div>
        </div>
        <CardDescription className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{exam.durationMinutes} min</span>
          <span className="flex items-center gap-1"><Target className="h-3 w-3" />{exam.totalQuestions} questions</span>
          <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{exam.domains.length} domains</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          {exam.domains.map((d) => (
            <div key={d.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-0.5">
                  <span className="text-muted-foreground truncate">{d.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{d.weight}%</span>
                </div>
                <Progress value={d.weight} className="h-1" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Link href={`/exams/${exam.examCode}?mode=study`} className="flex-1">
            <Button variant="outline" className="w-full text-sm">Study Mode</Button>
          </Link>
          <Link href={`/exams/${exam.examCode}?mode=practice`} className="flex-1">
            <Button variant="outline" className="w-full text-sm">Practice</Button>
          </Link>
          <Link href={`/exams/${exam.examCode}?mode=certification`} className="flex-1">
            <Button variant="azure" className="w-full text-sm gap-1">
              Exam <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── PIXEL: continent card with CSS castle ─────────────── */
function ContinentCard({
  exam,
  cfg,
}: {
  exam: ExamBlueprint;
  cfg: { name: string; color: string; bg: string; castle: string };
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex flex-col"
      style={{
        border: `3px solid ${cfg.color}`,
        background: cfg.bg,
        boxShadow: hovered
          ? `6px 6px 0 rgba(0,0,0,0.75), 0 0 20px ${cfg.color}40`
          : "4px 4px 0 rgba(0,0,0,0.6)",
        transform: hovered ? "translate(-2px,-2px)" : "none",
        transition: "transform 0.08s, box-shadow 0.08s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* WORLD badge */}
      <div className="px-3 pt-3">
        <span
          className="pixel-font inline-block px-2 py-0.5"
          style={{ fontSize: "7px", background: cfg.color, color: "#000", letterSpacing: "0.1em" }}
        >
          WORLD
        </span>
      </div>

      {/* CSS castle sprite */}
      <div className="flex justify-center py-5">
        <div className={`pixel-castle ${cfg.castle}`} style={{ transform: "scale(1.2)" }} />
      </div>

      {/* Info */}
      <div className="px-3 pb-3 text-center flex flex-col flex-1">
        <div className="pixel-font mb-1 leading-loose" style={{ fontSize: "9px", color: cfg.color }}>
          {cfg.name}
        </div>
        <div className="pixel-font mb-1" style={{ fontSize: "10px", color: "#e0d0a0" }}>
          {exam.examCode}
        </div>
        <div className="mb-2 leading-relaxed" style={{ fontSize: "10px", color: "hsl(220 15% 55%)" }}>
          {exam.examName}
        </div>
        <div className="flex justify-center gap-1 mb-1">
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ color: "hsl(231 45% 25%)", fontSize: "14px" }}>★</span>
          ))}
        </div>
        <div className="pixel-font mb-3" style={{ fontSize: "7px", color: "hsl(220 15% 40%)" }}>
          {exam.domains.length} domains · {exam.totalQuestions}Q · {exam.durationMinutes}min
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "2px", background: `${cfg.color}28`, margin: "0 10px" }} />

      {/* Mode buttons */}
      <div className="flex gap-1.5 p-3">
        <Link href={`/exams/${exam.examCode}?mode=study`} className="flex-1">
          <button
            className="pixel-btn w-full"
            style={{ color: cfg.color, borderColor: cfg.color, background: "transparent" }}
          >
            Study
          </button>
        </Link>
        <Link href={`/exams/${exam.examCode}?mode=practice`} className="flex-1">
          <button
            className="pixel-btn w-full"
            style={{ color: cfg.color, borderColor: cfg.color, background: "transparent" }}
          >
            Prac
          </button>
        </Link>
        <Link href={`/exams/${exam.examCode}?mode=certification`} className="flex-1">
          <button
            className="pixel-btn w-full"
            style={{ background: cfg.color, color: "#000", borderColor: cfg.color }}
          >
            Exam →
          </button>
        </Link>
      </div>
    </div>
  );
}
