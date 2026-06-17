// The core data shapes for the whole app.
// Phase 1-3 store all of this in the browser (localStorage).
// In Phase 4 the same shapes move to the Supabase database.

import type { Category } from "./categories";
import type { ThemeSettings } from "./theme";

// How a habit can be marked for a given day.
// "none" is represented by the ABSENCE of a mark (keeps storage small).
export type MarkStatus = "done" | "missed" | "skipped";

export type Priority = "low" | "med" | "high";

// How often a habit recurs. Discriminated union keyed by `kind`.
//   daily   — every day (on/after startDate)
//   weekly  — on the listed weekdays (0=Sun..6=Sat); [] behaves like daily
//   monthly — on the listed days of the month (1..31); a day past the month's
//             length simply never matches that month.
export type Recurrence =
  | { kind: "daily" }
  | { kind: "weekly"; weekdays: number[] }
  | { kind: "monthly"; monthDays: number[] };

// Stored-only reminder (no OS notifications without a backend).
export interface Reminder {
  enabled: boolean;
  time?: string; // "HH:MM" 24h local
}

export interface Habit {
  id: string;
  name: string;
  category: Category;
  // LEGACY scheduling field, kept for back-compat and as the migration source
  // for `recurrence`. New code should read `recurrence` (with this as fallback).
  // Weekdays the habit repeats on: 0 = Sun ... 6 = Sat. Empty = every day.
  repeatDays: number[];
  createdAt: string; // ISO timestamp

  // ---- richer scheduling (all optional so older saved habits stay valid) ----
  recurrence?: Recurrence; // canonical schedule; absent => derive from repeatDays
  startDate?: string; // dateKey "YYYY-MM-DD"; absent => derive from createdAt
  timeOfDay?: string; // "HH:MM" — drives "upcoming by time" on Today
  reminder?: Reminder;
  priority?: Priority; // absent => treated as "med"
  archived?: boolean; // absent => false
}

// marks[dateKey][habitId] = status, where dateKey is "YYYY-MM-DD".
export type Marks = Record<string, Record<string, MarkStatus>>;

// A step toward a goal, unlocked when the goal's `current` reaches `at`.
export interface Milestone {
  id: string;
  title: string;
  at: number; // threshold on the goal's current value
  done: boolean;
}

// A bigger target the user works toward (e.g. "Workout 20 times this month").
export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  createdAt: string;

  // ---- richer goals (optional) ----
  category?: Category;
  deadline?: string; // dateKey
  linkedHabitIds?: string[];
  milestones?: Milestone[];
}

// What a note can be attached to.
export interface NoteLinks {
  date?: string; // dateKey
  habitId?: string;
  goalId?: string;
}

// A rich note. Body is Markdown text. (Replaces the old notes[dateKey]=string.)
export interface Note {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  body: string; // Markdown
  tags: string[];
  links: NoteLinks;
}

// Append-only audit trail for habit & schedule changes (Honest Tracking Policy).
export type AuditAction =
  | "habit.create"
  | "habit.edit"
  | "habit.delete"
  | "habit.archive"
  | "habit.unarchive"
  | "habit.duplicate"
  | "habit.schedule"
  | "shop.buy"
  | "freeze.use";

export interface AuditEntry {
  id: string;
  at: string; // ISO timestamp
  action: AuditAction;
  habitId?: string;
  summary: string; // human-readable, e.g. "Renamed 'Run' -> 'Morning run'"
  before?: unknown;
  after?: unknown;
}

// The value produced by the add/edit habit form (UI -> data bridge).
export interface HabitFormValue {
  name: string;
  category: Category;
  recurrence: Recurrence;
  repeatDays: number[];
  startDate?: string;
  timeOfDay?: string;
  priority: Priority;
  reminder?: Reminder;
}

export interface Settings {
  theme: ThemeSettings;
  graceHours?: number; // anti-cheat grace window; absent => DEFAULT_GRACE_HOURS
  usedTemplateIds?: string[]; // templates already applied (hidden unless re-enabled)
}

/* ---- Gamification (derived from immutable history) ----
 * XP, levels, streaks, titles, and achievement *progress* are all computed
 * from `marks`/`habits` by pure functions in lib/ — never stored — so they
 * can't be cheated (Honest Tracking). The only persisted gamification state
 * is which achievements have been unlocked (for one-time popups) and the
 * editable profile fields. */

export type Rarity = "common" | "rare" | "epic" | "legendary";

export type AchievementCategory =
  | "streak"
  | "completion"
  | "consistency"
  | "category"
  | "special";

// A static achievement definition (lives in code, not storage).
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: Rarity;
  icon: string; // emoji shown on the badge
  target: number; // threshold on the achievement's metric (for progress bars)
}

// Persisted unlock record — the only mutable gamification state.
export interface AchievementUnlock {
  at: string; // ISO timestamp the achievement was first satisfied
  seen: boolean; // has the unlock popup been shown?
}
export type Unlocks = Record<string, AchievementUnlock>;

/* ---- Economy (schema v4) ----
 * Coins, like XP, are DERIVED from the immutable history (see lib/economy.ts) —
 * never stored as a balance. The only persisted economy state is the
 * append-only spend ledger, owned/equipped cosmetics, and a dated freeze-use
 * log. Spendable balance = coinsEarned(history) − sum(ledger amounts). This
 * keeps earnings uncheatable (you can't grant yourself coins) while letting the
 * user spend, mirroring how `unlocks` is the one persisted gamification fact. */

// A single coin expenditure (append-only — never mutated or removed).
export interface SpendEntry {
  id: string;
  at: string; // ISO timestamp
  amount: number; // coins spent (positive)
  item: string; // catalog item id this paid for
}

// A use of a streak-freeze consumable. The targeted day stays a real "missed"
// mark in history (honest); the freeze only makes the streak walk treat it as
// neutral. Limited (max 1 / rolling 7 days) and audit-logged.
export interface FreezeEntry {
  id: string;
  at: string; // ISO timestamp the freeze was applied
  date: string; // dateKey "YYYY-MM-DD" of the protected day
  habitId: string; // the habit whose miss is protected
}

// Persisted economy state (the only mutable economy facts).
export interface Economy {
  spent: SpendEntry[]; // append-only ledger
  owned: string[]; // cosmetic catalog ids the user has bought
  equipped: Partial<Record<CosmeticSlot, string>>; // slot -> equipped item id
  freezes: FreezeEntry[]; // streak-freeze use log
}

// Cosmetic categories that can be equipped (one active per slot).
export type CosmeticSlot = "flame" | "confetti" | "accent";

export const DEFAULT_ECONOMY: Economy = {
  spent: [],
  owned: [],
  equipped: {},
  freezes: [],
};

/* ---- Celebration "seen" markers (schema v5) ----
 * Like `unlocks`, these are the ONLY persisted facts for non-achievement
 * celebrations (level-ups, new titles, shop unlocks, streak milestones). The
 * celebration queue itself is DERIVED each render by diffing current progress
 * against these markers (see lib/celebrations.ts) — nothing else is stored.
 * `seeded` is written once on first run so existing histories aren't re-fired. */
export interface ProgressSeen {
  seeded: boolean; // has the one-time baseline been written?
  level: number; // highest level already celebrated
  title: string; // last celebrated title name (TITLES[].name)
  shop: string[]; // shop item ids whose level-gate unlock was celebrated
  streaks: Record<string, number>; // habitId -> highest streak tier celebrated (7/30/100/365)
}

export const DEFAULT_PROGRESS_SEEN: ProgressSeen = {
  seeded: false,
  level: 1,
  title: "Habit Newbie",
  shop: [],
  streaks: {},
};

// Editable, user-owned profile (the "character page").
export interface Profile {
  displayName: string;
  username: string;
  bio?: string;
  motto?: string;
  avatar?: string; // data URL or preset id
  banner?: string; // preset id or color token
  showcaseBadgeId?: string; // achievement id to feature
}

export const DEFAULT_PROFILE: Profile = {
  displayName: "Justin",
  username: "justin",
  motto: "Small improvements every day lead to remarkable results.",
};

export interface AppData {
  version: number; // schema version (migration discriminator)
  habits: Habit[];
  marks: Marks;
  notes: Note[]; // CHANGED: was Record<dateKey, string>
  goals: Goal[];
  auditLog: AuditEntry[];
  settings: Settings;
  profile: Profile; // editable character profile (schema v3)
  unlocks: Unlocks; // achievementId -> unlock record (schema v3)
  economy: Economy; // coins ledger + cosmetics + freezes (schema v4)
  progressSeen: ProgressSeen; // celebration seen-markers (schema v5)
}
