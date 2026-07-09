// Demo / stress data generators for Developer Mode. These build valid AppData
// (schema v4) so the normal load validators accept them and all derived
// gamification recomputes from the seeded history. App code may use
// Math.random freely (the no-random rule only applies to workflow scripts).

import type {
  AppData,
  Habit,
  Marks,
  MarkStatus,
  Goal,
  Note,
  SpendEntry,
  FreezeEntry,
} from "./types";
import { CATEGORIES, type Category } from "./categories";
import { ACHIEVEMENTS } from "./achievements";
import { addDays, dateKey } from "./date";
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

// ── Comprehensive seed: 50+ records per table ──

const EXTRA_HABITS: SeedShape[] = [
  { name: "Morning run", category: "Workout", repeatDays: [1, 3, 5] },
  { name: "Evening yoga", category: "Workout", repeatDays: [] },
  { name: "Push-ups", category: "Workout", repeatDays: [1, 2, 4, 6] },
  { name: "Stretching", category: "Workout", repeatDays: [] },
  { name: "Walk 10k steps", category: "Workout", repeatDays: [] },
  { name: "Swim laps", category: "Workout", repeatDays: [2, 4, 6] },
  { name: "Cycling", category: "Workout", repeatDays: [1, 3, 5, 6] },
  { name: "Weight training", category: "Workout", repeatDays: [1, 3, 5] },
  { name: "Read 30 min", category: "Hobbies", repeatDays: [] },
  { name: "Practice guitar", category: "Hobbies", repeatDays: [1, 2, 3, 4, 5] },
  { name: "Sketching", category: "Hobbies", repeatDays: [2, 4, 6] },
  { name: "Write journal", category: "Hobbies", repeatDays: [] },
  { name: "Photography", category: "Hobbies", repeatDays: [1, 3] },
  { name: "Learn piano", category: "Hobbies", repeatDays: [1, 2, 4, 5] },
  { name: "Gardening", category: "Hobbies", repeatDays: [1, 3, 6] },
  { name: "Cooking new recipe", category: "Hobbies", repeatDays: [3, 6] },
  { name: "Study session", category: "Studies", repeatDays: [1, 2, 3, 4, 5] },
  { name: "Read textbook", category: "Studies", repeatDays: [1, 2, 3, 4] },
  { name: "Practice coding", category: "Studies", repeatDays: [] },
  { name: "Review flashcards", category: "Studies", repeatDays: [1, 3, 5] },
  { name: "Language practice", category: "Studies", repeatDays: [] },
  { name: "Online course", category: "Studies", repeatDays: [2, 4] },
  { name: "Research paper", category: "Studies", repeatDays: [1, 3, 5] },
  { name: "Math exercises", category: "Studies", repeatDays: [2, 4, 6] },
  { name: "Drink water", category: "Health", repeatDays: [] },
  { name: "Meditate", category: "Health", repeatDays: [] },
  { name: "Take vitamins", category: "Health", repeatDays: [] },
  { name: "Sleep by 11pm", category: "Health", repeatDays: [] },
  { name: "No sugar day", category: "Health", repeatDays: [1, 3, 5] },
  { name: "Walk after lunch", category: "Health", repeatDays: [] },
  { name: "Eye exercises", category: "Health", repeatDays: [1, 2, 3, 4, 5] },
  { name: "Deep breathing", category: "Health", repeatDays: [] },
  { name: "Posture check", category: "Health", repeatDays: [] },
  { name: "Inbox zero", category: "Work", repeatDays: [1, 2, 3, 4, 5] },
  { name: "Plan tomorrow", category: "Work", repeatDays: [] },
  { name: "Review goals", category: "Work", repeatDays: [1] },
  { name: "Update CRM", category: "Work", repeatDays: [1, 2, 3, 4, 5] },
  { name: "Networking", category: "Work", repeatDays: [3] },
  { name: "Portfolio project", category: "Work", repeatDays: [6, 0] },
  { name: "Client follow-up", category: "Work", repeatDays: [1, 4] },
  { name: "Team standup", category: "Work", repeatDays: [1, 2, 3, 4, 5] },
  { name: "Documentation", category: "Work", repeatDays: [2, 5] },
  { name: "Code review", category: "Work", repeatDays: [1, 2, 3, 4] },
  { name: "Call family", category: "Personal", repeatDays: [0] },
  { name: "Message friend", category: "Personal", repeatDays: [] },
  { name: "Volunteer hour", category: "Personal", repeatDays: [6] },
  { name: "Date night", category: "Personal", repeatDays: [6] },
  { name: "Attend meetup", category: "Personal", repeatDays: [3] },
  { name: "Help colleague", category: "Personal", repeatDays: [2, 4] },
  { name: "Social media detox", category: "Personal", repeatDays: [0] },
  { name: "Write thank-you note", category: "Personal", repeatDays: [5] },
  { name: "Organize desk", category: "Work", repeatDays: [5] },
  { name: "Meal prep", category: "Health", repeatDays: [0] },
  { name: "Track expenses", category: "Work", repeatDays: [1] },
  { name: "Learn new tool", category: "Studies", repeatDays: [2, 5] },
  { name: "Mentor session", category: "Personal", repeatDays: [4] },
  { name: "Read industry news", category: "Work", repeatDays: [1, 3, 5] },
];

const GOAL_TEMPLATES: { title: string; target: number; category: Category }[] = [
  { title: "Run 100km this month", target: 100, category: "Workout" },
  { title: "Read 20 books", target: 20, category: "Hobbies" },
  { title: "Complete 50 study sessions", target: 50, category: "Studies" },
  { title: "Meditate 30 days straight", target: 30, category: "Health" },
  { title: "Finish online course", target: 1, category: "Studies" },
  { title: "Save $1000", target: 1000, category: "Work" },
  { title: "Write 50 journal entries", target: 50, category: "Hobbies" },
  { title: "Exercise 100 times", target: 100, category: "Workout" },
  { title: "Learn 500 new words", target: 500, category: "Studies" },
  { title: "Complete 20 coding projects", target: 20, category: "Work" },
  { title: "Read 30 research papers", target: 30, category: "Studies" },
  { title: "Practice guitar 60 hours", target: 60, category: "Hobbies" },
  { title: "Drink water daily for 90 days", target: 90, category: "Health" },
  { title: "Network with 50 people", target: 50, category: "Work" },
  { title: "Complete marathon training", target: 1, category: "Workout" },
  { title: "Finish 12 art pieces", target: 12, category: "Hobbies" },
  { title: "Attend 24 meetups", target: 24, category: "Personal" },
  { title: "Complete 40 yoga sessions", target: 40, category: "Workout" },
  { title: "Publish 12 blog posts", target: 12, category: "Work" },
  { title: "Volunteer 50 hours", target: 50, category: "Personal" },
  { title: "Complete 100 push-ups a day", target: 100, category: "Workout" },
  { title: "Read 52 articles", target: 52, category: "Work" },
  { title: "Practice language for 100 days", target: 100, category: "Studies" },
  { title: "Meditate 200 minutes", target: 200, category: "Health" },
  { title: "Complete 10K steps daily", target: 30, category: "Workout" },
  { title: "Cook 30 new recipes", target: 30, category: "Hobbies" },
  { title: "Organize 12 playdates", target: 12, category: "Personal" },
  { title: "Complete 50 code reviews", target: 50, category: "Work" },
  { title: "Finish 5 online courses", target: 5, category: "Studies" },
  { title: "Sleep by 11pm for 30 days", target: 30, category: "Health" },
];

const NOTE_TEMPLATES: string[] = [
  "Had a great morning run today. Felt energized and clear-headed.",
  "Read an interesting article about habit formation and dopamine responses.",
  "Studied calculus chapter 5 - derivatives are finally clicking.",
  "Drank 8 glasses of water today. Need to maintain this streak.",
  "Meditated for 15 minutes. Focus was better than yesterday.",
  "Cleared all work emails. Inbox zero feels amazing.",
  "Practiced guitar for 30 minutes. Learning new chords.",
  "Went for a walk during lunch break. Beautiful weather.",
  "Cooked a new pasta recipe. Turned out better than expected.",
  "Had a productive study session. Reviewed 3 chapters.",
  "Stretched for 10 minutes. Lower back feels better.",
  "Called mom today. Had a great conversation about the weekend plans.",
  "Tracked all expenses for the month. Staying within budget.",
  "Completed a challenging yoga session. Flexibility improving.",
  "Wrote in journal about goals for the next quarter.",
  "Read chapter 12 of 'Atomic Habits' - focus on systems not goals.",
  "Practiced Spanish on Duolingo for 20 minutes. 50 day streak!",
  "Had a great team meeting. Project is on track.",
  "Went swimming for 30 minutes. New personal record for laps.",
  "Reviewed and updated portfolio project. Added new features.",
  "Helped a colleague debug a tricky issue. Felt good to mentor.",
  "Did eye exercises during screen breaks. Less strain today.",
  "No sugar today. Cravings are getting easier to manage.",
  "Planned the week ahead. Goals are set and prioritized.",
  "Read 30 pages of 'Deep Work'. Key insight: schedule distractions.",
  "Practiced sketching for 20 minutes. Drawing perspective is improving.",
  "Completed a 5km run. Improving pace gradually.",
  "Had a great networking conversation at the meetup.",
  "Reviewed flashcards for 15 minutes. Retention improving.",
  "Went to bed by 11pm. Slept 7.5 hours - felt refreshed.",
];


/**
 * Generate a comprehensive seed dataset with 50+ records for each multi-record table.
 * Returns an AppData object with habits, marks, notes, goals, economy, and unlocks
 * populated with realistic data covering 45 days of history.
 */
export function makeComprehensiveSeedData(base: AppData, today: Date): AppData {
  const daysBack = 60;
  const startDate = dateKey(addDays(today, -daysBack));

  // 55 habits across all categories
  const habits: Habit[] = EXTRA_HABITS.map((h) => ({
    id: uid(),
    name: h.name,
    category: h.category,
    repeatDays: h.repeatDays,
    createdAt: new Date(addDays(today, -daysBack)).toISOString(),
    startDate,
    priority: pick(["low", "med", "high"] as const),
    recurrence:
      h.repeatDays.length === 0
        ? { kind: "daily" }
        : { kind: "weekly", weekdays: h.repeatDays },
  }));

  // Marks from 60 days of history for all habits
  const marks = buildHistory(habits, today, daysBack);

  // 50 notes with diverse content
  const notes: Note[] = Array.from({ length: 50 }, (_, i) => {
    const dayOffset = Math.floor(Math.random() * 45);
    const d = addDays(today, -dayOffset);
    const dateKeyStr = dateKey(d);
    const stamp = `${dateKeyStr}T${String(Math.floor(Math.random() * 14) + 6).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:00.000Z`;
    return {
      id: uid(),
      createdAt: stamp,
      updatedAt: stamp,
      body: NOTE_TEMPLATES[i % NOTE_TEMPLATES.length],
      tags: [pick(CATEGORIES).toLowerCase(), pick(["personal", "work", "health", "learning"])],
      links: { date: dateKeyStr },
    };
  });

  // 30 goals
  const goals: Goal[] = GOAL_TEMPLATES.map((g) => {
    const daysAgo = Math.floor(Math.random() * 30);
    return {
      id: uid(),
      title: g.title,
      target: g.target,
      current: Math.floor(Math.random() * g.target),
      createdAt: new Date(addDays(today, -daysAgo - 30)).toISOString(),
      category: g.category,
      deadline: dateKey(addDays(today, Math.floor(Math.random() * 60) + 30)),
      linkedHabitIds: habits.filter(() => Math.random() < 0.2).slice(0, 3).map((h) => h.id),
      milestones: g.target > 1 ? [
        { id: uid(), title: "25% done", at: Math.floor(g.target * 0.25), done: Math.random() < 0.4 },
        { id: uid(), title: "50% done", at: Math.floor(g.target * 0.5), done: Math.random() < 0.2 },
        { id: uid(), title: "75% done", at: Math.floor(g.target * 0.75), done: false },
      ] : undefined,
    };
  });

  // Unlock various achievements
  const unlocks: Record<string, { at: string; seen: boolean }> = {};
  // Unlock random achievements using real achievement IDs from ACHIEVEMENTS
  const unlockedAchievements = ACHIEVEMENTS.filter(() => Math.random() < 0.4);
  for (const a of unlockedAchievements) {
    const daysAgo = Math.floor(Math.random() * 30);
    unlocks[a.id] = {
      at: new Date(addDays(today, -daysAgo)).toISOString(),
      seen: Math.random() < 0.7,
    };
  }

  // Economy with spend ledger — using real shop item IDs
  const REAL_ITEMS = [
    "flame-azure", "flame-emerald", "flame-violet", "flame-gold",
    "flame-ice", "flame-lava", "flame-rainbow", "flame-solar",
    "confetti-mono", "confetti-neon", "confetti-fire", "confetti-pastel",
    "confetti-gold", "confetti-ocean",
    "accent-crimson", "accent-emerald", "accent-violet",
    "accent-pink", "accent-ocean",
  ];
  const spent: SpendEntry[] = Array.from({ length: 55 }, () => ({
    id: uid(),
    at: new Date(addDays(today, -Math.floor(Math.random() * 45))).toISOString(),
    amount: pick([50, 100, 150, 200, 250, 300, 500]),
    item: pick(REAL_ITEMS),
  }));

  // Some freezes used
  const freezes: FreezeEntry[] = Array.from({ length: 5 }, () => ({
    id: uid(),
    at: new Date(addDays(today, -Math.floor(Math.random() * 15))).toISOString(),
    date: dateKey(addDays(today, -Math.floor(Math.random() * 5) - 1)),
    habitId: pick(habits).id,
  }));

  return {
    ...base,
    habits,
    marks,
    notes,
    goals,
    unlocks,
    economy: {
      ...base.economy,
      spent,
      freezes,
      owned: REAL_ITEMS.slice(0, 4),
      equipped: { flame: REAL_ITEMS[0], confetti: "confetti-default", accent: "accent-default" },
      bonusCoins: 250,
    },
    progressSeen: {
      seeded: true,
      level: 3,
      title: "Habit Enthusiast",
      shop: [],
      streaks: {},
      tierUnlocks: ["common"],
    },
  };
}
