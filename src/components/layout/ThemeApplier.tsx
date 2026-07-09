"use client";

// Applies the saved theme to <html>: sets data-theme (light/dark, resolving
// "system") and the accent CSS variables. Renders nothing.
// A no-flash inline script in layout.tsx applies the same before hydration.

import { useEffect } from "react";
import { useAppData } from "@/lib/store";
import { accentById, resolveMode } from "@/lib/theme";

export function ThemeApplier() {
  const { mode, accent } = useAppData().settings.theme;

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const resolved = resolveMode(mode);
      root.dataset.theme = resolved;
      root.style.colorScheme = resolved;
    };
    apply();
    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [mode]);

  useEffect(() => {
    const a = accentById(accent);
    const root = document.documentElement;
    root.style.setProperty("--c-accent", a.color);
    root.style.setProperty("--c-accent-glow", a.glow);
  }, [accent]);

  return null;
}
