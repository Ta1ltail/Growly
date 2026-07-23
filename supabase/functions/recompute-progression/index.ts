// ═══════════════════════════════════════════════════════════════════════════
// recompute-progression — Supabase Edge Function
// ═══════════════════════════════════════════════════════════════════════════
//
// Called after the client pushes habits/marks to Supabase. Reads the user's
// raw data, recomputes all derived state (achievements, XP, level, stats
// snapshot), and writes the results to the unlocks and user_stats_snapshots
// tables.
//
// Uses the service_role key (via SUPABASE_SERVICE_ROLE_KEY env var) to bypass
// RLS, since the authenticated role no longer has INSERT/UPDATE on these tables
// (migration 008).
//
// The client still computes the same values locally for instant UI feedback.
// This function ensures the server-side "truth" matches what the client shows,
// preventing users from granting themselves achievements or leaderboard rank
// via direct Supabase SDK calls.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface Habit {
  id: string;
  user_id: string;
  name: string;
  category: string;
  repeat_days: number[];
  created_at: string;
  recurrence: { kind: "daily" | "weekly" | "monthly"; weekdays?: number[]; monthDays?: number[] } | null;
  start_date: string | null;
  time_of_day: string | null;
  priority: string | null;
  archived: boolean;
  reminder: unknown | null;
}

interface Mark {
  id: string;
  user_id: string;
  date_key: string;
  habit_id: string;
  status: "done" | "missed" | "skipped";
}

type MarksByDate = Record<string, Record<string, "done" | "missed" | "skipped">>;
type Rarity = "common" | "rare" | "epic" | "legendary";

// ── Date helpers ──
import { startOfDay, addDays, dateKey, parseDateKey } from "../_shared/date.ts";

// ── Schedule helpers ──

function effectiveRecurrence(habit: Habit): { kind: "daily" | "weekly" | "monthly"; weekdays?: number[]; monthDays?: number[] } {
  if (habit.recurrence) return habit.recurrence;
  return habit.repeat_days.length === 0
    ? { kind: "daily" }
    : { kind: "weekly", weekdays: habit.repeat_days };
}

function habitStartDay(habit: Habit): Date {
  if (habit.start_date) return startOfDay(parseDateKey(habit.start_date));
  return startOfDay(new Date(habit.created_at));
}

function isScheduled(habit: Habit, date: Date): boolean {
  if (startOfDay(date).getTime() < habitStartDay(habit).getTime()) return false;
  const rec = effectiveRecurrence(habit);
  switch (rec.kind) {
    case "daily": return true;
    case "weekly": return rec.weekdays!.length === 0 || rec.weekdays!.includes(date.getDay());
    case "monthly": return rec.monthDays!.length === 0
        ? date.getDate() === habitStartDay(habit).getDate()
        : rec.monthDays!.includes(date.getDate());
  }
}

// ── Stat computation ──

function consistencyScore(habits: Habit[], marks: MarksByDate, today: Date, days: number): number {
  let weighted = 0;
  let weight = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i);
    const scheduled = habits.filter((h) => isScheduled(h, date));
    if (scheduled.length === 0) continue;
    const w = 1 + (days - i) / days;
    const key = dateKey(date);
    const done = scheduled.filter((h) => marks[key]?.[h.id] === "done").length;
    const rate = Math.round((done / scheduled.length) * 100);
    weighted += rate * w;
    weight += w;
  }
  return weight === 0 ? 0 : Math.round(weighted / weight);
}

// Streak computation (simplified — current + best per habit)
function computeStreaks(habits: Habit[], marks: MarksByDate, today: Date) {
  let maxBestStreak = 0;
  let maxCurrentStreak = 0;

  for (const habit of habits) {
    const start = habitStartDay(habit);
    const end = startOfDay(today);
    const startMs = start.getTime();
    const endMs = end.getTime();
    let best = 0;
    let run = 0;
    let current = 0;
    let currentBroken = false;

    // Forward walk for best streak
    for (let d = new Date(start); d.getTime() <= endMs; d = addDays(d, 1)) {
      if (!isScheduled(habit, d)) continue;
      const key = dateKey(d);
      const status = marks[key]?.[habit.id];
      if (status === "done") {
        run += 1;
        best = Math.max(best, run);
      } else if (status !== "skipped") {
        run = 0;
      }
    }

    // Backward walk for current streak
    for (let d = new Date(end); d.getTime() >= startMs; d = addDays(d, -1)) {
      if (!isScheduled(habit, d)) continue;
      const key = dateKey(d);
      const status = marks[key]?.[habit.id];
      if (status === "done") {
        if (!currentBroken) current += 1;
      } else if (status === undefined && d.getTime() === endMs) {
        // unmarked today — still in progress
      } else if (status !== "skipped") {
        currentBroken = true;
      }
    }

    maxBestStreak = Math.max(maxBestStreak, best);
    maxCurrentStreak = Math.max(maxCurrentStreak, current);
  }

  return { maxBestStreak, maxCurrentStreak };
}

// Perfect days computation — also tracks longest consecutive perfect run
function computePerfectDays(habits: Habit[], marks: MarksByDate, today: Date): { perfectDays: number; longestPerfectRun: number } {
  if (habits.length === 0) return { perfectDays: 0, longestPerfectRun: 0 };
  const start = habits.reduce(
    (min, h) => Math.min(min, habitStartDay(h).getTime()),
    startOfDay(today).getTime(),
  );
  let perfectDays = 0;
  let longestPerfectRun = 0;
  let run = 0;
  for (let d = new Date(start); d.getTime() <= startOfDay(today).getTime(); d = addDays(d, 1)) {
    const scheduled = habits.filter((h) => isScheduled(h, d));
    if (scheduled.length === 0) continue;
    const key = dateKey(d);
    if (scheduled.every((h) => marks[key]?.[h.id] === "done")) {
      perfectDays += 1;
      run += 1;
      if (run > longestPerfectRun) longestPerfectRun = run;
    } else {
      run = 0;
    }
  }
  return { perfectDays, longestPerfectRun };
}

// XP computation
const XP_PER_COMPLETION = 10;
const XP_PER_PERFECT_DAY = 25;
const RARITY_XP: Record<Rarity, number> = { common: 25, rare: 75, epic: 200, legendary: 500 };
const MAX_LEVEL = 99;

function computeTotalXp(doneCount: number, perfectDays: number, unlockedRarities: Rarity[]): number {
  const base = doneCount * XP_PER_COMPLETION;
  const perfect = perfectDays * XP_PER_PERFECT_DAY;
  const fromAchievements = unlockedRarities.reduce((sum, r) => sum + RARITY_XP[r], 0);
  return base + perfect + fromAchievements;
}

function xpToAdvance(level: number): number {
  return Math.round(100 * Math.pow(level, 1.35));
}

function levelInfo(total: number) {
  let level = 1;
  let remaining = Math.max(0, Math.floor(total));
  while (level < MAX_LEVEL && remaining >= xpToAdvance(level)) {
    remaining -= xpToAdvance(level);
    level += 1;
  }
  const isMax = level >= MAX_LEVEL;
  const xpForNext = isMax ? 0 : xpToAdvance(level);
  const xpIntoLevel = isMax ? 0 : remaining;
  return { level, totalXp: total, xpIntoLevel, xpForNext, xpToNext: xpForNext - xpIntoLevel, isMax };
}

// Title computation
interface Title { name: string; rank: string; minLevel: number; }
const TITLES: Title[] = [
  { name: "Habit Newbie", rank: "Beginner", minLevel: 1 },
  { name: "Getting Started", rank: "Beginner", minLevel: 2 },
  { name: "Procrastination Survivor", rank: "Beginner", minLevel: 3 },
  { name: "Consistency Apprentice", rank: "Intermediate", minLevel: 5 },
  { name: "Daily Grinder", rank: "Intermediate", minLevel: 7 },
  { name: "Momentum Builder", rank: "Intermediate", minLevel: 9 },
  { name: "Focus Seeker", rank: "Intermediate", minLevel: 11 },
  { name: "Discipline Warrior", rank: "Advanced", minLevel: 13 },
  { name: "Productivity Knight", rank: "Advanced", minLevel: 15 },
  { name: "Habit Specialist", rank: "Advanced", minLevel: 17 },
  { name: "Self-Mastery Candidate", rank: "Advanced", minLevel: 19 },
  { name: "Consistency Master", rank: "Expert", minLevel: 21 },
  { name: "Discipline Commander", rank: "Expert", minLevel: 25 },
  { name: "Habit Champion", rank: "Expert", minLevel: 29 },
  { name: "Elite Performer", rank: "Expert", minLevel: 33 },
  { name: "Gigachad", rank: "Legendary", minLevel: 36 },
  { name: "Unstoppable", rank: "Legendary", minLevel: 40 },
  { name: "Self-Mastery Legend", rank: "Legendary", minLevel: 45 },
  { name: "Habit Overlord", rank: "Legendary", minLevel: 50 },
  { name: "Legendary Achiever", rank: "Legendary", minLevel: 60 },
];

function titleForLevel(level: number): { name: string; rank: string } {
  let current = TITLES[0];
  for (const t of TITLES) {
    if (t.minLevel <= level) current = t;
    else break;
  }
  return { name: current.name, rank: current.rank };
}

const RANK_ICONS: Record<string, string> = {
  Beginner: "🌱", Intermediate: "⚔️", Advanced: "🛡️", Expert: "👑", Legendary: "🐉",
};

// Achievement definitions
interface AchievementDef {
  id: string; name: string; description: string; category: string;
  rarity: Rarity; icon: string; target: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: "streak-1", name: "First Day", description: "Complete a habit on a streak.", category: "streak", rarity: "common", icon: "🔥", target: 1 },
  { id: "streak-3", name: "Getting Warm", description: "Reach a 3-day streak.", category: "streak", rarity: "common", icon: "🔥", target: 3 },
  { id: "streak-7", name: "Weekly Warrior", description: "Reach a 7-day streak.", category: "streak", rarity: "rare", icon: "🔥", target: 7 },
  { id: "streak-14", name: "Fortnight Focus", description: "Reach a 14-day streak.", category: "streak", rarity: "rare", icon: "🔥", target: 14 },
  { id: "streak-30", name: "Monthly Master", description: "Reach a 30-day streak.", category: "streak", rarity: "epic", icon: "🔥", target: 30 },
  { id: "streak-50", name: "Unbreakable", description: "Reach a 50-day streak.", category: "streak", rarity: "epic", icon: "🔥", target: 50 },
  { id: "streak-100", name: "Century Flame", description: "Reach a 100-day streak.", category: "streak", rarity: "legendary", icon: "🔥", target: 100 },
  { id: "streak-365", name: "Year of Fire", description: "Reach a 365-day streak.", category: "streak", rarity: "legendary", icon: "🔥", target: 365 },
  { id: "done-1", name: "First Habit", description: "Complete your first habit.", category: "completion", rarity: "common", icon: "✅", target: 1 },
  { id: "done-10", name: "Getting Going", description: "Complete 10 habits.", category: "completion", rarity: "common", icon: "✅", target: 10 },
  { id: "done-50", name: "Half Hundred", description: "Complete 50 habits.", category: "completion", rarity: "rare", icon: "✅", target: 50 },
  { id: "done-100", name: "Centurion", description: "Complete 100 habits.", category: "completion", rarity: "epic", icon: "✅", target: 100 },
  { id: "done-500", name: "Relentless", description: "Complete 500 habits.", category: "completion", rarity: "epic", icon: "✅", target: 500 },
  { id: "done-1000", name: "Habit Machine", description: "Complete 1000 habits.", category: "completion", rarity: "legendary", icon: "✅", target: 1000 },
  { id: "perfect-week", name: "Perfect Week", description: "Complete every habit for 7 days straight.", category: "consistency", rarity: "rare", icon: "🌟", target: 7 },
  { id: "perfect-month", name: "Perfect Month", description: "Complete every habit for 30 days straight.", category: "consistency", rarity: "legendary", icon: "🌟", target: 30 },
  { id: "perfect-days-10", name: "Spotless", description: "Rack up 10 perfect days.", category: "consistency", rarity: "rare", icon: "🌟", target: 10 },
  { id: "perfect-days-50", name: "Flawless", description: "Rack up 50 perfect days.", category: "consistency", rarity: "epic", icon: "🌟", target: 50 },
  { id: "cat-workout", name: "Fitness Master", description: "50 completions in Workout.", category: "category", rarity: "rare", icon: "💪", target: 50 },
  { id: "cat-studies", name: "Learning Champion", description: "50 completions in Studies.", category: "category", rarity: "rare", icon: "📚", target: 50 },
  { id: "cat-work", name: "Productivity Expert", description: "50 completions in Work.", category: "category", rarity: "rare", icon: "⚡", target: 50 },
  { id: "cat-health", name: "Mindfulness Practitioner", description: "50 completions in Health.", category: "category", rarity: "rare", icon: "🧘", target: 50 },
  { id: "early-bird", name: "Early Bird", description: "Complete 10 habits scheduled before 8 AM.", category: "special", rarity: "rare", icon: "🌅", target: 10 },
  { id: "night-owl", name: "Night Owl", description: "Complete 10 habits scheduled after 9 PM.", category: "special", rarity: "rare", icon: "🌙", target: 10 },
  { id: "weekend-warrior", name: "Weekend Warrior", description: "Have 4 perfect weekend days.", category: "special", rarity: "epic", icon: "🏖️", target: 4 },
  { id: "comeback-king", name: "Comeback King", description: "Recover from a miss to a 7-day streak.", category: "special", rarity: "epic", icon: "👑", target: 1 },
  { id: "habit-collector", name: "Habit Collector", description: "Create 10 habits.", category: "special", rarity: "common", icon: "🗂️", target: 10 },
  { id: "habit-master", name: "Habit Master", description: "Reach a 100-day streak with 500+ completions.", category: "special", rarity: "legendary", icon: "🏆", target: 1 },
  // ── New achievements (v2.2.5) ──
  { id: "streak-21", name: "Three Weeks Strong", description: "Reach a 21-day streak.", category: "streak", rarity: "rare", icon: "🔥", target: 21 },
  { id: "streak-75", name: "Diamond Streak", description: "Reach a 75-day streak.", category: "streak", rarity: "epic", icon: "💎", target: 75 },
  { id: "streak-200", name: "Bicentennial Burn", description: "Reach a 200-day streak.", category: "streak", rarity: "legendary", icon: "🔥", target: 200 },
  { id: "done-250", name: "Quarter Kilo", description: "Complete 250 habits.", category: "completion", rarity: "rare", icon: "✅", target: 250 },
  { id: "done-2500", name: "Unstoppable Force", description: "Complete 2500 habits.", category: "completion", rarity: "legendary", icon: "✅", target: 2500 },
  { id: "done-5000", name: "Habit Legend", description: "Complete 5000 habits.", category: "completion", rarity: "legendary", icon: "🏅", target: 5000 },
  { id: "perfect-days-25", name: "Silver Streak", description: "Rack up 25 perfect days.", category: "consistency", rarity: "rare", icon: "🌟", target: 25 },
  { id: "perfect-days-100", name: "Century of Perfection", description: "Rack up 100 perfect days.", category: "consistency", rarity: "legendary", icon: "🌟", target: 100 },
  { id: "perfect-week-4", name: "Month of Excellence", description: "Complete 4 perfect weeks (28 days).", category: "consistency", rarity: "epic", icon: "📅", target: 28 },
  { id: "perfect-week-12", name: "Quarter Year Perfect", description: "Complete 12 perfect weeks (90 days).", category: "consistency", rarity: "legendary", icon: "🌟", target: 90 },
  { id: "cat-workout-200", name: "Fitness Legend", description: "200 completions in Workout.", category: "category", rarity: "epic", icon: "💪", target: 200 },
  { id: "cat-studies-200", name: "Scholar Supreme", description: "200 completions in Studies.", category: "category", rarity: "epic", icon: "📚", target: 200 },
  { id: "cat-work-200", name: "Work Wizard", description: "200 completions in Work.", category: "category", rarity: "epic", icon: "⚡", target: 200 },
  { id: "cat-health-200", name: "Wellness Guru", description: "200 completions in Health.", category: "category", rarity: "epic", icon: "🧘", target: 200 },
  { id: "cat-hobbies-50", name: "Creative Soul", description: "50 completions in Hobbies.", category: "category", rarity: "rare", icon: "🎨", target: 50 },
  { id: "cat-hobbies-200", name: "Renaissance Spirit", description: "200 completions in Hobbies.", category: "category", rarity: "epic", icon: "🎨", target: 200 },
  { id: "cat-personal-50", name: "Social Butterfly", description: "50 completions in Personal.", category: "category", rarity: "rare", icon: "🦋", target: 50 },
  { id: "cat-personal-200", name: "Community Pillar", description: "200 completions in Personal.", category: "category", rarity: "epic", icon: "🤝", target: 200 },
  { id: "early-bird-50", name: "Dawn Patrol", description: "Complete 50 habits scheduled before 8 AM.", category: "special", rarity: "epic", icon: "🌅", target: 50 },
  { id: "night-owl-50", name: "Night Hawk", description: "Complete 50 habits scheduled after 9 PM.", category: "special", rarity: "epic", icon: "🌙", target: 50 },
  { id: "missed-recovery-5", name: "Bounce Back", description: "Recover from 5 missed days.", category: "special", rarity: "epic", icon: "🔄", target: 1 },
  { id: "habit-creator-5", name: "Habit Architect", description: "Create 5 habits.", category: "special", rarity: "common", icon: "📐", target: 5 },
  { id: "habit-creator-20", name: "Garden of Habits", description: "Create 20 habits.", category: "special", rarity: "rare", icon: "🌳", target: 20 },
  { id: "habit-creator-50", name: "Habit Empire", description: "Create 50 habits.", category: "special", rarity: "epic", icon: "🏰", target: 50 },
  { id: "missed-zero-30", name: "Perfect Month (No Misses)", description: "Go 30 days without a single miss.", category: "special", rarity: "epic", icon: "✨", target: 30 },
  { id: "all-streak-7", name: "Full House", description: "Every active habit has a 7+ day streak.", category: "special", rarity: "epic", icon: "🃏", target: 1 },
];

// ── Main handler ──

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate via the request's Authorization header (user's JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a Supabase client with the user's auth context
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    // Verify the user and get their ID
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;
    const today = new Date();

    // Create a service-role client for writing to restricted tables
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // ══ Load raw data ══
    const [habitsRes, marksRes, existingUnlocksRes] = await Promise.all([
      supabaseClient.from("habits").select("*").eq("user_id", userId),
      supabaseClient.from("marks").select("date_key, habit_id, status").eq("user_id", userId),
      serviceClient.from("unlocks").select("achievement_id, at, seen").eq("user_id", userId),
    ]);

    if (habitsRes.error) throw new Error(`Failed to load habits: ${habitsRes.error.message}`);
    if (marksRes.error) throw new Error(`Failed to load marks: ${marksRes.error.message}`);

    const habits: Habit[] = habitsRes.data ?? [];
    const markRows: Mark[] = marksRes.data ?? [];

    // Build marks by date
    const marks: MarksByDate = {};
    for (const row of markRows) {
      if (!marks[row.date_key]) marks[row.date_key] = {};
      marks[row.date_key][row.habit_id] = row.status;
    }

    // Build existing unlocks map
    const existingUnlocks: Record<string, { at: string; seen: boolean }> = {};
    if (existingUnlocksRes.data) {
      for (const row of existingUnlocksRes.data) {
        existingUnlocks[row.achievement_id] = { at: row.at, seen: row.seen };
      }
    }

    // ══ Compute stats ══
    let doneCount = 0;
    for (const day of Object.values(marks)) {
      for (const status of Object.values(day)) {
        if (status === "done") doneCount++;
      }
    }

    const { maxBestStreak, maxCurrentStreak } = computeStreaks(habits, marks, today);
    const { perfectDays, longestPerfectRun } = computePerfectDays(habits, marks, today);
    const consistency14d = consistencyScore(habits, marks, today, 14);

    // ══ Compute achievements ══
    const existingRarities: Rarity[] = [];
    const newlyUnlocked: string[] = [];
    const nowIso = today.toISOString();
    const unlocksToWrite: Record<string, string> = {}; // achievement_id -> iso timestamp

    for (const def of ACHIEVEMENTS) {
      let current = 0;
      switch (def.id) {
        case "streak-1": case "streak-3": case "streak-7": case "streak-14":
        case "streak-30": case "streak-50": case "streak-100": case "streak-365":
        case "streak-21": case "streak-75": case "streak-200":
          current = maxBestStreak;
          break;
        case "done-1": case "done-10": case "done-50": case "done-100":
        case "done-500": case "done-1000":
        case "done-250": case "done-2500": case "done-5000":
          current = doneCount;
          break;
        case "perfect-week": case "perfect-month":
          current = longestPerfectRun;
          break;
        case "perfect-days-10": case "perfect-days-50":
        case "perfect-days-25": case "perfect-days-100":
          current = perfectDays;
          break;
        case "perfect-week-4": case "perfect-week-12":
          current = longestPerfectRun;
          break;
        case "cat-workout": case "cat-studies": case "cat-work": case "cat-health":
        case "cat-workout-200": case "cat-studies-200": case "cat-work-200": case "cat-health-200": {
          // Count per-category completions
          let catCount = 0;
          const targetCat = def.id.includes("workout") ? "Workout"
            : def.id.includes("studies") ? "Studies"
            : def.id.includes("work-200") || def.id === "cat-work" ? "Work"
            : "Health";
          for (const day of Object.values(marks)) {
            for (const [hId, status] of Object.entries(day)) {
              if (status !== "done") continue;
              const h = habits.find(h => h.id === hId);
              if (h?.category === targetCat) catCount++;
            }
          }
          current = catCount;
          break;
        }
        case "cat-hobbies-50": case "cat-hobbies-200": case "cat-personal-50": case "cat-personal-200": {
          let catCount = 0;
          const targetCat = def.id.includes("hobbies") ? "Hobbies" : "Personal";
          for (const day of Object.values(marks)) {
            for (const [hId, status] of Object.entries(day)) {
              if (status !== "done") continue;
              const h = habits.find(h => h.id === hId);
              if (h?.category === targetCat) catCount++;
            }
          }
          current = catCount;
          break;
        }
        case "early-bird": case "night-owl":
        case "early-bird-50": case "night-owl-50":
          current = 0;
          for (const h of habits) {
            if (!h.time_of_day) continue;
            const isEarly = h.time_of_day < "08:00";
            const isNight = h.time_of_day >= "21:00";
            if ((def.id.startsWith("early-bird") && isEarly) || (def.id.startsWith("night-owl") && isNight)) {
              for (const [, day] of Object.entries(marks)) {
                if (day[h.id] === "done") current++;
              }
            }
          }
          break;
        case "weekend-warrior": {
          current = 0;
          let weekendPerfectDays = 0;
          for (let d = new Date(habits.reduce((min, h) => Math.min(min, habitStartDay(h).getTime()), startOfDay(today).getTime()));
               d.getTime() <= startOfDay(today).getTime(); d = addDays(d, 1)) {
            const wd = d.getDay();
            if (wd !== 0 && wd !== 6) continue;
            const scheduled = habits.filter((h) => isScheduled(h, d));
            if (scheduled.length === 0) continue;
            const key = dateKey(d);
            if (scheduled.every((h) => marks[key]?.[h.id] === "done")) weekendPerfectDays++;
          }
          current = weekendPerfectDays;
          break;
        }
        case "comeback-king": {
          // Simplified: if any habit has current streak >= 7 and has a missed day before the streak
          current = 0;
          for (const h of habits) {
            const start = habitStartDay(h);
            const end = startOfDay(today);
            // Walk backward to find streak start
            let streakStart: Date | null = null;
            for (let d = new Date(end); d.getTime() >= start.getTime(); d = addDays(d, -1)) {
              if (!isScheduled(h, d)) continue;
              const key = dateKey(d);
              const status = marks[key]?.[h.id];
              if (status === "done" && streakStart === null) continue;
              if (status !== "done" && streakStart === null) { streakStart = d; break; }
            }
            if (!streakStart) continue;
          // Check if the streak length >= 7
          let streakLen = 0;
          const comebackEnd = startOfDay(today);
          for (let d = addDays(streakStart, 1); d.getTime() <= comebackEnd.getTime(); d = addDays(d, 1)) {
              if (!isScheduled(h, d)) continue;
              if (marks[dateKey(d)]?.[h.id] === "done") streakLen++;
              else break;
            }
            if (streakLen >= 7) {
              // Check if the streak start day was actually missed
              const preKey = dateKey(streakStart);
              if (marks[preKey]?.[h.id] === "missed") { current = 1; break; }
            }
          }
          break;
        }
        case "habit-collector":
        case "habit-creator-5": case "habit-creator-20": case "habit-creator-50":
          current = habits.length;
          break;
        case "habit-master":
          current = (maxBestStreak >= 100 && doneCount >= 500) ? 1 : 0;
          break;
        case "missed-recovery-5":
          // Same logic as comeback-king: server-side only checks if any comeback
          // happened. The client tracks multiple recoveries but that data isn't
          // available server-side. Both unlock at the same time.
          current = 0;
          for (const h of habits) {
            const start = habitStartDay(h);
            const end = startOfDay(today);
            let streakStart: Date | null = null;
            for (let d = new Date(end); d.getTime() >= start.getTime(); d = addDays(d, -1)) {
              if (!isScheduled(h, d)) continue;
              const key = dateKey(d);
              const status = marks[key]?.[h.id];
              if (status === "done" && streakStart === null) continue;
              if (status !== "done" && streakStart === null) { streakStart = d; break; }
            }
            if (!streakStart) continue;
            let streakLen = 0;
            const comebackEnd = startOfDay(today);
            for (let d = addDays(streakStart, 1); d.getTime() <= comebackEnd.getTime(); d = addDays(d, 1)) {
              if (!isScheduled(h, d)) continue;
              if (marks[dateKey(d)]?.[h.id] === "done") streakLen++;
              else break;
            }
            if (streakLen >= 7) {
              const preKey = dateKey(streakStart);
              if (marks[preKey]?.[h.id] === "missed") { current = 1; break; }
            }
          }
          break;
        case "missed-zero-30":
          current = longestPerfectRun;
          break;
        case "all-streak-7":
          current = maxBestStreak >= 7 ? 1 : 0;
          break;
      }

      const unlocked = current >= def.target;
      if (unlocked) {
        existingRarities.push(def.rarity);
        if (!existingUnlocks[def.id]) {
          newlyUnlocked.push(def.id);
          unlocksToWrite[def.id] = nowIso;
        }
      }
    }

    // ══ Compute XP and level ══
    const xp = computeTotalXp(doneCount, perfectDays, existingRarities);
    const level = levelInfo(xp);
    const title = titleForLevel(level.level);

    // ══ Write unlocks (only newly unlocked ones) ══
    const newUnlockEntries = Object.entries(unlocksToWrite).map(([achievementId, at]) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      achievement_id: achievementId,
      at,
      seen: false,
    }));

    if (newUnlockEntries.length > 0) {
      const { error: unlockErr } = await serviceClient
        .from("unlocks")
        .upsert(newUnlockEntries, { onConflict: "user_id,achievement_id" });
      if (unlockErr) console.error("[recompute] Failed to write unlocks:", unlockErr.message);
    }

    // ══ Write stats snapshot (with conflict detection) ══
    // Read the current updated_at before computing so we can detect if another
    // process (e.g., another device sync) modified the stats while we computed.
    const { data: existingStats } = await serviceClient
      .from("user_stats_snapshots")
      .select("updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    const statsSnapshot = {
      user_id: userId,
      level: level.level,
      current_streak: maxCurrentStreak,
      best_streak: maxBestStreak,
      total_completions: doneCount,
      consistency_14d: consistency14d,
      achievement_count: Object.keys(existingUnlocks).length + newUnlockEntries.length,
      title_name: title.name,
      rank_icon: RANK_ICONS[title.rank] ?? "🌱",
      updated_at: today.toISOString(),
    };

    const existingUpdatedAt = existingStats?.updated_at;
    if (existingUpdatedAt) {
      // Conditional update: only apply if no one else wrote since we read.
      // The `.eq("updated_at", existingUpdatedAt)` WHERE clause ensures the
      // write only succeeds when the stats haven't been modified by another
      // process (e.g., another device sync). If the clause doesn't match
      // (conflict), no rows are affected — the other process's data stays
      // intact and this write is silently skipped.
      const { error: statsErr } = await serviceClient
        .from("user_stats_snapshots")
        .update(statsSnapshot)
        .eq("user_id", userId)
        .eq("updated_at", existingUpdatedAt);
      if (statsErr) {
        console.error("[recompute] Failed to write stats:", statsErr.message);
      }
    } else {
      // No existing snapshot — first time or table cleaned. Use upsert to
      // create the initial record.
      const { error: statsErr } = await serviceClient
        .from("user_stats_snapshots")
        .upsert(statsSnapshot, { onConflict: "user_id" });
      if (statsErr) console.error("[recompute] Failed to write stats:", statsErr.message);
    }

    return new Response(JSON.stringify({
      success: true,
      level: level.level,
      xp,
      unlocks: newUnlockEntries.length,
      doneCount,
      perfectDays,
      maxBestStreak,
      maxCurrentStreak,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[recompute] Error:", e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
