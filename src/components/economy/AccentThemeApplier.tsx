"use client";

// Applies the equipped "accent" cosmetic (shop §15) app-wide by overriding the
// --c-accent / --c-accent-glow CSS variables on <html>. The default equips no
// override, so the per-theme accent from globals.css applies. Renders nothing.

import { useEffect } from "react";
import { useAppData } from "@/lib/store";
import { equippedAccent } from "@/lib/economy";

export function AccentThemeApplier() {
  const data = useAppData();
  const accent = equippedAccent(data.economy);
  const accentColor = accent?.accent ?? null;
  const glowColor = accent?.glow ?? null;

  useEffect(() => {
    const root = document.documentElement;
    if (accentColor && glowColor) {
      root.style.setProperty("--c-accent", accentColor);
      root.style.setProperty("--c-accent-glow", glowColor);
    } else {
      root.style.removeProperty("--c-accent");
      root.style.removeProperty("--c-accent-glow");
    }
  }, [accentColor, glowColor]);

  return null;
}
