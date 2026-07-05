"use client";

// Global keyboard shortcuts hook.
// Navigation: g + letter for each section (e.g., g t → Today)
// Actions: ? for help, n for new habit (on relevant pages)
// Undo/redo: Ctrl+Z / Ctrl+Shift+Z (handled by undo-redo system)
//
// Usage: call useKeyboardShortcuts() once at the root (AppShell or layout).

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { undoAction, redoAction } from "@/lib/store";

interface Shortcut {
  keys: string; // display string like "g then t"
  description: string;
  action: () => void;
}

const ROUTE_MAP: Record<string, string> = {
  d: "/", // dashboard
  t: "/today", // today
  h: "/habits", // habits
  r: "/tracker", // tracker (grid)
  c: "/calendar", // calendar
  s: "/stats", // stats
  a: "/achievements", // achievements
  p: "/profile", // profile
  o: "/shop", // shop (coins)
  n: "/notes", // notes
  g: "/goals", // goals
  l: "/settings", // settings
};

export function useKeyboardShortcuts() {
  const router = useRouter();
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // --- Undo (Ctrl+Z / Cmd+Z) ---
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoAction();
        return;
      }

      // --- Redo (Ctrl+Shift+Z / Cmd+Shift+Z) ---
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redoAction();
        return;
      }

      // --- Redo (Ctrl+Y / Cmd+Y) ---
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redoAction();
        return;
      }

      // --- Show shortcuts help ---
      if (e.key === "?" && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("kb:toggle-help"));
        return;
      }

      // --- G-prefix navigation ---
      if (gPending.current) {
        gPending.current = false;
        if (gTimer.current) {
          clearTimeout(gTimer.current);
          gTimer.current = null;
        }
        const route = ROUTE_MAP[e.key.toLowerCase()];
        if (route) {
          e.preventDefault();
          navigate(route);
        }
        return;
      }

      if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        gPending.current = true;
        const timer = setTimeout(() => {
          gPending.current = false;
          gTimer.current = null;
        }, 2000);
        gTimer.current = timer;
        return;
      }

      // --- Single-key navigation ---
      if (e.key === "n" && !e.ctrlKey && !e.metaKey) {
        // Trigger "add habit" — pages listen for this custom event
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("kb:add-habit"));
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (gTimer.current) clearTimeout(gTimer.current);
    };
  }, [navigate]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (gTimer.current) clearTimeout(gTimer.current);
    };
  }, []);
}

// All available shortcuts — used by the help modal.
export const ALL_SHORTCUTS: Shortcut[] = [
  { keys: "g then d", description: "Go to Dashboard", action: () => {} },
  { keys: "g then t", description: "Go to Today", action: () => {} },
  { keys: "g then h", description: "Go to Habits", action: () => {} },
  { keys: "g then r", description: "Go to Tracker", action: () => {} },
  { keys: "g then c", description: "Go to Calendar", action: () => {} },
  { keys: "g then s", description: "Go to Statistics", action: () => {} },
  { keys: "g then a", description: "Go to Achievements", action: () => {} },
  { keys: "g then p", description: "Go to Profile", action: () => {} },
  { keys: "g then o", description: "Go to Shop", action: () => {} },
  { keys: "g then n", description: "Go to Notes", action: () => {} },
  { keys: "g then g", description: "Go to Goals", action: () => {} },
  { keys: "g then l", description: "Go to Settings", action: () => {} },
  { keys: "Ctrl+Z", description: "Undo last action", action: () => {} },
  { keys: "Ctrl+Shift+Z", description: "Redo last action", action: () => {} },
  { keys: "n", description: "Add new habit", action: () => {} },
  { keys: "?", description: "Show keyboard shortcuts", action: () => {} },
];
