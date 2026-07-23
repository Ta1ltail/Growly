"use client";

// Applies the saved theme to <html>: sets data-theme (light/dark, resolving
// "system"), the accent CSS variables, and syncs the theme-color meta tag
// so Android navigation bar matches the app's bottom nav surface color.
// A no-flash inline script in layout.tsx applies theme + accent before hydration.

import { useEffect } from "react";
import { useAppDataSelector } from "@/lib/store";
import { accentById, resolveMode } from "@/lib/theme";
import { isCapacitor } from "@/lib/capacitor";

/* ── Helpers ── */

/** Read the current resolved --c-surface value from the applied CSS. */
function readSurface(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--c-surface")
    .trim();
}

/**
 * Update (or create) the theme-color <meta> tag so Android Chrome /
 * Capacitor WebView colours the navigation bar to match the bottom nav.
 */
function syncThemeColor() {
  const surface = readSurface();
  if (!surface) return;

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", surface);
}

/**
 * When running inside a Capacitor native WebView, set the status bar
 * and Android navigation bar colours through the native plugin so they
 * blend seamlessly with the app's chrome.
 */
async function syncCapacitorNavBar() {
  if (!isCapacitor()) return;
  try {
    const { StatusBar } = await import("@capacitor/status-bar");
    const surface = readSurface();
    if (!surface) return;

    await StatusBar.setBackgroundColor({ color: surface });
    // Derive style from the resolved theme (already set as data-theme),
    // never from a hardcoded colour value.
    const theme = document.documentElement.dataset.theme;
    await (StatusBar.setStyle as (options: { style: string }) => Promise<void>)({ style: theme === "light" ? "LIGHT" : "DARK" });
  } catch {
    // Plugin may not be installed — silently ignore
  }
}

/* ── Component ── */

export function ThemeApplier() {
  const { mode, accent } = useAppDataSelector((d) => d.settings.theme);
  const reducedMotion = useAppDataSelector((d) => d.settings.reducedMotion);

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const resolved = resolveMode(mode);
      root.dataset.theme = resolved;
      root.style.colorScheme = resolved;

      // Sync theme-color meta for Android nav bar (PWA & browser)
      syncThemeColor();

      // Sync native Capacitor nav bar (WebView only — guarded inside)
      syncCapacitorNavBar();
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

  // Sync the reduced-motion data attribute on mount and whenever the
  // preference changes. This is set by setReducedMotion() on toggle, but
  // on full page load / hard navigation it needs to be re-applied from the
  // persisted store value — otherwise the CSS [data-reduced-motion="true"]
  // selectors in globals.css would not take effect.
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-reduced-motion",
      reducedMotion ? "true" : "false",
    );
  }, [reducedMotion]);

  return null;
}
