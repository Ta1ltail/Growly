"use client";

// A tiny shared store for the app's data, backed by localStorage.
// Uses React's useSyncExternalStore so every screen reads the same data
// and updates together — hydration-safe for Next.js server rendering.
// All mutations go through the action functions below; habit/schedule changes
// are recorded in an append-only audit log (Honest Tracking Policy).

import { useSyncExternalStore } from "react";
import type {
  AppData,
  AuditAction,
  AuditEntry,
  CosmeticSlot,
  Goal,
  Habit,
  Note,
  NoteLinks,
  Profile,
} from "./types";
import type { ThemeSettings } from "./theme";
import { DEFAULT_GRACE_HOURS, STORAGE_KEY, dateKey, emptyData, loadData, saveData } from "./storage";
import { nextStatus } from "./marks";
import { canEditMark } from "./policy";
import { reconcileUnlocks, summarizeProgress } from "./progress";
import {
  canFreezeDay,
  canUseFreeze,
  coinBalance,
  coinsEarned,
  FREEZE_PRICE,
  frozenSet,
  makeFreezeEntry,
  shopItem,
} from "./economy";
import { buildGameStats, evaluateAchievements } from "./achievements";

let cache: AppData | null = null;
const listeners = new Set<() => void>();

const MAX_AUDIT = 500;

function getSnapshot(): AppData {
  if (cache === null) cache = loadData();
  return cache;
}

function getServerSnapshot(): AppData {
  return emptyData;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(updater: (prev: AppData) => AppData): void {
  cache = updater(getSnapshot());
  saveData(cache);
  for (const listener of listeners) listener();
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ---------------- audit helpers ---------------- */

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function audit(
  prev: AppData,
  action: AuditAction,
  summary: string,
  habitId?: string,
  before?: unknown,
  after?: unknown,
): AuditEntry[] {
  const entry: AuditEntry = {
    id: uid(),
    at: new Date().toISOString(),
    action,
    summary,
    ...(habitId ? { habitId } : {}),
    ...(before !== undefined ? { before } : {}),
    ...(after !== undefined ? { after } : {}),
  };
  return [entry, ...prev.auditLog].slice(0, MAX_AUDIT);
}

/* ---------------- habit actions ---------------- */

export function addHabit(habit: Habit): void {
  update((prev) => ({
    ...prev,
    habits: [...prev.habits, habit],
    auditLog: audit(prev, "habit.create", `Created “${habit.name}”`, habit.id, undefined, habit),
  }));
}

export function updateHabit(habit: Habit): void {
  update((prev) => {
    const before = prev.habits.find((h) => h.id === habit.id);
    const scheduleChanged =
      before &&
      JSON.stringify({ r: before.recurrence, s: before.startDate, t: before.timeOfDay, d: before.repeatDays }) !==
        JSON.stringify({ r: habit.recurrence, s: habit.startDate, t: habit.timeOfDay, d: habit.repeatDays });
    const action: AuditAction = scheduleChanged ? "habit.schedule" : "habit.edit";
    const summary = scheduleChanged
      ? `Changed schedule for “${habit.name}”`
      : `Edited “${habit.name}”`;
    return {
      ...prev,
      habits: prev.habits.map((h) => (h.id === habit.id ? habit : h)),
      auditLog: audit(prev, action, summary, habit.id, before, habit),
    };
  });
}

export function deleteHabit(id: string): void {
  update((prev) => {
    const before = prev.habits.find((h) => h.id === id);
    return {
      ...prev,
      habits: prev.habits.filter((h) => h.id !== id),
      auditLog: audit(prev, "habit.delete", `Deleted “${before?.name ?? "habit"}”`, id, before),
    };
  });
}

export function setHabitArchived(id: string, archived: boolean): void {
  update((prev) => {
    const before = prev.habits.find((h) => h.id === id);
    if (!before) return prev;
    return {
      ...prev,
      habits: prev.habits.map((h) => (h.id === id ? { ...h, archived } : h)),
      auditLog: audit(
        prev,
        archived ? "habit.archive" : "habit.unarchive",
        `${archived ? "Archived" : "Restored"} “${before.name}”`,
        id,
      ),
    };
  });
}

export function duplicateHabit(id: string): void {
  update((prev) => {
    const src = prev.habits.find((h) => h.id === id);
    if (!src) return prev;
    const copy: Habit = {
      ...src,
      id: uid(),
      name: `${src.name} (copy)`,
      createdAt: new Date().toISOString(),
      archived: false,
    };
    return {
      ...prev,
      habits: [...prev.habits, copy],
      auditLog: audit(prev, "habit.duplicate", `Duplicated “${src.name}”`, copy.id, undefined, copy),
    };
  });
}

/* ---------------- marks (anti-cheat guarded) ---------------- */

// Cycle a mark. Past/future days are locked per the Honest Tracking Policy,
// so this is a no-op outside the editable window.
export function cycleMark(dateK: string, habitId: string): void {
  update((prev) => {
    const grace = prev.settings.graceHours ?? DEFAULT_GRACE_HOURS;
    if (!canEditMark(dateK, new Date(), grace)) return prev;
    const day = { ...(prev.marks[dateK] ?? {}) };
    const next = nextStatus(day[habitId]);
    if (next === undefined) delete day[habitId];
    else day[habitId] = next;
    const updated = { ...prev, marks: { ...prev.marks, [dateK]: day } };
    // Marking can satisfy achievements — persist any new unlocks for popups.
    const { unlocks } = reconcileUnlocks(updated, new Date(), new Date().toISOString());
    return unlocks === updated.unlocks ? updated : { ...updated, unlocks };
  });
}

/* ---------------- notes ---------------- */

export function addNote(input: { body: string; tags?: string[]; links?: NoteLinks }): Note {
  const now = new Date().toISOString();
  const note: Note = {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    body: input.body,
    tags: input.tags ?? [],
    links: input.links ?? {},
  };
  update((prev) => ({ ...prev, notes: [note, ...prev.notes] }));
  return note;
}

export function updateNote(id: string, patch: Partial<Omit<Note, "id" | "createdAt">>): void {
  update((prev) => ({
    ...prev,
    notes: prev.notes.map((n) =>
      n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
    ),
  }));
}

export function deleteNote(id: string): void {
  update((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) }));
}

// Upsert the single "daily note" for a date (used by Today's quick note box).
export function setDailyNote(dateK: string, text: string): void {
  update((prev) => {
    const existing = prev.notes.find((n) => n.links.date === dateK && !n.links.habitId && !n.links.goalId);
    const trimmed = text.trim();
    if (existing) {
      if (trimmed === "") {
        return { ...prev, notes: prev.notes.filter((n) => n.id !== existing.id) };
      }
      return {
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === existing.id ? { ...n, body: text, updatedAt: new Date().toISOString() } : n,
        ),
      };
    }
    if (trimmed === "") return prev;
    const now = new Date().toISOString();
    const note: Note = {
      id: uid(),
      createdAt: now,
      updatedAt: now,
      body: text,
      tags: [],
      links: { date: dateK },
    };
    return { ...prev, notes: [note, ...prev.notes] };
  });
}

/* ---------------- goals ---------------- */

export function addGoal(goal: Goal): void {
  update((prev) => ({ ...prev, goals: [...prev.goals, goal] }));
}

export function updateGoal(goal: Goal): void {
  update((prev) => ({
    ...prev,
    goals: prev.goals.map((g) => (g.id === goal.id ? goal : g)),
  }));
}

export function deleteGoal(id: string): void {
  update((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
}

/* ---------------- settings ---------------- */

export function setTheme(patch: Partial<ThemeSettings>): void {
  update((prev) => ({
    ...prev,
    settings: { ...prev.settings, theme: { ...prev.settings.theme, ...patch } },
  }));
}

export function setGraceHours(hours: number): void {
  update((prev) => ({ ...prev, settings: { ...prev.settings, graceHours: Math.max(0, hours) } }));
}

export function markTemplateUsed(templateId: string): void {
  update((prev) => {
    const used = new Set(prev.settings.usedTemplateIds ?? []);
    used.add(templateId);
    return { ...prev, settings: { ...prev.settings, usedTemplateIds: [...used] } };
  });
}

export function resetTemplateUsage(templateId: string): void {
  update((prev) => ({
    ...prev,
    settings: {
      ...prev.settings,
      usedTemplateIds: (prev.settings.usedTemplateIds ?? []).filter((id) => id !== templateId),
    },
  }));
}

export function clearAllData(): void {
  // Wipe tracked data + unlocks (history is gone), but keep the user's
  // settings and profile identity. Economy resets too: coins are derived from
  // history, so wiping history must wipe the ledger or the balance goes
  // negative/stale. Owned cosmetics are part of that history-derived state.
  update((prev) => ({ ...emptyData, settings: prev.settings, profile: prev.profile }));
}

/* ---------------- developer mode (raw data access) ---------------- */

// Replace the entire data snapshot (Developer Mode data tools). Goes through
// update() so it persists + notifies like any other mutation.
export function replaceData(next: AppData): void {
  update(() => next);
}

// Re-read from localStorage into the cache and notify. Used after a raw write
// so the validated/migrated result flows back through the normal load path.
export function reloadData(): void {
  cache = loadData();
  for (const listener of listeners) listener();
}

// Write a raw JSON string straight to storage, then reload through loadData so
// every validator/migration runs on it. Returns an error message or null on
// success. Developer Mode only.
export function importRawData(text: string): string | null {
  if (typeof window === "undefined") return "No storage available";
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return "Root must be a JSON object";
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    reloadData();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid JSON";
  }
}

/* ---------------- gamification ---------------- */

export function updateProfile(patch: Partial<Profile>): void {
  update((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
}

// One-time silent seed: record every already-earned achievement as seen so a
// returning user (or a pre-v3 save migrating to an empty unlock map) doesn't get
// a flood of celebration popups for history they earned before this session.
// Only fills GAPS — anything already recorded keeps its existing seen flag.
// Call once on app mount, before celebrations start watching.
export function seedUnlocksSeen(): void {
  update((prev) => {
    const { unlocks, newlyUnlocked } = reconcileUnlocks(prev, new Date(), new Date().toISOString());
    if (newlyUnlocked.length === 0) return prev;
    const seeded = { ...unlocks };
    for (const id of newlyUnlocked) seeded[id] = { ...seeded[id], seen: true };
    return { ...prev, unlocks: seeded };
  });
}

// Recompute unlocks from history and persist any newly-satisfied achievements.
// Safe to call on load / on focus; a no-op when nothing changed.
export function syncAchievements(): void {
  update((prev) => {
    const { unlocks } = reconcileUnlocks(prev, new Date(), new Date().toISOString());
    return unlocks === prev.unlocks ? prev : { ...prev, unlocks };
  });
}

export function markAchievementsSeen(ids: string[]): void {
  update((prev) => {
    let changed = false;
    const unlocks = { ...prev.unlocks };
    for (const id of ids) {
      const rec = unlocks[id];
      if (rec && !rec.seen) {
        unlocks[id] = { ...rec, seen: true };
        changed = true;
      }
    }
    return changed ? { ...prev, unlocks } : prev;
  });
}

/* ---------------- economy (coins / shop / freezes) ---------------- */

// Spendable balance for the current data snapshot. Derives earned coins from
// history (same path as the UI) minus the persisted spend ledger.
function balanceOf(data: AppData, today: Date): number {
  const stats = buildGameStats(data.habits, data.marks, today, frozenSet(data.economy));
  const unlockedRarities = evaluateAchievements(stats)
    .filter((a) => a.unlocked)
    .map((a) => a.def.rarity);
  return coinBalance(coinsEarned(stats, unlockedRarities), data.economy);
}

// Buy a cosmetic: must exist, not already owned, meet any level gate, and be
// affordable. Appends an immutable spend-ledger entry + audit row, and marks it
// owned. No-op (returns prev) if any guard fails — callers should pre-check to
// show why, but the store stays authoritative.
export function buyCosmetic(itemId: string): void {
  update((prev) => {
    const item = shopItem(itemId);
    if (!item) return prev;
    if (prev.economy.owned.includes(itemId)) return prev;
    const today = new Date();
    if (item.minLevel) {
      const summary = summarizeLevel(prev, today);
      if (summary < item.minLevel) return prev;
    }
    if (balanceOf(prev, today) < item.price) return prev;

    const entry = {
      id: uid(),
      at: new Date().toISOString(),
      amount: item.price,
      item: itemId,
    };
    return {
      ...prev,
      economy: {
        ...prev.economy,
        spent: [...prev.economy.spent, entry],
        owned: [...prev.economy.owned, itemId],
        // Auto-equip the freshly-bought item in its slot.
        equipped: { ...prev.economy.equipped, [item.slot]: itemId },
      },
      auditLog: audit(prev, "shop.buy", `Bought “${item.name}” for ${item.price} coins`, undefined, undefined, entry),
    };
  });
}

// Equip an owned cosmetic (or a free default) into its slot.
export function equipCosmetic(slot: CosmeticSlot, itemId: string): void {
  update((prev) => {
    const isDefault = itemId === `${slot}-default`;
    if (!isDefault) {
      const item = shopItem(itemId);
      if (!item || item.slot !== slot) return prev;
      if (!prev.economy.owned.includes(itemId)) return prev;
    }
    return {
      ...prev,
      economy: { ...prev.economy, equipped: { ...prev.economy.equipped, [slot]: itemId } },
    };
  });
}

// Apply a streak-freeze to a genuine past miss. Costs coins, is limited to one
// per rolling 7-day window, and only targets a day actually marked "missed" —
// the miss stays in history, the freeze just makes the streak walk skip it.
export function redeemFreeze(habitId: string, dateK: string): void {
  update((prev) => {
    const today = new Date();
    if (!canUseFreeze(prev.economy, today)) return prev;
    if (!canFreezeDay(prev.economy, prev.marks, habitId, dateK)) return prev;
    if (balanceOf(prev, today) < FREEZE_PRICE) return prev;

    const nowIso = new Date().toISOString();
    const freeze = makeFreezeEntry(habitId, dateK, uid(), nowIso);
    const spend = { id: uid(), at: nowIso, amount: FREEZE_PRICE, item: "freeze" };
    return {
      ...prev,
      economy: {
        ...prev.economy,
        spent: [...prev.economy.spent, spend],
        freezes: [...prev.economy.freezes, freeze],
      },
      auditLog: audit(
        prev,
        "freeze.use",
        `Used a streak freeze on ${dateK}`,
        habitId,
        undefined,
        freeze,
      ),
    };
  });
}

// Level for the current snapshot — used for shop level gates. Local helper to
// avoid importing the full progress façade into the buy path twice.
function summarizeLevel(data: AppData, today: Date): number {
  return summarizeProgress(data, today).level.level;
}

// Re-export for convenience in pages that build keys.
export { dateKey };
