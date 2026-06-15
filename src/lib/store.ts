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
  Goal,
  Habit,
  Note,
  NoteLinks,
  Profile,
} from "./types";
import type { ThemeSettings } from "./theme";
import { DEFAULT_GRACE_HOURS, dateKey, emptyData, loadData, saveData } from "./storage";
import { nextStatus } from "./marks";
import { canEditMark } from "./policy";
import { reconcileUnlocks } from "./progress";

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
  // settings and profile identity.
  update((prev) => ({ ...emptyData, settings: prev.settings, profile: prev.profile }));
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

// Re-export for convenience in pages that build keys.
export { dateKey };
