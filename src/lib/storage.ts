// Loading/saving app data to the browser's localStorage,
// plus small date helpers. All guarded so they are safe to call
// during server rendering (where `window` does not exist).

import type { AppData } from "./types";
import { DEFAULT_THEME } from "./theme";

export const STORAGE_KEY = "project101.data.v1";

export const emptyData: AppData = {
  habits: [],
  marks: {},
  notes: {},
  goals: [],
  settings: { theme: DEFAULT_THEME },
};

export function loadData(): AppData {
  if (typeof window === "undefined") return emptyData;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    // Merge with defaults so older saved data still loads after updates.
    return {
      habits: parsed.habits ?? [],
      marks: parsed.marks ?? {},
      notes: parsed.notes ?? {},
      goals: parsed.goals ?? [],
      settings: {
        theme: {
          mode: parsed.settings?.theme?.mode ?? DEFAULT_THEME.mode,
          accent: parsed.settings?.theme?.accent ?? DEFAULT_THEME.accent,
        },
      },
    };
  } catch {
    return emptyData;
  }
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can fail (private mode, quota). Safe to ignore for now.
  }
}

// Local date as "YYYY-MM-DD" (not UTC, so "today" matches the user).
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function prettyDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Return a new Date that is `n` days before/after `d` (n can be negative).
export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
