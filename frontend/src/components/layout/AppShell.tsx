"use client";

import { useEffect } from "react";
import { useGameMode } from "@/lib/game-mode";
import { PixelBackground } from "./PixelBackground";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isGameMode } = useGameMode();

  useEffect(() => {
    document.body.classList.toggle("game-mode", isGameMode);
  }, [isGameMode]);

  return (
    <>
      {isGameMode && <PixelBackground />}
      <div className="min-h-screen flex flex-col">{children}</div>
    </>
  );
}
