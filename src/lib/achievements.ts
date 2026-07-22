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
  habitStreaks,
  habitStartDay,
  isScheduled,
} from "./stats";

const EARLY_BEFORE = "08:00";
const NIGHT_AFTER = "21:00";

// Cache for buildGameStats results. Keyed on the marks object reference.
// Stores the date key so we don't return stale results across day boundaries.
// Only caches when frozen is empty (the common case). Invalidated when marks
// object reference changes (every cycleMark creates a new marks object).
const _statsCache = new WeakMap<
  Marks,
  { result: GameStats; dateKey: string; habitsLength: number }
>();

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
  // Number of separate recovery events (miss → 7+ streak) across all habits.
  comebackCount: number;
  // True when every non-archived habit has a current streak >= 7.
  activeHabitsAllStreak7: boolean;
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
  // Quick cache hit: same marks reference + same day + same habits count + no frozen entries
  if (!frozen || frozen.size === 0) {
    const todayKey = dateKey(today);
    const cached = _statsCache.get(marks);
    if (cached && cached.dateKey === todayKey && cached.habitsLength === habits.length) {
      return cached.result;
    }
  }
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
  // Computed once here and reused by the activeHabitsAllStreak7 check below.
  const streaksByHabit = new Map<string, { current: number; best: number }>();
  let maxBestStreak = 0;
  let maxCurrentStreak = 0;
  for (const h of habits) {
    const s = habitStreaks(h, marks, today, frozen);
    streaksByHabit.set(h.id, s);
    maxBestStreak = Math.max(maxBestStreak, s.best);
    maxCurrentStreak = Math.max(maxCurrentStreak, s.current);
  }

  // Comeback count: for each habit, walk forward and count every instance where
  // a "missed" mark is immediately followed by a 7+ day streak of "done" marks.
  let comebackCount = 0;
  for (const h of habits) {
    const start = habitStartDay(h);
    const end = startOfDay(today);
    const endMs = end.getTime();
    let streak = 0;
    let afterMiss = false;

    for (let d = new Date(start); d.getTime() <= endMs; d = addDays(d, 1)) {
      if (!isScheduled(h, d)) continue;
      const key = dateKey(d);
      const status = marks[key]?.[h.id];
      const isNeutral =
        status === "skipped" || (frozen?.has(`${h.id}@${key}`) ?? false);

      if (status === "done") {
        streak++;
        if (streak >= 7 && afterMiss) {
          comebackCount++;
          afterMiss = false; // Don't count this streak again
        }
      } else if (status === "missed") {
        streak = 0;
        afterMiss = true;
      } else if (isNeutral) {
        // neutral — streak continues without incrementing
      } else {
        // undefined (unmarked) on a scheduled day — breaks streak unless it's today
        if (d.getTime() < endMs) {
          streak = 0;
          // afterMiss remains true if a miss preceded this — the next streak
          // that follows could still be a recovery from the original miss.
        }
      }
    }
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
      const dKey = dateKey(d);
      if (scheduled.every((h) => marks[dKey]?.[h.id] === "done")) {
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

  // activeHabitsAllStreak7: every non-archived habit has a current streak >= 7.
  const activeHabits = habits.filter((h) => !h.archived);
  const activeHabitsAllStreak7 =
    activeHabits.length > 0 &&
    activeHabits.every(
      (h) => (streaksByHabit.get(h.id)?.current ?? 0) >= 7,
    );

  const result: GameStats = {
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
    comebackCount,
    activeHabitsAllStreak7,
  };

  // Cache the result (only when no frozen entries, which is the common case)
  if (!frozen || frozen.size === 0) {
    _statsCache.set(marks, {
      result,
      dateKey: dateKey(today),
      habitsLength: habits.length,
    });
  }

  return result;
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
    "Recover from a missed day with a 7+ day streak.",
    "special",
    "epic",
    "👑",
    1,
    (s) => Math.min(s.comebackCount, 1), // unlocks on first comeback
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

  // ══ New Achievements (25+) ══

  // ── Streak milestones ──
  def(
    "streak-21",
    "Three Weeks Strong",
    "Reach a 21-day streak.",
    "streak",
    "rare",
    "🔥",
    21,
    (s) => s.maxBestStreak,
  ),
  def(
    "streak-75",
    "Diamond Streak",
    "Reach a 75-day streak.",
    "streak",
    "epic",
    "💎",
    75,
    (s) => s.maxBestStreak,
  ),
  def(
    "streak-200",
    "Bicentennial Burn",
    "Reach a 200-day streak.",
    "streak",
    "legendary",
    "🔥",
    200,
    (s) => s.maxBestStreak,
  ),

  // ── Completion milestones ──
  def(
    "done-250",
    "Quarter Kilo",
    "Complete 250 habits.",
    "completion",
    "rare",
    "✅",
    250,
    (s) => s.doneCount,
  ),
  def(
    "done-2500",
    "Unstoppable Force",
    "Complete 2500 habits.",
    "completion",
    "legendary",
    "✅",
    2500,
    (s) => s.doneCount,
  ),
  def(
    "done-5000",
    "Habit Legend",
    "Complete 5000 habits.",
    "completion",
    "legendary",
    "🏅",
    5000,
    (s) => s.doneCount,
  ),

  // ── Consistency ──
  def(
    "perfect-days-25",
    "Silver Streak",
    "Rack up 25 perfect days.",
    "consistency",
    "rare",
    "🌟",
    25,
    (s) => s.perfectDays,
  ),
  def(
    "perfect-days-100",
    "Century of Perfection",
    "Rack up 100 perfect days.",
    "consistency",
    "legendary",
    "🌟",
    100,
    (s) => s.perfectDays,
  ),
  def(
    "perfect-week-4",
    "Month of Excellence",
    "Complete 4 perfect weeks (28 days).",
    "consistency",
    "epic",
    "📅",
    28,
    (s) => s.longestPerfectRun,
  ),
  def(
    "perfect-week-12",
    "Quarter Year Perfect",
    "Complete 12 perfect weeks (90 days).",
    "consistency",
    "legendary",
    "🌟",
    90,
    (s) => s.longestPerfectRun,
  ),

  // ── Category mastery (advanced tiers) ──
  def(
    "cat-workout-200",
    "Fitness Legend",
    "200 completions in Workout.",
    "category",
    "epic",
    "💪",
    200,
    (s) => s.perCategoryDone.Workout,
  ),
  def(
    "cat-studies-200",
    "Scholar Supreme",
    "200 completions in Studies.",
    "category",
    "epic",
    "📚",
    200,
    (s) => s.perCategoryDone.Studies,
  ),
  def(
    "cat-work-200",
    "Work Wizard",
    "200 completions in Work.",
    "category",
    "epic",
    "⚡",
    200,
    (s) => s.perCategoryDone.Work,
  ),
  def(
    "cat-health-200",
    "Wellness Guru",
    "200 completions in Health.",
    "category",
    "epic",
    "🧘",
    200,
    (s) => s.perCategoryDone.Health,
  ),
  def(
    "cat-hobbies-50",
    "Creative Soul",
    "50 completions in Hobbies.",
    "category",
    "rare",
    "🎨",
    50,
    (s) => s.perCategoryDone.Hobbies,
  ),
  def(
    "cat-hobbies-200",
    "Renaissance Spirit",
    "200 completions in Hobbies.",
    "category",
    "epic",
    "🎨",
    200,
    (s) => s.perCategoryDone.Hobbies,
  ),
  def(
    "cat-personal-50",
    "Social Butterfly",
    "50 completions in Personal.",
    "category",
    "rare",
    "🦋",
    50,
    (s) => s.perCategoryDone.Personal,
  ),
  def(
    "cat-personal-200",
    "Community Pillar",
    "200 completions in Personal.",
    "category",
    "epic",
    "🤝",
    200,
    (s) => s.perCategoryDone.Personal,
  ),

  // ── Special ──
  def(
    "early-bird-50",
    "Dawn Patrol",
    "Complete 50 habits scheduled before 8 AM.",
    "special",
    "epic",
    "🌅",
    50,
    (s) => s.earlyDone,
  ),
  def(
    "night-owl-50",
    "Night Hawk",
    "Complete 50 habits scheduled after 9 PM.",
    "special",
    "epic",
    "🌙",
    50,
    (s) => s.nightDone,
  ),
  def(
    "missed-recovery-5",
    "Bounce Back",
    "Recover from 5 missed days with 7+ day streaks.",
    "special",
    "epic",
    "🔄",
    5,
    (s) => s.comebackCount,
  ),
  def(
    "habit-creator-5",
    "Habit Architect",
    "Create 5 habits.",
    "special",
    "common",
    "📐",
    5,
    (s) => s.habitsCreated,
  ),
  def(
    "habit-creator-20",
    "Garden of Habits",
    "Create 20 habits.",
    "special",
    "rare",
    "🌳",
    20,
    (s) => s.habitsCreated,
  ),
  def(
    "habit-creator-50",
    "Habit Empire",
    "Create 50 habits.",
    "special",
    "epic",
    "🏰",
    50,
    (s) => s.habitsCreated,
  ),
  def(
    "missed-zero-30",
    "Perfect Month (No Misses)",
    "Go 30 days without a single miss.",
    "special",
    "epic",
    "✨",
    30,
    (s) => s.longestPerfectRun,
  ),
  def(
    "all-streak-7",
    "Full House",
    "Every active habit has a 7+ day streak.",
    "special",
    "epic",
    "🃏",
    1,
    (s) => (s.activeHabitsAllStreak7 ? 1 : 0),
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
