// Pure calculation helpers: scheduling, streaks, completion rates, and the
// analytics that power the Statistics and Dashboard screens.
// Kept separate from UI so they are easy to reuse and reason about.

import type { Category } from "./categories";
import type { Habit, Marks, MarkStatus, Recurrence } from "./types";
import { addDays, dateKey, parseDateKey, startOfDay } from "./storage";

/* ---------------- scheduling ---------------- */

// The canonical schedule for a habit. New habits store `recurrence`; older
// saved habits only have `repeatDays`, so we derive it (empty => daily).
export function effectiveRecurrence(habit: Habit): Recurrence {
  if (habit.recurrence) return habit.recurrence;
  return habit.repeatDays.length === 0
    ? { kind: "daily" }
    : { kind: "weekly", weekdays: habit.repeatDays };
}

// The day a habit becomes active. Prefers `startDate`, falls back to createdAt.
export function habitStartDay(habit: Habit): Date {
  if (habit.startDate) return startOfDay(parseDateKey(habit.startDate));
  return startOfDay(new Date(habit.createdAt));
}

// Is this habit scheduled on the given date? Honors recurrence + start date.
export function isScheduled(habit: Habit, date: Date): boolean {
  if (startOfDay(date).getTime() < habitStartDay(habit).getTime()) return false;
  const rec = effectiveRecurrence(habit);
  switch (rec.kind) {
    case "daily":
      return true;
    case "weekly":
      return rec.weekdays.length === 0 || rec.weekdays.includes(date.getDay());
    case "monthly":
      if (rec.monthDays.length === 0) return date.getDate() === habitStartDay(habit).getDate();
      return rec.monthDays.includes(date.getDate());
  }
}

function markFor(marks: Marks, key: string, habitId: string) {
  return marks[key]?.[habitId];
}

/* ---------------- streaks ---------------- */

// Current and best "done" streaks for a habit, counting only scheduled days.
// A scheduled day marked "done" extends the streak; "skipped" is neutral
// (ignored); anything else (missed / unmarked) breaks it.
//
// `frozen` is an optional set of "habitId@dateKey" strings from a streak-freeze
// consumable (lib/economy). A frozen day is treated as NEUTRAL (like skipped) —
// the miss still exists in history, it just doesn't break the streak. This is
// the only sanctioned way a recorded miss is bridged, and it's gated/logged in
// the store, so Honest Tracking holds.
export function habitStreaks(
  habit: Habit,
  marks: Marks,
  today: Date,
  frozen?: Set<string>,
): { current: number; best: number } {
  const start = habitStartDay(habit);
  const end = startOfDay(today);
  const startMs = start.getTime();
  const endMs = end.getTime();
  let best = 0;
  let run = 0;
  let current = 0;
  let currentBroken = false;

  const isNeutral = (status: MarkStatus | undefined, key: string): boolean =>
    status === "skipped" || (frozen?.has(`${habit.id}@${key}`) ?? false);

  // Walk forward from start day to today.
  for (let d = new Date(start); d.getTime() <= endMs; d = addDays(d, 1)) {
    if (!isScheduled(habit, d)) continue;
    const key = dateKey(d);
    const status = markFor(marks, key, habit.id);
    if (status === "done") {
      run += 1;
      best = Math.max(best, run);
    } else if (isNeutral(status, key)) {
      // neutral — do nothing
    } else {
      run = 0;
    }
  }

  // Current streak = run counting back from today over scheduled days.
  for (let d = new Date(end); d.getTime() >= startMs; d = addDays(d, -1)) {
    if (!isScheduled(habit, d)) continue;
    const key = dateKey(d);
    const status = markFor(marks, key, habit.id);
    if (status === "done") {
      if (!currentBroken) current += 1;
    } else if (isNeutral(status, key)) {
      // neutral
    } else {
      currentBroken = true;
    }
  }

  return { current, best };
}

/* ---------------- completion ---------------- */

// Completion rate over a date range (inclusive), across the given habits.
export function rangeCompletion(
  habits: Habit[],
  marks: Marks,
  from: Date,
  to: Date,
): { scheduled: number; done: number; missed: number; rate: number } {
  const endMs = startOfDay(to).getTime();
  const startMs = habits.map((h) => habitStartDay(h).getTime());
  let scheduled = 0;
  let done = 0;
  let missed = 0;
  for (let d = startOfDay(from); d.getTime() <= endMs; d = addDays(d, 1)) {
    const dMs = d.getTime();
    const key = dateKey(d);
    for (let i = 0; i < habits.length; i++) {
      const habit = habits[i];
      if (dMs < startMs[i]) continue;
      if (!isScheduled(habit, d)) continue;
      scheduled += 1;
      const status = markFor(marks, key, habit.id);
      if (status === "done") done += 1;
      else if (status === "missed") missed += 1;
    }
  }
  const rate = scheduled === 0 ? 0 : Math.round((done / scheduled) * 100);
  return { scheduled, done, missed, rate };
}

// Completion rate for a single day (0–100) across scheduled habits.
export function dayCompletion(habits: Habit[], marks: Marks, date: Date): number {
  const scheduled = habits.filter((h) => isScheduled(h, date));
  if (scheduled.length === 0) return 0;
  const key = dateKey(date);
  const done = scheduled.filter((h) => markFor(marks, key, h.id) === "done").length;
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

/* ---------------- richer analytics ---------------- */

// A 0–100 "consistency" score over a range: completion rate weighted so that
// recent days count a little more (keeps the score responsive).
export function consistencyScore(habits: Habit[], marks: Marks, today: Date, days: number): number {
  let weighted = 0;
  let weight = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i);
    const scheduled = habits.filter((h) => isScheduled(h, date));
    if (scheduled.length === 0) continue;
    const w = 1 + (days - i) / days; // newer days weigh up to ~2x
    weighted += dayCompletion(habits, marks, date) * w;
    weight += w;
  }
  return weight === 0 ? 0 : Math.round(weighted / weight);
}

// Average completion for each weekday (0=Sun..6=Sat) over the last `days`.
export function completionByWeekday(
  habits: Habit[],
  marks: Marks,
  today: Date,
  days: number,
): { weekday: number; rate: number }[] {
  const sum = new Array(7).fill(0);
  const count = new Array(7).fill(0);
  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i);
    const scheduled = habits.filter((h) => isScheduled(h, date));
    if (scheduled.length === 0) continue;
    const wd = date.getDay();
    sum[wd] += dayCompletion(habits, marks, date);
    count[wd] += 1;
  }
  return sum.map((s, wd) => ({
    weekday: wd,
    rate: count[wd] === 0 ? 0 : Math.round(s / count[wd]),
  }));
}

// The most-missed habit over a range (for "needs attention" insights).
export function mostMissedHabit(
  habits: Habit[],
  marks: Marks,
  from: Date,
  to: Date,
): { habit: Habit; missed: number } | null {
  let worst: { habit: Habit; missed: number } | null = null;
  for (const h of habits) {
    const { missed } = rangeCompletion([h], marks, from, to);
    if (missed > 0 && (!worst || missed > worst.missed)) worst = { habit: h, missed };
  }
  return worst;
}
