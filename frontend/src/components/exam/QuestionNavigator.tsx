"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Question, UserAnswer } from "@/types/exam";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flag } from "lucide-react";

type QuestionStatus = "not-visited" | "answered" | "unanswered" | "marked" | "answered-marked";

function getStatus(
  index: number,
  currentIndex: number,
  answers: Record<string, UserAnswer>,
  markedForReview: Set<string>,
  questions: Question[]
): QuestionStatus {
  const q = questions[index];
  if (!q) return "not-visited";
  const answered = answers[q.questionId]?.selectedOptions?.length > 0;
  const marked = markedForReview.has(q.questionId);
  if (index > currentIndex && !answered && !marked) return "not-visited";
  if (answered && marked) return "answered-marked";
  if (marked) return "marked";
  if (answered) return "answered";
  return "unanswered";
}

const STATUS_STYLES: Record<QuestionStatus, string> = {
  "not-visited": "bg-muted text-muted-foreground border-border",
  answered: "bg-green-500/20 text-green-400 border-green-500/50",
  unanswered: "bg-red-500/20 text-red-400 border-red-500/50",
  marked: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  "answered-marked": "bg-blue-500/20 text-blue-400 border-blue-500/50",
};

interface Props {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, UserAnswer>;
  markedForReview: Set<string>;
  onNavigate: (index: number) => void;
}

export function QuestionNavigator({ questions, currentIndex, answers, markedForReview, onNavigate }: Props) {
  const stats = {
    answered: Object.values(answers).filter((a) => a.selectedOptions.length > 0).length,
    marked: markedForReview.size,
    unanswered: questions.length - Object.values(answers).filter((a) => a.selectedOptions.length > 0).length,
  };

  return (
    <div className="w-64 flex flex-col border-r border-border bg-card h-full">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground mb-3">Question Navigator</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <LegendItem color="bg-green-500/20 text-green-400 border-green-500/50" label="Answered" count={stats.answered} />
          <LegendItem color="bg-red-500/20 text-red-400 border-red-500/50" label="Unanswered" count={stats.unanswered} />
          <LegendItem color="bg-yellow-500/20 text-yellow-400 border-yellow-500/50" label="Marked" count={stats.marked} />
          <LegendItem color="bg-muted text-muted-foreground border-border" label="Not Visited" count={questions.length - stats.answered - stats.unanswered} />
        </div>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="grid grid-cols-5 gap-1.5">
          {questions.map((q, i) => {
            const status = getStatus(i, currentIndex, answers, markedForReview, questions);
            const isCurrent = i === currentIndex;
            return (
              <button
                key={q.questionId}
                onClick={() => onNavigate(i)}
                className={cn(
                  "relative w-9 h-9 rounded border text-xs font-medium transition-all hover:scale-110 cursor-pointer",
                  STATUS_STYLES[status],
                  isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-background font-bold"
                )}
                title={`Question ${i + 1}: ${status}`}
              >
                {i + 1}
                {markedForReview.has(q.questionId) && (
                  <Flag className="absolute -top-1 -right-1 h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-3 h-3 rounded border text-center text-[8px] leading-3", color)} />
      <span className="text-muted-foreground">{label} ({count})</span>
    </div>
  );
}
