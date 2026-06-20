// Demo / stress data generators for Developer Mode. These build valid AppData
// (schema v4) so the normal load validators accept them and all derived
// gamification recomputes from the seeded history. App code may use
// Math.random freely (the no-random rule only applies to workflow scripts).

import type { AppData, Habit, Marks, MarkStatus } from "./types";
import { CATEGORIES, type Category } from "./categories";
import { addDays, dateKey } from "./storage";
import { uid } from "./util";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Weighted mark: mostly done, some misses/skips, some unmarked.
function rollStatus(): MarkStatus | undefined {
  const r = Math.random();
  if (r < 0.62) return "done";
  if (r < 0.74) return "missed";
  if (r < 0.82) return "skipped";
  return undefined;
}

interface SeedShape {
  name: string;
  category: Category;
  repeatDays: number[];
}

const DEMO_HABITS: SeedShape[] = [
  { name: "Morning run", category: "Workout", repeatDays: [1, 3, 5] },
  { name: "Read 30 min", category: "Hobbies", repeatDays: [] },
  { name: "Study session", category: "Studies", repeatDays: [1, 2, 3, 4, 5] },
  { name: "Drink water", category: "Health", repeatDays: [] },
  { name: "Meditate", category: "Health", repeatDays: [] },
  { name: "Inbox zero", category: "Work", repeatDays: [1, 2, 3, 4, 5] },
];

function buildHistory(habits: Habit[], today: Date, days: number): Marks {
  const marks: Marks = {};
  for (let i = days; i >= 1; i--) {
    const d = addDays(today, -i);
    const key = dateKey(d);
    const wd = d.getDay();
    const day: Record<string, MarkStatus> = {};
    for (const h of habits) {
      const scheduled = h.repeatDays.length === 0 || h.repeatDays.includes(wd);
      if (!scheduled) continue;
      const status = rollStatus();
      if (status) day[h.id] = status;
    }
    if (Object.keys(day).length > 0) marks[key] = day;
  }
  return marks;
}

// Replace habits + marks with a realistic ~45-day demo history. Keeps the rest
// of AppData (settings, profile, economy, etc.) intact.
export function makeDemoData(base: AppData, today: Date): AppData {
  const start = dateKey(addDays(today, -45));
  const habits: Habit[] = DEMO_HABITS.map((h) => ({
    id: uid(),
    name: h.name,
    category: h.category,
    repeatDays: h.repeatDays,
    createdAt: new Date(addDays(today, -45)).toISOString(),
    startDate: start,
    priority: "med",
    recurrence:
      h.repeatDays.length === 0
        ? { kind: "daily" }
        : { kind: "weekly", weekdays: h.repeatDays },
  }));
  return { ...base, habits, marks: buildHistory(habits, today, 45) };
}

// Generate a large dataset to profile render/storage performance.
export function makeStressData(
  base: AppData,
  today: Date,
  habitCount: number,
  days: number,
): AppData {
  const habits: Habit[] = Array.from({ length: habitCount }, (_, i) => {
    const category = pick(CATEGORIES);
    return {
      id: uid(),
      name: `Stress habit ${i + 1}`,
      category,
      repeatDays: [],
      createdAt: new Date(addDays(today, -days)).toISOString(),
      startDate: dateKey(addDays(today, -days)),
      priority: "med",
      recurrence: { kind: "daily" as const },
    };
  });
  return {
    ...base,
    habits: [...base.habits, ...habits],
    marks: { ...base.marks, ...buildHistory(habits, today, days) },
  };
}
