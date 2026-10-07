"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface GameModeContextType {
  isGameMode: boolean;
  toggle: () => void;
}

const GameModeContext = createContext<GameModeContextType>({
  isGameMode: false,
  toggle: () => {},
});

export function GameModeProvider({ children }: { children: ReactNode }) {
  const [isGameMode, setIsGameMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("certmaster-game-mode");
    if (saved === "true") setIsGameMode(true);
  }, []);

  const toggle = () => {
    setIsGameMode((prev) => {
      const next = !prev;
      localStorage.setItem("certmaster-game-mode", String(next));
      return next;
    });
  };

  return (
    <GameModeContext.Provider value={{ isGameMode, toggle }}>
      {children}
    </GameModeContext.Provider>
  );
}

export function useGameMode() {
  return useContext(GameModeContext);
}

export const GAME_LABELS: Record<string, { label: string; sublabel?: string }> = {
  "/":          { label: "Hero Base",        sublabel: "Your quest for certification starts here" },
  "/exams":     { label: "Choose Continent", sublabel: "Pick your certification world" },
  "/dashboard": { label: "Hero Stats",       sublabel: "Your legend so far" },
  "/planner":   { label: "Quest Planner",    sublabel: "Plan your journey to mastery" },
  "/assistant": { label: "AI Sage",          sublabel: "Seek wisdom from the AI mentor" },
  "/admin":     { label: "Admin Fortress",   sublabel: "Manage the realm" },
};

export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000];
export const LEVEL_TITLES = [
  "Curious", "Apprentice", "Journeyman", "Adept",
  "Scholar", "Expert", "Architect", "Master", "Grandmaster", "Legend",
];

export function computeLevel(xp: number): {
  level: number; title: string; xpInLevel: number; xpToNext: number;
} {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { level = i + 1; break; }
  }
  const capped  = Math.min(level, LEVEL_THRESHOLDS.length);
  const floorXP = LEVEL_THRESHOLDS[capped - 1] ?? 0;
  const ceilXP  = LEVEL_THRESHOLDS[capped] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] * 2;
  return {
    level: capped,
    title: LEVEL_TITLES[capped - 1] ?? "Legend",
    xpInLevel: xp - floorXP,
    xpToNext:  ceilXP - floorXP,
  };
}
