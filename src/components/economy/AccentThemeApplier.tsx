"use client";

// Applies the active accent app-wide by writing the --c-accent / --c-accent-glow
// CSS variables on <html>. An equipped "accent" cosmetic (shop §15) overrides
// the user's chosen theme accent; with no cosmetic we fall back to that theme
// accent. Renders nothing.
//
// NB: this is the SINGLE authoritative writer of the inline accent vars. It runs
// after ThemeApplier in the effect order, so it must reapply the themed accent
// in the no-cosmetic case — clearing the inline var here (the old behavior) wiped
// the user's chosen accent and snapped the whole app back to the stylesheet
// default on every load.

import { useEffect } from "react";
import { useAppData } from "@/lib/store";
import { equippedAccent } from "@/lib/economy";
import { accentById } from "@/lib/theme";

export function AccentThemeApplier() {
  const data = useAppData();
  const cosmetic = equippedAccent(data.economy);
  const themed = accentById(data.settings.theme.accent);
  // Cosmetic accent wins; otherwise the user's chosen theme accent.
  const accentColor = cosmetic?.accent ?? themed.color;
  const glowColor = cosmetic?.glow ?? themed.glow;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--c-accent", accentColor);
    root.style.setProperty("--c-accent-glow", glowColor);
  }, [accentColor, glowColor]);

  return null;
}
