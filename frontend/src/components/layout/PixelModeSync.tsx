"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function PixelModeSync() {
  const pixelMode = useAppStore((s) => s.pixelMode);

  useEffect(() => {
    if (pixelMode) {
      document.body.classList.add("pixel-mode");
    } else {
      document.body.classList.remove("pixel-mode");
    }
  }, [pixelMode]);

  return null;
}
