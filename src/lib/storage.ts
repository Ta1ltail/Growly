// Loading/saving app data to the browser's localStorage, schema migration,
// and small date helpers. All guarded so they are safe to call during server
// rendering (where `window` does not exist).

import type {
  AppData,
  AuditAction,
  AuditEntry,
  CosmeticSlot,
  Economy,
  FreezeEntry,
  Goal,
  Habit,
  Marks,
  MarkStatus,
  Milestone,
  Note,
  Priority,
  Profile,
  ProgressSeen,
  Recurrence,
  SpendEntry,
  Unlocks,
} from "./types";
import {
  DEFAULT_ECONOMY,
  DEFAULT_PROFILE,
  DEFAULT_PROGRESS_SEEN,
} from "./types";
import { CATEGORIES, type Category } from "./categories";
import { ACCENTS, DEFAULT_THEME, type ThemeMode } from "./theme";

export const STORAGE_KEY = "project101.data.v1";

// Current schema version. Bumped when the shape of stored data changes so
// loadData() can migrate older saves forward.
// v3: added `profile` + `unlocks` (gamification). Older saves default them.
// v4: added `economy` (coins ledger + cosmetics + freezes). Older saves default
//     it to an empty economy; coins re-derive from history automatically.
// v5: added `progressSeen` (celebration seen-markers for level/title/shop/streak).
//     Older saves default it to an unseeded baseline; the seed step then records
//     current progress so existing histories don't re-fire celebrations.
export const SCHEMA_VERSION = 5;

// How long after midnight a user may still edit "yesterday" before the day
// locks permanently (Honest Tracking Policy). Tunable in Settings.
export const DEFAULT_GRACE_HOURS = 5;

export const emptyData: AppData = {
  version: SCHEMA_VERSION,
  habits: [],
  marks: {},
  notes: [],
  goals: [],
  auditLog: [],
  settings: {
    theme: DEFAULT_THEME,
    graceHours: DEFAULT_GRACE_HOURS,
    usedTemplateIds: [],
  },
  profile: DEFAULT_PROFILE,
  unlocks: {},
  economy: DEFAULT_ECONOMY,
  progressSeen: DEFAULT_PROGRESS_SEEN,
};

const COSMETIC_SLOTS = new Set<CosmeticSlot>(["flame", "confetti", "accent"]);

/* ---------- validation ----------
 * Saved data comes from localStorage, which can be edited, truncated, or
 * left over from an older version. We sanitize every record on load and
 * drop anything malformed so a bad entry can never crash the app. */

const CATEGORY_SET = new Set<string>(CATEGORIES);
const MARK_SET = new Set<MarkStatus>(["done", "missed", "skipped"]);
const MODE_SET = new Set<ThemeMode>(["light", "dark", "system"]);
const ACCENT_SET = new Set<string>(ACCENTS.map((a) => a.id));
const PRIORITY_SET = new Set<Priority>(["low", "med", "high"]);
const AUDIT_ACTIONS = new Set<AuditAction>([
  "habit.create",
  "habit.edit",
  "habit.delete",
  "habit.archive",
  "habit.unarchive",
  "habit.duplicate",
  "habit.schedule",
  "shop.buy",
  "freeze.use",
]);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function intDays(v: unknown, min: number, max: number): number[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (d): d is number =>
      typeof d === "number" && Number.isInteger(d) && d >= min && d <= max,
  );
}

function cleanRecurrence(v: unknown): Recurrence | undefined {
  if (!isObject(v)) return undefined;
  if (v.kind === "daily") return { kind: "daily" };
  if (v.kind === "weekly")
    return { kind: "weekly", weekdays: intDays(v.weekdays, 0, 6) };
  if (v.kind === "monthly")
    return { kind: "monthly", monthDays: intDays(v.monthDays, 1, 31) };
  return undefined;
}

function cleanHabit(v: unknown, extraCategories?: Set<string>): Habit | null {
  if (!isObject(v)) return null;
  const { id, name, category, repeatDays, createdAt } = v;
  if (typeof id !== "string" || typeof name !== "string") return null;
  const validCats = new Set([...CATEGORY_SET, ...(extraCategories ?? [])]);
  if (typeof category !== "string" || !validCats.has(category)) return null;
  if (typeof createdAt !== "string") return null;
  const days = intDays(repeatDays, 0, 6);

  const habit: Habit = {
    id,
    name,
    category: category as Category,
    repeatDays: days,
    createdAt,
  };

  // ---- optional richer fields ----
  const recurrence = cleanRecurrence(v.recurrence);
  if (recurrence) habit.recurrence = recurrence;
  const startDate = asString(v.startDate);
  if (startDate) habit.startDate = startDate;
  const timeOfDay = asString(v.timeOfDay);
  if (timeOfDay) habit.timeOfDay = timeOfDay;
  if (
    typeof v.priority === "string" &&
    PRIORITY_SET.has(v.priority as Priority)
  ) {
    habit.priority = v.priority as Priority;
  }
  if (typeof v.archived === "boolean") habit.archived = v.archived;
  if (isObject(v.reminder) && typeof v.reminder.enabled === "boolean") {
    habit.reminder = {
      enabled: v.reminder.enabled,
      ...(asString(v.reminder.time) ? { time: v.reminder.time as string } : {}),
    };
  }
  return habit;
}

function cleanMarks(v: unknown): Marks {
  if (!isObject(v)) return {};
  const out: Marks = {};
  for (const [dateK, day] of Object.entries(v)) {
    if (!isObject(day)) continue;
    const cleanDay: Record<string, MarkStatus> = {};
    for (const [habitId, status] of Object.entries(day)) {
      if (typeof status === "string" && MARK_SET.has(status as MarkStatus)) {
        cleanDay[habitId] = status as MarkStatus;
      }
    }
    if (Object.keys(cleanDay).length > 0) out[dateK] = cleanDay;
  }
  return out;
}

function cleanNote(v: unknown): Note | null {
  if (!isObject(v)) return null;
  const { id, createdAt, updatedAt, body } = v;
  if (typeof id !== "string" || typeof body !== "string") return null;
  const created =
    typeof createdAt === "string" ? createdAt : new Date(0).toISOString();
  const links = isObject(v.links) ? v.links : {};
  return {
    id,
    createdAt: created,
    updatedAt: typeof updatedAt === "string" ? updatedAt : created,
    body,
    tags: Array.isArray(v.tags)
      ? v.tags.filter((t): t is string => typeof t === "string")
      : [],
    links: {
      ...(asString(links.date) ? { date: links.date as string } : {}),
      ...(asString(links.habitId) ? { habitId: links.habitId as string } : {}),
      ...(asString(links.goalId) ? { goalId: links.goalId as string } : {}),
    },
  };
}

// Migrate the legacy notes shape ({ [dateKey]: string }) into Note[].
function migrateLegacyNotes(v: Record<string, unknown>): Note[] {
  const out: Note[] = [];
  for (const [dateK, text] of Object.entries(v)) {
    if (typeof text !== "string" || text.trim() === "") continue;
    const stamp = `${dateK}T00:00:00.000Z`;
    out.push({
      id: `note-${dateK}`,
      createdAt: stamp,
      updatedAt: stamp,
      body: text,
      tags: [],
      links: { date: dateK },
    });
  }
  return out;
}

function cleanNotes(v: unknown): Note[] {
  if (Array.isArray(v)) {
    return v.map(cleanNote).filter((n): n is Note => n !== null);
  }
  // Legacy object form -> migrate.
  if (isObject(v)) return migrateLegacyNotes(v);
  return [];
}

function cleanMilestones(v: unknown): Milestone[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: Milestone[] = [];
  for (const m of v) {
    if (!isObject(m)) continue;
    if (typeof m.id !== "string" || typeof m.title !== "string") continue;
    if (typeof m.at !== "number") continue;
    out.push({ id: m.id, title: m.title, at: m.at, done: m.done === true });
  }
  return out.length > 0 ? out : undefined;
}

function cleanGoal(v: unknown): Goal | null {
  if (!isObject(v)) return null;
  const { id, title, target, current, createdAt } = v;
  if (typeof id !== "string" || typeof title !== "string") return null;
  if (typeof target !== "number" || typeof current !== "number") return null;
  if (typeof createdAt !== "string") return null;

  const goal: Goal = { id, title, target, current, createdAt };
  if (typeof v.category === "string" && CATEGORY_SET.has(v.category)) {
    goal.category = v.category as Category;
  }
  const deadline = asString(v.deadline);
  if (deadline) goal.deadline = deadline;
  if (Array.isArray(v.linkedHabitIds)) {
    goal.linkedHabitIds = v.linkedHabitIds.filter(
      (x): x is string => typeof x === "string",
    );
  }
  const milestones = cleanMilestones(v.milestones);
  if (milestones) goal.milestones = milestones;
  return goal;
}

function cleanAudit(v: unknown): AuditEntry | null {
  if (!isObject(v)) return null;
  const { id, at, action, summary } = v;
  if (typeof id !== "string" || typeof at !== "string") return null;
  if (typeof action !== "string" || !AUDIT_ACTIONS.has(action as AuditAction))
    return null;
  if (typeof summary !== "string") return null;
  const entry: AuditEntry = { id, at, action: action as AuditAction, summary };
  const habitId = asString(v.habitId);
  if (habitId) entry.habitId = habitId;
  if ("before" in v) entry.before = v.before;
  if ("after" in v) entry.after = v.after;
  return entry;
}

function cleanProfile(v: unknown): Profile {
  if (!isObject(v)) return DEFAULT_PROFILE;
  const profile: Profile = {
    displayName: asString(v.displayName) ?? DEFAULT_PROFILE.displayName,
    username: asString(v.username) ?? DEFAULT_PROFILE.username,
  };
  const bio = asString(v.bio);
  if (bio !== undefined) profile.bio = bio;
  const motto = asString(v.motto);
  if (motto !== undefined) profile.motto = motto;
  const avatar = asString(v.avatar);
  if (avatar) profile.avatar = avatar;
  const banner = asString(v.banner);
  if (banner) profile.banner = banner;
  const showcase = asString(v.showcaseBadgeId);
  if (showcase) profile.showcaseBadgeId = showcase;
  return profile;
}

function cleanUnlocks(v: unknown): Unlocks {
  if (!isObject(v)) return {};
  const out: Unlocks = {};
  for (const [id, rec] of Object.entries(v)) {
    if (!isObject(rec)) continue;
    const at = asString(rec.at);
    if (!at) continue;
    out[id] = { at, seen: rec.seen === true };
  }
  return out;
}

function cleanSpend(v: unknown): SpendEntry | null {
  if (!isObject(v)) return null;
  const { id, at, amount, item } = v;
  if (typeof id !== "string" || typeof at !== "string") return null;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)
    return null;
  if (typeof item !== "string") return null;
  return { id, at, amount, item };
}

function cleanFreeze(v: unknown): FreezeEntry | null {
  if (!isObject(v)) return null;
  const { id, at, date, habitId } = v;
  if (typeof id !== "string" || typeof at !== "string") return null;
  if (typeof date !== "string" || typeof habitId !== "string") return null;
  return { id, at, date, habitId };
}

function cleanProgressSeen(v: unknown): ProgressSeen {
  if (!isObject(v)) return { ...DEFAULT_PROGRESS_SEEN };
  const streaks: Record<string, number> = {};
  if (isObject(v.streaks)) {
    for (const [habitId, tier] of Object.entries(v.streaks)) {
      if (typeof tier === "number" && Number.isFinite(tier))
        streaks[habitId] = tier;
    }
  }
  const tierUnlocks = Array.isArray(v.tierUnlocks)
    ? v.tierUnlocks.filter((x): x is string => typeof x === "string")
    : [];
  return {
    seeded: v.seeded === true,
    level:
      typeof v.level === "number" && Number.isFinite(v.level)
        ? v.level
        : DEFAULT_PROGRESS_SEEN.level,
    title: asString(v.title) ?? DEFAULT_PROGRESS_SEEN.title,
    shop: Array.isArray(v.shop)
      ? v.shop.filter((x): x is string => typeof x === "string")
      : [],
    streaks,
    tierUnlocks,
  };
}

function cleanEconomyV5(v: unknown): Economy {
  if (!isObject(v))
    return {
      spent: [],
      owned: [],
      equipped: {},
      freezes: [],
      bonusCoins: 0,
      lastCheckIn: null,
      checkInStreak: 0,
      lastQuestDate: null,
      currentQuest: null,
      lastSpinDate: null,
      lastSpinResult: null,
    };
  const spent = Array.isArray(v.spent)
    ? v.spent.map(cleanSpend).filter((s): s is SpendEntry => s !== null)
    : [];
  const owned = Array.isArray(v.owned)
    ? v.owned.filter((x): x is string => typeof x === "string")
    : [];
  const freezes = Array.isArray(v.freezes)
    ? v.freezes.map(cleanFreeze).filter((f): f is FreezeEntry => f !== null)
    : [];
  const equipped: Partial<Record<CosmeticSlot, string>> = {};
  if (isObject(v.equipped)) {
    for (const [slot, id] of Object.entries(v.equipped)) {
      if (COSMETIC_SLOTS.has(slot as CosmeticSlot) && typeof id === "string") {
        equipped[slot as CosmeticSlot] = id;
      }
    }
  }
  // Engagement features (schema v6)
  const bonusCoins =
    typeof v.bonusCoins === "number" &&
    Number.isFinite(v.bonusCoins) &&
    v.bonusCoins >= 0
      ? v.bonusCoins
      : 0;
  const lastCheckIn = asString(v.lastCheckIn) ?? null;
  const checkInStreak =
    typeof v.checkInStreak === "number" &&
    Number.isFinite(v.checkInStreak) &&
    v.checkInStreak >= 0
      ? Math.floor(v.checkInStreak)
      : 0;
  const lastQuestDate = asString(v.lastQuestDate) ?? null;
  const lastSpinDate = asString(v.lastSpinDate) ?? null;

  // Clean currentQuest
  let currentQuest = null;
  if (isObject(v.currentQuest)) {
    const cq = v.currentQuest as Record<string, unknown>;
    if (
      typeof cq.description === "string" &&
      typeof cq.target === "number" &&
      Number.isFinite(cq.target) &&
      cq.target > 0 &&
      typeof cq.current === "number" &&
      Number.isFinite(cq.current) &&
      cq.current >= 0 &&
      typeof cq.reward === "number" &&
      Number.isFinite(cq.reward) &&
      cq.reward >= 0
    ) {
      currentQuest = {
        description: cq.description,
        target: Math.floor(cq.target),
        current: Math.min(Math.floor(cq.current), Math.floor(cq.target)),
        reward: Math.floor(cq.reward),
      };
      if (typeof cq.category === "string")
        (currentQuest as { category?: string }).category = cq.category;
    }
  }

  return {
    spent,
    owned,
    equipped,
    freezes,
    bonusCoins,
    lastCheckIn,
    checkInStreak,
    lastQuestDate,
    currentQuest,
    lastSpinDate,
    lastSpinResult: null,
  };
}

export function loadData(): AppData {
  if (typeof window === "undefined") return emptyData;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!isObject(parsed)) return emptyData;

    // Extract custom categories from settings first so cleanHabit can accept them
    const settingsRaw = isObject(parsed.settings) ? parsed.settings : {};
    const customCategories = Array.isArray(settingsRaw.customCategories)
      ? settingsRaw.customCategories.filter(
          (x): x is string => typeof x === "string",
        )
      : undefined;
    const extraCats =
      customCategories && customCategories.length > 0
        ? new Set(customCategories)
        : undefined;

    const habits = Array.isArray(parsed.habits)
      ? parsed.habits
          .map((h) => cleanHabit(h, extraCats))
          .filter((h): h is Habit => h !== null)
      : [];
    const goals = Array.isArray(parsed.goals)
      ? parsed.goals.map(cleanGoal).filter((g): g is Goal => g !== null)
      : [];
    const auditLog = Array.isArray(parsed.auditLog)
      ? parsed.auditLog
          .map(cleanAudit)
          .filter((a): a is AuditEntry => a !== null)
      : [];

    const themeRaw =
      isObject(parsed.settings) && isObject(parsed.settings.theme)
        ? parsed.settings.theme
        : {};
    const mode =
      typeof themeRaw.mode === "string" &&
      MODE_SET.has(themeRaw.mode as ThemeMode)
        ? (themeRaw.mode as ThemeMode)
        : DEFAULT_THEME.mode;
    const accent =
      typeof themeRaw.accent === "string" && ACCENT_SET.has(themeRaw.accent)
        ? themeRaw.accent
        : DEFAULT_THEME.accent;

    const graceHours =
      typeof settingsRaw.graceHours === "number" && settingsRaw.graceHours >= 0
        ? settingsRaw.graceHours
        : DEFAULT_GRACE_HOURS;
    const usedTemplateIds = Array.isArray(settingsRaw.usedTemplateIds)
      ? settingsRaw.usedTemplateIds.filter(
          (x): x is string => typeof x === "string",
        )
      : [];
    const widgetOrder = Array.isArray(settingsRaw.widgetOrder)
      ? settingsRaw.widgetOrder.filter(
          (x): x is string => typeof x === "string",
        )
      : undefined;
    const onboardingComplete =
      typeof settingsRaw.onboardingComplete === "boolean"
        ? settingsRaw.onboardingComplete
        : undefined;

    return {
      version: SCHEMA_VERSION,
      habits,
      marks: cleanMarks(parsed.marks),
      notes: cleanNotes(parsed.notes),
      goals,
      auditLog,
      settings: {
        theme: { mode, accent },
        graceHours,
        usedTemplateIds,
        widgetOrder,
        onboardingComplete,
        customCategories,
      },
      profile: cleanProfile(parsed.profile),
      unlocks: cleanUnlocks(parsed.unlocks),
      economy: cleanEconomyV5(parsed.economy),
      progressSeen: cleanProgressSeen(parsed.progressSeen),
    };
  } catch {
    return emptyData;
  }
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can fail (private mode, quota). Safe to ignore for now.
  }
}

/* ---------------- date helpers ---------------- */

// Local date as "YYYY-MM-DD" (not UTC, so "today" matches the user).
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse a "YYYY-MM-DD" key back into a local-midnight Date.
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function prettyDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Return a new Date that is `n` days before/after `d` (n can be negative).
export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

// Local midnight of the given date. Lets callers compare days by timestamp
// (DST-safe, since every result sits at 00:00 local) without formatting strings.
export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Whole-day difference a - b (positive when a is later). DST-safe.
export function dayDiff(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / 86_400_000);
}
