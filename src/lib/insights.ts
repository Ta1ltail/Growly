// Turns raw numbers into short, human, encouraging insights for the Today,
// Dashboard, and Statistics screens. Never shame-based (see docs/notes.txt).

import type { Habit, Marks } from "./types";
import { addDays } from "./storage";
import {
  categoryCompletion,
  completionByWeekday,
  consistencyScore,
  mostMissedHabit,
  rangeCompletion,
} from "./stats";

export type InsightTone = "good" | "info" | "warn";
export interface Insight {
  tone: InsightTone;
  text: string;
}

const WEEKDAY_NAMES = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
];

// Build up to `limit` insights, most useful first.
export function buildInsights(
  habits: Habit[],
  marks: Marks,
  today: Date,
  limit = 4,
): Insight[] {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) return [];

  const out: Insight[] = [];
  const monthFrom = addDays(today, -29);
  const month = rangeCompletion(active, marks, monthFrom, today);

  // Overall momentum.
  const consistency = consistencyScore(active, marks, today, 14);
  if (consistency >= 80) {
    out.push({
      tone: "good",
      text: `You're on a roll — ${consistency}% consistency over the last two weeks.`,
    });
  } else if (consistency >= 50) {
    out.push({
      tone: "info",
      text: `Steady progress: ${consistency}% consistency in the last 14 days.`,
    });
  } else if (month.scheduled > 0) {
    out.push({
      tone: "info",
      text: `One day at a time — ${consistency}% consistency so far. Small wins add up.`,
    });
  }

  // Best weekday.
  const byDay = completionByWeekday(active, marks, today, 28).filter(
    (d) => d.rate > 0,
  );
  if (byDay.length >= 2) {
    const best = byDay.reduce((a, b) => (b.rate > a.rate ? b : a));
    out.push({
      tone: "good",
      text: `${WEEKDAY_NAMES[best.weekday]} are your strongest day (${best.rate}% done).`,
    });
  }

  // Strongest category.
  const cats = categoryCompletion(active, marks, monthFrom, today).filter(
    (c) => c.rate > 0,
  );
  if (cats.length > 0 && cats[0].rate >= 60) {
    out.push({
      tone: "good",
      text: `${cats[0].category} is your most consistent category at ${cats[0].rate}%.`,
    });
  }

  // Needs attention (gentle).
  const worst = mostMissedHabit(active, marks, monthFrom, today);
  if (worst) {
    out.push({
      tone: "warn",
      text: `“${worst.habit.name}” slipped ${worst.missed} time${worst.missed === 1 ? "" : "s"} this month — worth a smaller goal?`,
    });
  }

  return out.slice(0, limit);
}

// A single encouraging line for the Today hero, based on today's progress.
export function todayHeadline(done: number, total: number): string {
  if (total === 0) return "Add a habit to start your day.";
  if (done === total) return `Perfect day — all ${total} done. 🎉`;
  if (done === 0) return "A fresh start. Pick one to begin.";
  const left = total - done;
  if (done / total >= 0.5) return `Great pace — just ${left} to go.`;
  return `${done} done so far. You've got this.`;
}
