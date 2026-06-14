// The core data shapes for the whole app.
// Phase 1-3 store all of this in the browser (localStorage).
// In Phase 4 the same shapes move to the Supabase database.

import type { Category } from "./categories";
import type { ThemeSettings } from "./theme";

// How a habit can be marked for a given day.
// "none" is represented by the ABSENCE of a mark (keeps storage small).
export type MarkStatus = "done" | "missed" | "skipped";

export interface Habit {
  id: string;
  name: string;
  category: Category;
  // Weekdays the habit repeats on: 0 = Sun ... 6 = Sat.
  // An empty array means "every day".
  repeatDays: number[];
  createdAt: string; // ISO timestamp
}

// marks[dateKey][habitId] = status, where dateKey is "YYYY-MM-DD".
export type Marks = Record<string, Record<string, MarkStatus>>;

// A bigger target the user works toward (e.g. "Workout 20 times this month").
export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  createdAt: string;
}

export interface Settings {
  theme: ThemeSettings;
}

export interface AppData {
  habits: Habit[];
  marks: Marks;
  notes: Record<string, string>; // notes[dateKey] = free text
  goals: Goal[];
  settings: Settings;
}
