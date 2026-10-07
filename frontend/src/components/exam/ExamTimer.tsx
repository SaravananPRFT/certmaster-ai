"use client";
import React, { useEffect, useCallback } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { useExamStore } from "@/lib/store";

interface ExamTimerProps {
  onTimeUp?: () => void;
  mode?: "certification" | "practice";
}

export function ExamTimer({ onTimeUp, mode = "certification" }: ExamTimerProps) {
  const { timeRemaining, setTimeRemaining } = useExamStore();

  useEffect(() => {
    if (mode === "practice" || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining(Math.max(0, timeRemaining - 1));
      if (timeRemaining === 1) onTimeUp?.();
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, mode, onTimeUp, setTimeRemaining]);

  const isWarning = timeRemaining <= 30 * 60 && timeRemaining > 15 * 60;
  const isDanger = timeRemaining <= 15 * 60;
  const isCritical = timeRemaining <= 5 * 60;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-lg font-bold transition-colors",
        isCritical
          ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
          : isDanger
          ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
          : isWarning
          ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
          : "bg-card border-border text-foreground"
      )}
    >
      {isCritical || isDanger ? (
        <AlertTriangle className="h-5 w-5 shrink-0" />
      ) : (
        <Clock className="h-5 w-5 shrink-0" />
      )}
      <span>{formatTime(timeRemaining)}</span>
      {isCritical && <span className="text-xs font-normal ml-1">TIME RUNNING OUT</span>}
    </div>
  );
}
