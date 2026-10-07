import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 70) return "text-yellow-500";
  return "text-red-500";
}

export function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 70) return "bg-yellow-500";
  return "bg-red-500";
}
