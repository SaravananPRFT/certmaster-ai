"use client";
import { useEffect } from "react";
import { useGameMode } from "@/lib/game-mode";

export function PixelModeSync() {
  const { isGameMode } = useGameMode();

  useEffect(() => {
    document.body.classList.toggle("game-mode", isGameMode);
  }, [isGameMode]);

  return null;
}
