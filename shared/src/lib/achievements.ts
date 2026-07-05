// Achievement engine. Everything here is DERIVED from the immutable mark
// history — nothing is stored — so achievements can't be cheated. The store
// persists only which ones have been unlocked (for one-time popups).
//
// `buildGameStats` walks the history once into a compact context; each
// achievement reads a single metric off that context and unlocks when it
// reaches its target. XP and titles build on these results.

import type {
  AchievementDef,
  AchievementCategory,
  Marks,
  Rarity,
} from "./types";
import { CATEGORIES, type Category } from "./categories";
import type { Habit } from "./types";
import { addDays, dateKey, startOfDay } from "./date";
import {
  dayCompletion,
  habitStreaks,
  habitStartDay,
  isScheduled,
} from "./stats";

const EARLY_BEFORE = "08:00";
const NIGHT_AFTER = "21:00";

// Compact, history-derived context every achievement (and XP) reads from.
export interface GameStats {
  doneCount: number;
  missedCount: number;
  perCategoryDone: Record<Category, number>;
  earlyDone: number;
  nightDone: number;
  maxBestStreak: number;
  maxCurrentStreak: number;
  perfectDays: number;
  longestPerfectRun: number;
  weekendPerfectDays: number;
  habitsCreated: number;
  anyMissed: boolean;
  // Track whether a miss was ever FOLLOWED by a 7+ streak (the "comeback"
  // achievement). We walk backward from today: if we find a miss and later
  // find a 7+ streak after it, this flag is set.
  comebackAchieved: boolean;
}

function zeroByCategory(): Record<Category, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<
    Category,
    number
  >;
}

export function buildGameStats(
  habits: Habit[],
  marks: Marks,
  today: Date,
  frozen?: Set<string>,
): GameStats {
  const habitCat = new Map<string, Category>();
  const habitTime = new Map<string, string | undefined>();
  for (const h of habits) {
    habitCat.set(h.id, h.category);
    habitTime.set(h.id, h.timeOfDay);
  }

  let doneCount = 0;
  let missedCount = 0;
  let earlyDone = 0;
  let nightDone = 0;
  const perCategoryDone = zeroByCategory();

  for (const day of Object.values(marks)) {
    for (const [habitId, status] of Object.entries(day)) {
      if (status === "missed") {
        missedCount += 1;
        continue;
      }
      if (status !== "done") continue;
      doneCount += 1;
      const cat = habitCat.get(habitId);
      if (cat) perCategoryDone[cat] += 1;
      const time = habitTime.get(habitId);
      if (time && time < EARLY_BEFORE) earlyDone += 1;
      if (time && time >= NIGHT_AFTER) nightDone += 1;
    }
  }

  // Streaks across every habit (archived included — history is history).
  let maxBestStreak = 0;
  let maxCurrentStreak = 0;
  for (const h of habits) {
    const { current, best } = habitStreaks(h, marks, today, frozen);
    maxBestStreak = Math.max(maxBestStreak, best);
    maxCurrentStreak = Math.max(maxCurrentStreak, current);
  }

  // Perfect-day walk over all habits (archived included — their marks
  // are immutable history and past perfect days shouldn't retroactively
  // vanish when a habit is archived).
  let perfectDays = 0;
  let longestPerfectRun = 0;
  let weekendPerfectDays = 0;
  if (habits.length > 0) {
    const start = habits.reduce(
      (min, h) => Math.min(min, habitStartDay(h).getTime()),
      startOfDay(today).getTime(),
    );
    let run = 0;
    for (
      let d = new Date(start);
      d.getTime() <= startOfDay(today).getTime();
      d = addDays(d, 1)
    ) {
      const scheduled = habits.filter((h) => isScheduled(h, d));
      if (scheduled.length === 0) continue; // neutral day, doesn't break a run
      if (dayCompletion(habits, marks, d) === 100) {
        perfectDays += 1;
        run += 1;
        if (run > longestPerfectRun) longestPerfectRun = run;
        const wd = d.getDay();
        if (wd === 0 || wd === 6) weekendPerfectDays += 1;
      } else {
        run = 0;
      }
    }
  }

  return {
    doneCount,
    missedCount,
    perCategoryDone,
    earlyDone,
    nightDone,
    maxBestStreak,
    maxCurrentStreak,
    perfectDays,
    longestPerfectRun,
    weekendPerfectDays,
    habitsCreated: habits.length,
    anyMissed: missedCount > 0,
    // Walk per-habit history backward: if we find a miss and later find a
    // 7+ streak after it, the user *recovered* from a miss.
    comebackAchieved: (() => {
      for (const h of habits) {
        const { current } = habitStreaks(h, marks, today, frozen);
        // We need the current streak AND a past miss *before* today's streak started.
        // Simplified heuristic: if current streak >= 7 and there's any mark
        // before the current streak began, check if that mark was a miss.
        if (current < 7) continue;
        const end = startOfDay(today);
        const startMs = habitStartDay(h).getTime();
        let streakStart: Date | null = null;
        // Walk backward until we find the first non-done (that's where streak began)
        for (
          let d = new Date(end);
          d.getTime() >= startMs;
          d = addDays(d, -1)
        ) {
          if (!isScheduled(h, d)) continue;
          const key = dateKey(d);
          const status = marks[key]?.[h.id];
          if (status === "done" && streakStart === null) continue; // in streak
          if (status !== "done" && streakStart === null) {
            streakStart = d; // day the current streak started from
            break;
          }
        }
        if (!streakStart) continue;
        // The streak began the day after `streakStart`, so `streakStart` itself
        // is the break it recovered from. Scan from there (inclusive) back up to
        // 14 days for a real miss — otherwise the canonical "missed, then 7+ done"
        // comeback is skipped entirely.
        for (
          let d = streakStart, check = 0;
          check < 14;
          d = addDays(d, -1), check++
        ) {
          if (d.getTime() < startMs) break;
          if (!isScheduled(h, d)) continue;
          const key = dateKey(d);
          if (marks[key]?.[h.id] === "missed") return true;
        }
      }
      return false;
    })(),
  };
}

// Internal definition adds a metric selector to the public AchievementDef.
interface Def extends AchievementDef {
  metric: (s: GameStats) => number;
}

function def(
  id: string,
  name: string,
  description: string,
  category: AchievementCategory,
  rarity: Rarity,
  icon: string,
  target: number,
  metric: (s: GameStats) => number,
): Def {
  return { id, name, description, category, rarity, icon, target, metric };
}

const DEFS: Def[] = [
  // ---- Streak ----
  def(
    "streak-1",
    "First Day",
    "Complete a habit on a streak.",
    "streak",
    "common",
    "🔥",
    1,
    (s) => s.maxBestStreak,
  ),
  def(
    "streak-3",
    "Getting Warm",
    "Reach a 3-day streak.",
    "streak",
    "common",
    "🔥",
    3,
    (s) => s.maxBestStreak,
  ),
  def(
    "streak-7",
    "Weekly Warrior",
    "Reach a 7-day streak.",
    "streak",
    "rare",
    "🔥",
    7,
    (s) => s.maxBestStreak,
  ),
  def(
    "streak-14",
    "Fortnight Focus",
    "Reach a 14-day streak.",
    "streak",
    "rare",
    "🔥",
    14,
    (s) => s.maxBestStreak,
  ),
  def(
    "streak-30",
    "Monthly Master",
    "Reach a 30-day streak.",
    "streak",
    "epic",
    "🔥",
    30,
    (s) => s.maxBestStreak,
  ),
  def(
    "streak-50",
    "Unbreakable",
    "Reach a 50-day streak.",
    "streak",
    "epic",
    "🔥",
    50,
    (s) => s.maxBestStreak,
  ),
  def(
    "streak-100",
    "Century Flame",
    "Reach a 100-day streak.",
    "streak",
    "legendary",
    "🔥",
    100,
    (s) => s.maxBestStreak,
  ),
  def(
    "streak-365",
    "Year of Fire",
    "Reach a 365-day streak.",
    "streak",
    "legendary",
    "🔥",
    365,
    (s) => s.maxBestStreak,
  ),

  // ---- Completion (lifetime done marks) ----
  def(
    "done-1",
    "First Habit",
    "Complete your first habit.",
    "completion",
    "common",
    "✅",
    1,
    (s) => s.doneCount,
  ),
  def(
    "done-10",
    "Getting Going",
    "Complete 10 habits.",
    "completion",
    "common",
    "✅",
    10,
    (s) => s.doneCount,
  ),
  def(
    "done-50",
    "Half Hundred",
    "Complete 50 habits.",
    "completion",
    "rare",
    "✅",
    50,
    (s) => s.doneCount,
  ),
  def(
    "done-100",
    "Centurion",
    "Complete 100 habits.",
    "completion",
    "epic",
    "✅",
    100,
    (s) => s.doneCount,
  ),
  def(
    "done-500",
    "Relentless",
    "Complete 500 habits.",
    "completion",
    "epic",
    "✅",
    500,
    (s) => s.doneCount,
  ),
  def(
    "done-1000",
    "Habit Machine",
    "Complete 1000 habits.",
    "completion",
    "legendary",
    "✅",
    1000,
    (s) => s.doneCount,
  ),

  // ---- Consistency (perfect runs) ----
  def(
    "perfect-week",
    "Perfect Week",
    "Complete every habit for 7 days straight.",
    "consistency",
    "rare",
    "🌟",
    7,
    (s) => s.longestPerfectRun,
  ),
  def(
    "perfect-month",
    "Perfect Month",
    "Complete every habit for 30 days straight.",
    "consistency",
    "legendary",
    "🌟",
    30,
    (s) => s.longestPerfectRun,
  ),
  def(
    "perfect-days-10",
    "Spotless",
    "Rack up 10 perfect days.",
    "consistency",
    "rare",
    "🌟",
    10,
    (s) => s.perfectDays,
  ),
  def(
    "perfect-days-50",
    "Flawless",
    "Rack up 50 perfect days.",
    "consistency",
    "epic",
    "🌟",
    50,
    (s) => s.perfectDays,
  ),

  // ---- Category mastery ----
  def(
    "cat-workout",
    "Fitness Master",
    "50 completions in Workout.",
    "category",
    "rare",
    "💪",
    50,
    (s) => s.perCategoryDone.Workout,
  ),
  def(
    "cat-studies",
    "Learning Champion",
    "50 completions in Studies.",
    "category",
    "rare",
    "📚",
    50,
    (s) => s.perCategoryDone.Studies,
  ),
  def(
    "cat-work",
    "Productivity Expert",
    "50 completions in Work.",
    "category",
    "rare",
    "⚡",
    50,
    (s) => s.perCategoryDone.Work,
  ),
  def(
    "cat-health",
    "Mindfulness Practitioner",
    "50 completions in Health.",
    "category",
    "rare",
    "🧘",
    50,
    (s) => s.perCategoryDone.Health,
  ),

  // ---- Special ----
  def(
    "early-bird",
    "Early Bird",
    "Complete 10 habits scheduled before 8 AM.",
    "special",
    "rare",
    "🌅",
    10,
    (s) => s.earlyDone,
  ),
  def(
    "night-owl",
    "Night Owl",
    "Complete 10 habits scheduled after 9 PM.",
    "special",
    "rare",
    "🌙",
    10,
    (s) => s.nightDone,
  ),
  def(
    "weekend-warrior",
    "Weekend Warrior",
    "Have 4 perfect weekend days.",
    "special",
    "epic",
    "🏖️",
    4,
    (s) => s.weekendPerfectDays,
  ),
  def(
    "comeback-king",
    "Comeback King",
    "Recover from a miss to a 7-day streak.",
    "special",
    "epic",
    "👑",
    1,
    (s) => (s.comebackAchieved ? 1 : 0),
  ),
  def(
    "habit-collector",
    "Habit Collector",
    "Create 10 habits.",
    "special",
    "common",
    "🗂️",
    10,
    (s) => s.habitsCreated,
  ),
  def(
    "habit-master",
    "Habit Master",
    "Reach a 100-day streak with a deep history.",
    "special",
    "legendary",
    "🏆",
    1,
    (s) => (s.maxBestStreak >= 100 && s.doneCount >= 500 ? 1 : 0),
  ),
];

// Public, serializable definitions (drops the internal metric selector).
export const ACHIEVEMENTS: AchievementDef[] = DEFS.map((d) => ({
  id: d.id,
  name: d.name,
  description: d.description,
  category: d.category,
  rarity: d.rarity,
  icon: d.icon,
  target: d.target,
}));

export interface AchievementProgress {
  def: AchievementDef;
  current: number;
  target: number;
  unlocked: boolean;
  progressPct: number; // 0–100, clamped
}

// Evaluate every achievement against the given stats context.
export function evaluateAchievements(stats: GameStats): AchievementProgress[] {
  return DEFS.map((d) => {
    const current = Math.max(0, d.metric(stats));
    const unlocked = current >= d.target;
    const progressPct = Math.min(100, Math.round((current / d.target) * 100));
    return { def: d, current, target: d.target, unlocked, progressPct };
  });
}

export const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};
