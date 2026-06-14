// Pure calculation helpers: scheduling, streaks, and completion rates.
// Kept separate from UI so they are easy to reuse and reason about.

import type { Category } from "./categories";
import type { Habit, Marks } from "./types";
import { addDays, dateKey } from "./storage";

// Is this habit scheduled on the given date? (empty repeatDays = every day)
export function isScheduled(habit: Habit, date: Date): boolean {
  return habit.repeatDays.length === 0 || habit.repeatDays.includes(date.getDay());
}

function markFor(marks: Marks, key: string, habitId: string) {
  return marks[key]?.[habitId];
}

// Current and best "done" streaks for a habit, counting only scheduled days.
// A scheduled day marked "done" extends the streak; "skipped" is neutral
// (ignored); anything else (missed / unmarked) breaks it.
export function habitStreaks(
  habit: Habit,
  marks: Marks,
  today: Date,
): { current: number; best: number } {
  const start = new Date(habit.createdAt);
  let best = 0;
  let run = 0;
  let current = 0;
  let currentBroken = false;

  // Walk forward from creation day to today.
  for (let d = new Date(start); dateKey(d) <= dateKey(today); d = addDays(d, 1)) {
    if (!isScheduled(habit, d)) continue;
    const status = markFor(marks, dateKey(d), habit.id);
    if (status === "done") {
      run += 1;
      best = Math.max(best, run);
    } else if (status === "skipped") {
      // neutral — do nothing
    } else {
      run = 0;
    }
  }

  // Current streak = run counting back from today over scheduled days.
  for (let d = new Date(today); dateKey(d) >= dateKey(start); d = addDays(d, -1)) {
    if (!isScheduled(habit, d)) continue;
    const status = markFor(marks, dateKey(d), habit.id);
    if (status === "done") {
      if (!currentBroken) current += 1;
    } else if (status === "skipped") {
      // neutral
    } else {
      currentBroken = true;
    }
  }

  return { current, best };
}

// Completion rate over a date range (inclusive), across the given habits.
export function rangeCompletion(
  habits: Habit[],
  marks: Marks,
  from: Date,
  to: Date,
): { scheduled: number; done: number; rate: number } {
  let scheduled = 0;
  let done = 0;
  for (let d = new Date(from); dateKey(d) <= dateKey(to); d = addDays(d, 1)) {
    for (const habit of habits) {
      // Skip days before the habit was created.
      if (dateKey(d) < dateKey(new Date(habit.createdAt))) continue;
      if (!isScheduled(habit, d)) continue;
      scheduled += 1;
      if (markFor(marks, dateKey(d), habit.id) === "done") done += 1;
    }
  }
  const rate = scheduled === 0 ? 0 : Math.round((done / scheduled) * 100);
  return { scheduled, done, rate };
}

// Completion rate for a single day (0–100) across scheduled habits.
export function dayCompletion(habits: Habit[], marks: Marks, date: Date): number {
  const scheduled = habits.filter((h) => isScheduled(h, date));
  if (scheduled.length === 0) return 0;
  const done = scheduled.filter(
    (h) => markFor(marks, dateKey(date), h.id) === "done",
  ).length;
  return Math.round((done / scheduled.length) * 100);
}

// Per-category completion over a range.
export function categoryCompletion(
  habits: Habit[],
  marks: Marks,
  from: Date,
  to: Date,
): { category: Category; rate: number }[] {
  const byCat = new Map<Category, Habit[]>();
  for (const h of habits) {
    const list = byCat.get(h.category) ?? [];
    list.push(h);
    byCat.set(h.category, list);
  }
  return Array.from(byCat.entries())
    .map(([category, list]) => ({
      category,
      rate: rangeCompletion(list, marks, from, to).rate,
    }))
    .sort((a, b) => b.rate - a.rate);
}

// Completion % for each of the last `n` days (oldest first) — for the chart.
export function lastNDaysCompletion(
  habits: Habit[],
  marks: Marks,
  today: Date,
  n: number,
): { date: Date; rate: number }[] {
  const out: { date: Date; rate: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    out.push({ date, rate: dayCompletion(habits, marks, date) });
  }
  return out;
}
