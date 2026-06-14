"use client";

// Applies the saved theme (light/dark) to <html> by toggling the .dark class.
// Renders nothing — it only syncs React state to the DOM.

import { useEffect } from "react";
import { useAppData } from "@/lib/store";

export function ThemeApplier() {
  const { settings } = useAppData();
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);
  return null;
}
