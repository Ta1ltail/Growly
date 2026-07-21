import type { Category } from "./categories";
import type { ThemeSettings } from "./theme";

export type MarkStatus = "done" | "missed" | "skipped";

export type Priority = "low" | "med" | "high";

// daily | weekly (0=Sun..6=Sat, [] = daily) | monthly (1..31, skips if past month length)
export type Recurrence =
  | { kind: "daily" }
  | { kind: "weekly"; weekdays: number[] }
  | { kind: "monthly"; monthDays: number[] };

interface Reminder {
  enabled: boolean;
  time?: string; // "HH:MM" 24h local
}

export interface Habit {
  id: string;
  name: string;
  category: Category;
  repeatDays: number[];
  createdAt: string; // ISO timestamp

  // ---- richer scheduling (all optional so older saved habits stay valid) ----
  recurrence?: Recurrence; // canonical schedule; absent => derive from repeatDays
  startDate?: string; // dateKey "YYYY-MM-DD"; absent => derive from createdAt
  timeOfDay?: string; // "HH:MM" — drives "upcoming by time" on Today
  reminder?: Reminder;
  priority?: Priority; // absent => treated as "med"
  archived?: boolean; // absent => false
  deletedAt?: string; // ISO timestamp of soft-delete (schema v7)
}

export type Marks = Record<string, Record<string, MarkStatus>>;

// A goal milestone unlocked when goal.current reaches `at`.
export interface Milestone {
  id: string;
  title: string;
  at: number; // threshold on the goal's current value
  done: boolean;
}

// A target the user works toward.
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
  deletedAt?: string; // ISO timestamp of soft-delete (schema v7)
}

// What a note can link to.
export interface NoteLinks {
  date?: string; // dateKey
  habitId?: string;
  goalId?: string;
}

// A rich note with Markdown body.
export interface Note {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  body: string; // Markdown
  tags: string[];
  links: NoteLinks;
  deletedAt?: string; // ISO timestamp of soft-delete (schema v7)
}

// Append-only audit trail for habit & schedule changes.
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

// Add/edit habit form state.
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

interface Settings {
  theme: ThemeSettings;
  graceHours?: number; // anti-cheat grace window; absent => DEFAULT_GRACE_HOURS
  usedTemplateIds?: string[]; // templates already applied (hidden unless re-enabled)
  widgetOrder?: string[]; // ordered widget IDs for dashboard reordering
  onboardingComplete?: boolean; // has the user completed onboarding?
  customCategories?: string[]; // user-defined habit categories
  autoFreezeThreshold?: number; // auto-apply streak freeze when streak >= this (0=off)
  reducedMotion?: boolean; // disable animations for better mobile performance
}

/* Gamification is derived from history, never stored (anti-cheat).
   Only persisted state: unlock records + profile fields. */

export type Rarity = "common" | "rare" | "epic" | "legendary";

export type AchievementCategory =
  | "streak"
  | "completion"
  | "consistency"
  | "category"
  | "special";

// Static achievement definition.
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: Rarity;
  icon: string; // emoji shown on the badge
  target: number; // threshold on the achievement's metric (for progress bars)
}

// Persisted unlock record.
interface AchievementUnlock {
  at: string; // ISO timestamp the achievement was first satisfied
  seen: boolean; // has the unlock popup been shown?
}
export type Unlocks = Record<string, AchievementUnlock>;

/* Economy: coins are derived from history, never stored as a balance.
   Persisted: spend ledger + cosmetics + freeze log. */

// Single coin expenditure (append-only).
export interface SpendEntry {
  id: string;
  at: string; // ISO timestamp
  amount: number; // coins spent (positive)
  item: string; // catalog item id this paid for
}

// Streak-freeze use. Miss stays in history; freeze makes streak walk treat as neutral.
export interface FreezeEntry {
  id: string;
  at: string; // ISO timestamp the freeze was applied
  date: string; // dateKey "YYYY-MM-DD" of the protected day
  habitId: string; // the habit whose miss is protected
}

// A single engagement reward (check-in, quest, spin, level-up, streak milestone).
// Stored as individual rows with UNIQUE(user_id, type, date_key) to prevent
// multi-device offline duplicate rewards (economy_state.bonusCoins alone can
// be overwritten by last-writer-wins on user_id).
export interface BonusEntry {
  id: string;
  type: "check_in" | "quest" | "spin" | "level_up" | "streak_milestone";
  dateKey: string; // YYYY-MM-DD
  amount: number; // coins awarded
  at: string; // ISO timestamp
}

// Persisted economy state.
export interface Economy {
  spent: SpendEntry[]; // append-only ledger
  owned: string[]; // cosmetic catalog ids the user has bought
  equipped: Partial<Record<CosmeticSlot, string>>; // slot -> equipped item id
  freezes: FreezeEntry[]; // streak-freeze use log

  // Per-day engagement rewards, each stored as a row with UNIQUE(user_id, type, date_key)
  // so multi-device offline conflicts cannot double-claim or lose rewards.
  bonuses: BonusEntry[];

  // Engagement features (schema v6) — bonusCoins kept for backward compat during migration
  bonusCoins: number; // total bonus coins earned from engagement rewards
  lastCheckIn: string | null; // dateKey of last daily check-in
  checkInStreak: number; // consecutive daily check-in count
  lastQuestDate: string | null; // dateKey of last quest generated
  currentQuest: DailyQuest | null;
  lastSpinDate: string | null; // dateKey of last daily spin
  lastSpinResult: { label: string; amount: number; isFreeze: boolean; originalLabel?: string } | null; // last spin reward
}

// Daily challenge generated once per day.
export interface DailyQuest {
  description: string;
  target: number;
  current: number;
  reward: number;
  category?: Category; // if set, only habits in this category count
  claimed?: boolean; // true once the reward has been collected (card stays visible)
}

export const DEFAULT_ECONOMY: Economy = {
  spent: [],
  owned: [],
  equipped: {},
  freezes: [],
  bonuses: [],
  bonusCoins: 0,
  lastCheckIn: null,
  checkInStreak: 0,
  lastQuestDate: null,
  currentQuest: null,
  lastSpinDate: null,
  lastSpinResult: null,
};

// Equippable cosmetic categories.
export type CosmeticSlot = "flame" | "confetti" | "accent";

/* Celebration seen-markers (schema v5) — only persisted facts for non-achievement
   celebrations. Queue is derived by diffing progress against these markers. */
export interface ProgressSeen {
  seeded: boolean; // has the one-time baseline been written?
  level: number; // highest level already celebrated
  title: string; // last celebrated title name (TITLES[].name)
  shop: string[]; // shop item ids whose level-gate unlock was celebrated
  streaks: Record<string, number>; // habitId -> highest streak tier celebrated (7/30/100/365)
  tierUnlocks: string[]; // rarity tiers celebrated as milestones ("common","rare","epic","legendary")
  completedGoals: string[]; // goal IDs whose completion has been celebrated
}

export const DEFAULT_PROGRESS_SEEN: ProgressSeen = {
  seeded: false,
  level: 1,
  title: "Habit Newbie",
  shop: [],
  streaks: {},
  tierUnlocks: [],
  completedGoals: [],
};

// Editable user profile.
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
  displayName: "User",
  username: "user",
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
