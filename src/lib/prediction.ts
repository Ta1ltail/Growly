// Prediction engine — estimates future stats based on past performance.
// Uses simple linear trends and moving averages. No ML, just pragmatic math.
//
// Functions are pure and framework-free so they can be tested and imported
// from anywhere.

import type { Habit, Marks } from "./types";
import { addDays } from "./storage";
import { dayCompletion, isScheduled } from "./stats";

// Predict completion rate for the next `days` days based on that many days of
// recent history (moving average with trend adjustment).
export function predictedCompletion(
  habits: Habit[],
  marks: Marks,
  today: Date,
  days = 7,
): number {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) return 0;

  // Get last N days of completion rates
  const rates: number[] = [];
  for (let i = days; i >= 1; i--) {
    const d = addDays(today, -i);
    const r = dayCompletion(active, marks, d);
    const anyScheduled = active.some((h) => isScheduled(h, d));
    if (r > 0 || anyScheduled) rates.push(r);
  }
  if (rates.length === 0) return 50; // default to 50% for new users

  // Simple moving average of recent rates
  const avg = rates.reduce((s, r) => s + r, 0) / rates.length;

  // Slight trend adjustment (last 3 days weighted more)
  const recent3 = rates.slice(-3);
  const recentAvg = recent3.reduce((s, r) => s + r, 0) / recent3.length;
  const trend = recentAvg - avg;

  // Blend: 70% overall average + 30% trend-adjusted
  const predicted = avg + trend * 0.3;

  return Math.max(0, Math.min(100, Math.round(predicted)));
}

// Estimate how many days until the next level-up.
export function estimatedDaysToNextLevel(
  xpPerDay: number,
  xpNeeded: number,
): number | null {
  if (xpPerDay <= 0) return null;
  return Math.ceil(xpNeeded / xpPerDay);
}

// Predict the user's streak in `days` days based on current rate.
export function predictedStreak(
  habits: Habit[],
  marks: Marks,
  today: Date,
  days = 30,
): number {
  const rate = predictedCompletion(habits, marks, today);
  if (rate <= 0) return 0;
  // Expected streak length = probability of consecutive days at this rate
  // Simplified: if you complete at rate R, expected streak = 1/(1-R) capped at days
  const prob = rate / 100;
  if (prob <= 0) return 0;
  const expected = Math.round(1 / (1 - prob));
  return Math.min(expected, days);
}

// Weekly projection summary.
export interface WeeklyProjection {
  estimatedCompletion: number; // %
  estimatedStreak: number;
  estimatedDaysToNextLevel: number | null;
  trend: "up" | "down" | "stable";
}

export function weeklyProjection(
  habits: Habit[],
  marks: Marks,
  today: Date,
  xpPerDay: number,
  xpNeeded: number,
): WeeklyProjection {
  const estimatedCompletion = predictedCompletion(habits, marks, today);
  const estimatedStreak = predictedStreak(habits, marks, today, 7);
  const daysToNextLevel = estimatedDaysToNextLevel(xpPerDay, xpNeeded);

  // Determine trend from last 7 days vs previous 7
  const active = habits.filter((h) => !h.archived);
  const recentRates: number[] = [];
  const olderRates: number[] = [];
  for (let i = 14; i >= 1; i--) {
    const d = addDays(today, -i);
    const r = dayCompletion(active, marks, d);
    if (i <= 7) olderRates.push(r);
    else recentRates.push(r);
  }
  const recentAvg = recentRates.length > 0 ? recentRates.reduce((s, r) => s + r, 0) / recentRates.length : 0;
  const olderAvg = olderRates.length > 0 ? olderRates.reduce((s, r) => s + r, 0) / olderRates.length : 0;

  const diff = recentAvg - olderAvg;
  const trend: "up" | "down" | "stable" = diff > 5 ? "up" : diff < -5 ? "down" : "stable";

  return { estimatedCompletion, estimatedStreak, estimatedDaysToNextLevel: daysToNextLevel, trend };
}
