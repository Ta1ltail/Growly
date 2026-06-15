// XP & leveling — fully derived from history. Total XP is a pure function of
// completed habits, perfect days, and the rarity of unlocked achievements, so
// it can never desync from the record or be inflated.

import type { AchievementDef, Rarity } from "./types";
import type { GameStats } from "./achievements";

export const XP_PER_COMPLETION = 10;
export const XP_PER_PERFECT_DAY = 25;

export const RARITY_XP: Record<Rarity, number> = {
  common: 25,
  rare: 75,
  epic: 200,
  legendary: 500,
};

// Total lifetime XP from the history-derived stats + currently-unlocked
// achievements (passed in so the caller evaluates them once).
export function totalXp(stats: GameStats, unlocked: AchievementDef[]): number {
  const base = stats.doneCount * XP_PER_COMPLETION;
  const perfect = stats.perfectDays * XP_PER_PERFECT_DAY;
  const fromAchievements = unlocked.reduce((sum, a) => sum + RARITY_XP[a.rarity], 0);
  return base + perfect + fromAchievements;
}

const MAX_LEVEL = 99;

// XP required to advance FROM `level` to `level + 1`. Smooth super-linear
// curve (~100, 255, 441, ... ) so early levels come fast and later ones slow.
export function xpToAdvance(level: number): number {
  return Math.round(100 * Math.pow(level, 1.35));
}

export interface LevelInfo {
  level: number;
  totalXp: number;
  xpIntoLevel: number; // XP earned toward the next level
  xpForNext: number; // XP needed to reach the next level
  xpToNext: number; // XP still remaining to next level
  progressPct: number; // 0–100 toward next level
  isMax: boolean;
}

// Resolve a total XP amount into a level and progress toward the next.
export function levelInfo(total: number): LevelInfo {
  const totalXp = Math.max(0, Math.floor(total));
  let level = 1;
  let remaining = totalXp;
  while (level < MAX_LEVEL && remaining >= xpToAdvance(level)) {
    remaining -= xpToAdvance(level);
    level += 1;
  }
  const isMax = level >= MAX_LEVEL;
  const xpForNext = isMax ? 0 : xpToAdvance(level);
  const xpIntoLevel = isMax ? 0 : remaining;
  const xpToNext = isMax ? 0 : xpForNext - xpIntoLevel;
  const progressPct = isMax ? 100 : Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100));
  return { level, totalXp, xpIntoLevel, xpForNext, xpToNext, progressPct, isMax };
}
