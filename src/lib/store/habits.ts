"use client";

// Habit CRUD + mark cycling — domain logic extracted from index.ts

import { update, audit } from "./core";
import type { Habit, AuditAction } from "../types";
import { uid } from "../util";

/* ---------------- habit actions ---------------- */

export function addHabit(habit: Habit): void {
  update((prev) => {
    // Soft limit check: warn when approaching storage quotas
    if (prev.habits.length >= 200) {
      console.warn(`[habits] Soft limit reached: ${prev.habits.length + 1} habits`);
    }
    return {
      ...prev,
      habits: [...prev.habits, habit],
      auditLog: audit(
        prev,
        "habit.create",
        `Created "${habit.name}"`,
        habit.id,
        undefined,
        habit,
      ),
    };
  });
}

export function updateHabit(habit: Habit): void {
  update((prev) => {
    const before = prev.habits.find((h) => h.id === habit.id);
    const scheduleChanged =
      before &&
      JSON.stringify({
        r: before.recurrence,
        s: before.startDate,
        t: before.timeOfDay,
        d: before.repeatDays,
      }) !==
        JSON.stringify({
          r: habit.recurrence,
          s: habit.startDate,
          t: habit.timeOfDay,
          d: habit.repeatDays,
        });
    const action: AuditAction = scheduleChanged
      ? "habit.schedule"
      : "habit.edit";
    const summary = scheduleChanged
      ? `Changed schedule for "${habit.name}"`
      : `Edited "${habit.name}"`;
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
    if (!before) return prev;
    const now = new Date().toISOString();
    return {
      ...prev,
      habits: prev.habits.map((h) =>
        h.id === id ? { ...h, deletedAt: now } : h,
      ),
      auditLog: audit(
        prev,
        "habit.delete",
        `Deleted "${before.name}"`,
        id,
        before,
        { ...before, deletedAt: now },
      ),
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
        `${archived ? "Archived" : "Restored"} "${before.name}"`,
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
      deletedAt: undefined,
    };
    return {
      ...prev,
      habits: [...prev.habits, copy],
      auditLog: audit(
        prev,
        "habit.duplicate",
        `Duplicated "${src.name}"`,
        copy.id,
        undefined,
        copy,
      ),
    };
  });
}

/* ---------------- marks (anti-cheat guarded) ---------------- */

import { nextStatus } from "../marks";
import { canEditMark } from "../policy";
import { habitStreaks } from "../stats";
import {
  canUseFreeze,
  coinBalance,
  coinsEarned,
  FREEZE_PRICE,
  frozenSet,
  makeFreezeEntry,
} from "../economy";
import { buildGameStats, evaluateAchievements } from "../achievements";
import { reconcileUnlocks } from "../progress";
import { dateKey } from "../date";
import { DEFAULT_GRACE_HOURS } from "../storage";

// Track last toggle time per (dateKey, habitId) to suppress rapid double-clicks.
const _lastToggle = new Map<string, number>();
// Disabled in test env so cycleMark tests don't need artificial delays.
const TOGGLE_COOLDOWN_MS = typeof process !== "undefined" && process.env?.NODE_ENV === "test" ? 0 : 200;

// Cycle a mark. Past/future days are locked per Honest Tracking Policy. Also progresses daily quest
// and auto-increments linked goals.
// Future dates are rejected outright — users cannot mark habits as done/missed in the future.
// Rapid-click guard: ignores clicks within 200ms of the last one to prevent wasted sync calls.
export function cycleMark(
  dateK: string,
  habitId: string,
  habitCategory?: string,
): void {
  const cacheKey = `${dateK}:${habitId}`;
  const now = Date.now();
  const last = _lastToggle.get(cacheKey) ?? 0;
  if (now - last < TOGGLE_COOLDOWN_MS) return;
  _lastToggle.set(cacheKey, now);
  // Skip history for individual mark toggles — they're high-frequency and
  // undoing a single mark is rarely the desired action. Users can still undo
  // habit creation/editing/deletion and bulk actions.
  update(
    (prev) => {
      const now = new Date();
      const todayKey = dateKey(now);

      // Reject future dates — prevent XP/streak manipulation
      if (dateK > todayKey) return prev;

      const grace = prev.settings.graceHours ?? DEFAULT_GRACE_HOURS;
      if (!canEditMark(dateK, now, grace)) return prev;
      const day = { ...(prev.marks[dateK] ?? {}) };
      const next = nextStatus(day[habitId]);
      if (next === undefined) delete day[habitId];
      else day[habitId] = next;
      const updated = { ...prev, marks: { ...prev.marks, [dateK]: day } };
      // Marking can satisfy achievements — persist any new unlocks for popups.
      const { unlocks } = reconcileUnlocks(updated, now, now.toISOString());
      // Progress daily quest if marking done today
      let eco = updated.economy;

      // Auto-apply streak freeze when marking missed & streak saver is enabled
      const autoThreshold = prev.settings.autoFreezeThreshold;
      if (next === "missed" && autoThreshold && autoThreshold > 0) {
        const habit = prev.habits.find((h) => h.id === habitId);
        if (habit) {
          const frozenSetLocal = frozenSet(prev.economy);
          const { current: streakBefore } = habitStreaks(
            habit,
            prev.marks,
            now,
            frozenSetLocal,
          );
          if (
            streakBefore >= autoThreshold &&
            canUseFreeze(prev.economy, now)
          ) {
            const stats = buildGameStats(
              prev.habits,
              prev.marks,
              now,
              frozenSetLocal,
            );
            const unlockedRarities = evaluateAchievements(stats)
              .filter((a) => a.unlocked)
              .map((a) => a.def.rarity);
            const balance = coinBalance(
              coinsEarned(stats, unlockedRarities, prev.economy),
              prev.economy,
            );
            if (balance >= FREEZE_PRICE) {
              const nowIso = now.toISOString();
              const freeze = makeFreezeEntry(habitId, dateK, uid(), nowIso);
              const spend = {
                id: uid(),
                at: nowIso,
                amount: FREEZE_PRICE,
                item: "freeze" as const,
              };
              eco = {
                ...eco,
                spent: [...eco.spent, spend],
                freezes: [...eco.freezes, freeze],
              };
            }
          }
        }
      }

      if (dateK === todayKey && next === "done") {
        const q = eco.currentQuest;
        if (
          q &&
          q.current < q.target &&
          (!q.category || q.category === habitCategory)
        ) {
          eco = { ...eco, currentQuest: { ...q, current: q.current + 1 } };
        }

        // Auto-increment linked goals when a habit is marked done.
        // Only increments goals that have this habit in linkedHabitIds
        // and haven't reached their target yet.
        const linkedGoals = prev.goals.filter(
          (g) =>
            g.linkedHabitIds?.includes(habitId) &&
            g.current < g.target &&
            !g.deletedAt,
        );
        if (linkedGoals.length > 0) {
          updated.goals = prev.goals.map((g) =>
            g.linkedHabitIds?.includes(habitId) && g.current < g.target && !g.deletedAt
              ? { ...g, current: g.current + 1 }
              : g,
          );
        }
      }
      return unlocks === updated.unlocks
        ? { ...updated, economy: eco }
        : { ...updated, unlocks, economy: eco };
    },
    false,
  ); // recordHistory = false for performance
}
