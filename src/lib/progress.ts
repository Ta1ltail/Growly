// Progress façade: one call turns the raw history into everything the UI
// needs — stats, achievement progress, XP, level, title, and the next
// motivating milestone. Also reconciles the persisted unlock map.

import type { AppData, Unlocks } from "./types";
import {
  buildGameStats,
  evaluateAchievements,
  type AchievementProgress,
  type GameStats,
} from "./achievements";
import { levelInfo, totalXp, type LevelInfo } from "./xp";
import { titleForLevel, type TitleInfo } from "./titles";

export interface Milestone {
  label: string;
  current: number;
  target: number;
}

export interface ProgressSummary {
  stats: GameStats;
  achievements: AchievementProgress[];
  unlockedCount: number;
  totalCount: number;
  xp: number;
  level: LevelInfo;
  title: TitleInfo;
  nextMilestones: Milestone[];
}

// The closest locked achievement (by fewest remaining, among those started).
function nearestAchievement(achievements: AchievementProgress[]): Milestone | null {
  let best: AchievementProgress | null = null;
  for (const a of achievements) {
    if (a.unlocked) continue;
    const remaining = a.target - a.current;
    if (remaining <= 0) continue;
    if (!best || remaining < best.target - best.current) best = a;
  }
  if (!best) return null;
  return { label: `Until ${best.def.name}`, current: best.current, target: best.target };
}

export function summarizeProgress(data: AppData, today: Date): ProgressSummary {
  const stats = buildGameStats(data.habits, data.marks, today);
  const achievements = evaluateAchievements(stats);
  const unlocked = achievements.filter((a) => a.unlocked);
  const xp = totalXp(stats, unlocked.map((a) => a.def));
  const level = levelInfo(xp);
  const title = titleForLevel(level.level);

  const nextMilestones: Milestone[] = [];
  if (!level.isMax) {
    nextMilestones.push({
      label: `XP Until Level ${level.level + 1}`,
      current: level.xpIntoLevel,
      target: level.xpForNext,
    });
  }
  if (title.next && title.levelsToNext !== null) {
    nextMilestones.push({
      label: `Levels Until ${title.next.name}`,
      current: level.level,
      target: title.next.minLevel,
    });
  }
  const nearest = nearestAchievement(achievements);
  if (nearest) nextMilestones.push(nearest);

  return {
    stats,
    achievements,
    unlockedCount: unlocked.length,
    totalCount: achievements.length,
    xp,
    level,
    title,
    nextMilestones,
  };
}

// Fold newly-satisfied achievements into the persisted unlock map. Pure: hands
// back a fresh map plus the ids that just unlocked (for popups). Returns the
// SAME map reference when nothing changed, so callers can skip a write.
export function reconcileUnlocks(
  data: AppData,
  today: Date,
  nowIso: string,
): { unlocks: Unlocks; newlyUnlocked: string[] } {
  const stats = buildGameStats(data.habits, data.marks, today);
  const achievements = evaluateAchievements(stats);
  const newlyUnlocked: string[] = [];
  let next: Unlocks | null = null;

  for (const a of achievements) {
    if (!a.unlocked || data.unlocks[a.def.id]) continue;
    if (!next) next = { ...data.unlocks };
    next[a.def.id] = { at: nowIso, seen: false };
    newlyUnlocked.push(a.def.id);
  }

  return { unlocks: next ?? data.unlocks, newlyUnlocked };
}
