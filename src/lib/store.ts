"use client";

// Shared store backed by localStorage. Uses useSyncExternalStore for
// hydration-safe access. Habit/schedule changes are audit-logged.

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
import type { ChangedTables } from "./supabase/db";
import {
  DEFAULT_GRACE_HOURS,
  STORAGE_KEY,
  dateKey,
  emptyData,
  loadData,
  saveData,
  addDays,
} from "./storage";
import { nextStatus } from "./marks";
import { canEditMark } from "./policy";
import { habitStreaks } from "./stats";
import { uid } from "./util";
import { reconcileUnlocks, summarizeProgress } from "./progress";
import {
  canFreezeDay,
  canUseFreeze,
  checkInReward,
  coinBalance,
  coinsEarned,
  FREEZE_PRICE,
  frozenSet,
  generateDailyQuest,
  levelUpCoinsBetween,
  makeFreezeEntry,
  randomSpinReward,
  shopItem,
  streakMilestoneReward,
} from "./economy";
import { buildGameStats, evaluateAchievements, RARITY_ORDER } from "./achievements";
import { baselineProgressSeen, type CelebrationEvent } from "./celebrations";
import {
  pushSnapshot,
  undo as undoHistory,
  redo as redoHistory,
} from "./history";
import { bumpDataGeneration } from "./supabase/sync";

let cache: AppData | null = null;
const listeners = new Set<() => void>();

const MAX_AUDIT = 500;

/* Sync callback — wired by SyncProvider */

export type SyncCallback = (
  data: AppData,
  changed: ChangedTables,
) => void;

let _onMutation: SyncCallback | null = null;
let _userId: string | null = null;

export function setSyncCallback(
  cb: SyncCallback | null,
  userId?: string | null,
) {
  _onMutation = cb;
  if (userId !== undefined) _userId = userId;
}

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

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(data: AppData): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveData(data);
    saveTimer = null;
  }, 100);
}

/* Diff snapshots to determine changed tables for incremental sync */

function computeChanged(prev: AppData, next: AppData): ChangedTables {
  const changed: ChangedTables = {};
  if (prev.habits !== next.habits) changed.habits = true;
  if (prev.marks !== next.marks) {
    changed.marks = true;
    // Compute which individual mark dateKeys changed (Finding #4: dirty marks)
    const dirtyKeys: string[] = [];
    const allKeys = new Set([
      ...Object.keys(prev.marks),
      ...Object.keys(next.marks),
    ]);
    for (const key of allKeys) {
      if (JSON.stringify(prev.marks[key]) !== JSON.stringify(next.marks[key])) {
        dirtyKeys.push(key);
      }
    }
    if (dirtyKeys.length > 0) changed.dirtyMarkKeys = dirtyKeys;
  }
  if (prev.notes !== next.notes) changed.notes = true;
  if (prev.goals !== next.goals) changed.goals = true;
  if (prev.settings !== next.settings) changed.settings = true;
  if (prev.profile !== next.profile) changed.profile = true;
  if (prev.unlocks !== next.unlocks) changed.unlocks = true;
  if (prev.economy !== next.economy) changed.economy = true;
  if (prev.progressSeen !== next.progressSeen) changed.progressSeen = true;
  return changed;
}

function update(
  updater: (prev: AppData) => AppData,
  recordHistory = true,
): void {
  const prev = getSnapshot();
  if (recordHistory) {
    pushSnapshot(prev);
  }
  cache = updater(prev);
  // Compute what changed for sync
  const changed = computeChanged(prev, cache);
  // Instant save for undo/redo; debounced for high-frequency toggles.
  if (!recordHistory) {
    scheduleSave(cache);
  } else {
    if (saveTimer) clearTimeout(saveTimer);
    saveData(cache);
  }
  // Notify sync layer (if user is logged in)
  if (_onMutation && _userId) {
    _onMutation(cache, changed);
  }
  for (const listener of listeners) listener();
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Selector hook — subscribe to a specific slice of AppData to avoid re-renders on unrelated mutations.
export function useAppDataSelector<T>(selector: (data: AppData) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getServerSnapshot()),
  );
}

/* ---------------- audit helpers ---------------- */

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
    auditLog: audit(
      prev,
      "habit.create",
      `Created “${habit.name}”`,
      habit.id,
      undefined,
      habit,
    ),
  }));
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
        `Deleted “${before.name}”`,
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
      deletedAt: undefined, // ensure copy starts as active, never inherits deletedAt
    };
    return {
      ...prev,
      habits: [...prev.habits, copy],
      auditLog: audit(
        prev,
        "habit.duplicate",
        `Duplicated “${src.name}”`,
        copy.id,
        undefined,
        copy,
      ),
    };
  });
}

/* ---------------- marks (anti-cheat guarded) ---------------- */

// Cycle a mark. Past/future days are locked per Honest Tracking Policy. Also progresses daily quest.
export function cycleMark(
  dateK: string,
  habitId: string,
  habitCategory?: string,
): void {
  // Skip history for individual mark toggles — they're high-frequency and
  // undoing a single mark is rarely the desired action. Users can still undo
  // habit creation/editing/deletion and bulk actions.
  update((prev) => {
    const now = new Date();
    const grace = prev.settings.graceHours ?? DEFAULT_GRACE_HOURS;
    if (!canEditMark(dateK, now, grace)) return prev;
    const day = { ...(prev.marks[dateK] ?? {}) };
    const next = nextStatus(day[habitId]);
    if (next === undefined) delete day[habitId];
    else day[habitId] = next;
    const updated = { ...prev, marks: { ...prev.marks, [dateK]: day } };
    // Marking can satisfy achievements — persist any new unlocks for popups.
    const { unlocks } = reconcileUnlocks(
      updated,
      now,
      now.toISOString(),
    );
    // Progress daily quest if marking done today
    const todayKey = dateKey(now);
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
              item: "freeze",
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
    }
    return unlocks === updated.unlocks
      ? { ...updated, economy: eco }
      : { ...updated, unlocks, economy: eco };
  }, false); // recordHistory = false for performance
}

/* ---------------- notes ---------------- */

export function addNote(input: {
  body: string;
  tags?: string[];
  links?: NoteLinks;
}): Note {
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

export function updateNote(
  id: string,
  patch: Partial<Omit<Note, "id" | "createdAt">>,
): void {
  update((prev) => ({
    ...prev,
    notes: prev.notes.map((n) =>
      n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
    ),
  }));
}

export function deleteNote(id: string): void {
  update((prev) => ({
    ...prev,
    notes: prev.notes.map((n) =>
      n.id === id ? { ...n, deletedAt: new Date().toISOString() } : n,
    ),
  }));
}

// Upsert the single "daily note" for a date (used by Today's quick note box).
export function setDailyNote(dateK: string, text: string): void {
  update((prev) => {
    const existing = prev.notes.find(
      (n) => n.links.date === dateK && !n.links.habitId && !n.links.goalId,
    );
    const trimmed = text.trim();
    if (existing) {
      if (trimmed === "") {
        return {
          ...prev,
          notes: prev.notes.map((n) =>
            n.id === existing.id
              ? { ...n, deletedAt: new Date().toISOString() }
              : n,
          ),
        };
      }
      return {
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === existing.id
            ? { ...n, body: text, updatedAt: new Date().toISOString(), deletedAt: undefined }
            : n,
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
  update((prev) => ({
    ...prev,
    goals: prev.goals.map((g) =>
      g.id === id ? { ...g, deletedAt: new Date().toISOString() } : g,
    ),
  }));
}

/* ---------------- settings ---------------- */

export function setTheme(patch: Partial<ThemeSettings>): void {
  update((prev) => ({
    ...prev,
    settings: { ...prev.settings, theme: { ...prev.settings.theme, ...patch } },
  }));
}

export function setGraceHours(hours: number): void {
  update((prev) => ({
    ...prev,
    settings: { ...prev.settings, graceHours: Math.max(0, hours) },
  }));
}

export function setAutoFreezeThreshold(threshold: number): void {
  update((prev) => ({
    ...prev,
    settings: {
      ...prev.settings,
      autoFreezeThreshold: threshold > 0 ? threshold : undefined,
    },
  }));
}

export function setReducedMotion(reduced: boolean): void {
  update((prev) => ({
    ...prev,
    settings: { ...prev.settings, reducedMotion: reduced },
  }));
  // Apply immediately via data attribute so animations stop right away
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute(
      "data-reduced-motion",
      reduced ? "true" : "false",
    );
  }
}

export function markTemplateUsed(templateId: string): void {
  update((prev) => {
    const used = new Set(prev.settings.usedTemplateIds ?? []);
    used.add(templateId);
    return {
      ...prev,
      settings: { ...prev.settings, usedTemplateIds: [...used] },
    };
  });
}

export function completeOnboarding(): void {
  update((prev) => ({
    ...prev,
    settings: { ...prev.settings, onboardingComplete: true },
  }));
}

export function addCustomCategory(name: string): void {
  update((prev) => {
    const existing = prev.settings.customCategories ?? [];
    if (existing.includes(name)) return prev;
    return {
      ...prev,
      settings: { ...prev.settings, customCategories: [...existing, name] },
    };
  });
}

export function removeCustomCategory(name: string): void {
  update((prev) => ({
    ...prev,
    settings: {
      ...prev.settings,
      customCategories: (prev.settings.customCategories ?? []).filter(
        (c) => c !== name,
      ),
    },
  }));
}

export function resetTemplateUsage(templateId: string): void {
  update((prev) => ({
    ...prev,
    settings: {
      ...prev.settings,
      usedTemplateIds: (prev.settings.usedTemplateIds ?? []).filter(
        (id) => id !== templateId,
      ),
    },
  }));
}

export function clearAllData(): void {
  // Bump the generation BEFORE the update to signal any in-flight fullResync
  // that its merge result is based on stale data and should be aborted.
  bumpDataGeneration();

  // Wipe tracked data + unlocks (history is gone), but preserve the user's
  // settings, profile identity, and owned/equipped cosmetics (those were
  // purchased with coins legitimately earned from now-deleted history).
  // Economy ledger resets: coins are derived from history, so wiping history
  // must zero the ledger. Owned cosmetics survive the wipe.
  update((prev) => ({
    ...emptyData,
    settings: prev.settings,
    profile: prev.profile,
    economy: {
      ...emptyData.economy,
      owned: prev.economy.owned,
      equipped: prev.economy.equipped,
      freezes: [], // don't preserve orphaned freeze entries (marks are wiped)
    },
    progressSeen: {
      ...emptyData.progressSeen,
      seeded: prev.progressSeen.seeded,
    },
  }));
}

/* ---------------- developer mode (raw data access) ---------------- */

// Replace the entire data snapshot (Developer Mode data tools). Goes through
// update() so it persists + notifies like any other mutation.
export function replaceData(next: AppData): void {
  update(() => next);
}

// Functional counterpart to replaceData — applies `updater` against the LIVE
// store state rather than a (possibly stale) React render snapshot. Dev tools
// must use this for additive actions (add coins/XP, unlock-all) so repeated
// clicks stack correctly and never clobber concurrent changes with stale data.
export function mutateData(
  updater: (prev: AppData) => AppData,
  recordHistory = true,
): void {
  update(updater, recordHistory);
}

// Re-read from localStorage into the cache and notify. Used after a raw write
// so the validated/migrated result flows back through the normal load path.
function reloadData(): void {
  cache = loadData();
  for (const listener of listeners) listener();
}

// Invalidate the in-memory cache so the next getSnapshot() re-reads from
// localStorage. Used after the sync layer pulls data from Supabase.
export function reloadCache(): void {
  cache = null;
  for (const listener of listeners) listener();
}



// Write a raw JSON string straight to storage, then reload through loadData so
// every validator/migration runs on it. Returns an error message or null on
// success. Developer Mode only.
// After writing, fires the sync callback so changes are pushed to Supabase
// (previously only mutated localStorage, never triggering a push).
//
// IMPORTANT: Bumps the data generation to abort any in-flight fullResync that
// loaded stale data before this write (same pattern as clearAllData).
export function importRawData(text: string): string | null {
  if (typeof window === "undefined") return "No storage available";
  try {
    const parsed = JSON.parse(text);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return "Root must be a JSON object";
    }
    // Bump generation BEFORE the localStorage write (reloadData triggers
    // listeners that could race with in-flight fullResync).
    bumpDataGeneration();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    reloadData();
    // Fire sync callback — importRawData bypasses the normal update() path
    // which would have triggered _onMutation. Without this, imported JSON
    // changes stay in localStorage but never get pushed to Supabase.
    if (_onMutation && _userId && cache) {
      const changed: ChangedTables = {
        habits: true,
        marks: true,
        notes: true,
        goals: true,
        settings: true,
        profile: true,
        unlocks: true,
        economy: true,
        progressSeen: true,
      };
      _onMutation(cache, changed);
    }
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
  const prev = getSnapshot();
  const { unlocks, newlyUnlocked } = reconcileUnlocks(
    prev,
    new Date(),
    new Date().toISOString(),
  );
  if (newlyUnlocked.length === 0) return; // nothing to seed, skip history
  update(() => {
    const seeded = { ...unlocks };
    for (const id of newlyUnlocked) seeded[id] = { ...seeded[id], seen: true };
    return { ...prev, unlocks: seeded };
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

/* ---------------- celebrations (unified queue) ---------------- */

// One-time baseline: record current level/title/shop/streak progress as already
// "seen" so a returning user (or a pre-v5 save) doesn't get flooded with
// celebrations for progress earned before this feature existed. Idempotent — a
// no-op once `seeded` is set. Call once on app mount (mirrors seedUnlocksSeen).
export function seedCelebrationsSeen(): void {
  update((prev) => {
    if (prev.progressSeen.seeded) return prev;
    return { ...prev, progressSeen: baselineProgressSeen(prev, new Date()) };
  });
}

// Mark a celebration as seen by advancing the matching progressSeen marker (or,
// for achievements, the unlock's seen flag). Called when the center popup is
// dismissed, which drops the event from the derived queue and reveals the next.
export function acknowledgeCelebration(event: CelebrationEvent): void {
  if (event.kind === "achievement") {
    if (event.achievementId) markAchievementsSeen([event.achievementId]);
    return;
  }
  update((prev) => {
    const ps = prev.progressSeen;
    let next: typeof ps | null = null;
    // Reward coins granted alongside advancing the seen-marker. Tied to the
    // one-time marker bump so an event can never pay out twice.
    let bonus = 0;
    if (
      event.kind === "levelup" &&
      event.level != null &&
      event.level > ps.level
    ) {
      next = { ...ps, level: event.level };
      bonus = levelUpCoinsBetween(ps.level, event.level);
    } else if (
      event.kind === "title" &&
      event.titleName &&
      event.titleName !== ps.title
    ) {
      next = { ...ps, title: event.titleName };
    } else if (
      event.kind === "shop" &&
      event.shopId &&
      !ps.shop.includes(event.shopId)
    ) {
      next = { ...ps, shop: [...ps.shop, event.shopId] };
    } else if (
      event.kind === "streak" &&
      event.habitId &&
      event.tier != null &&
      event.tier > (ps.streaks[event.habitId] ?? 0)
    ) {
      next = { ...ps, streaks: { ...ps.streaks, [event.habitId]: event.tier } };
      bonus = streakMilestoneReward(event.tier);
    } else if (event.kind === "tier" && event.tier != null) {
      const rarity = (Object.entries(RARITY_ORDER) as [string, number][])
        .find(([, order]) => order === event.tier)?.[0];
      if (rarity && !ps.tierUnlocks.includes(rarity)) {
        next = { ...ps, tierUnlocks: [...ps.tierUnlocks, rarity] };
      }
    } else if (
      event.kind === "goal" &&
      event.goalId &&
      !ps.completedGoals.includes(event.goalId)
    ) {
      next = { ...ps, completedGoals: [...ps.completedGoals, event.goalId] };
    }
    if (!next) return prev;
    const economy =
      bonus > 0
        ? { ...prev.economy, bonusCoins: prev.economy.bonusCoins + bonus }
        : prev.economy;
    return { ...prev, progressSeen: next, economy };
  });
}

/* ---------------- economy (coins / shop / freezes) ---------------- */

// Spendable balance for the current data snapshot. Derives earned coins from
// history (same path as the UI) minus the persisted spend ledger.
function balanceOf(data: AppData, today: Date): number {
  const stats = buildGameStats(
    data.habits,
    data.marks,
    today,
    frozenSet(data.economy),
  );
  const unlockedRarities = evaluateAchievements(stats)
    .filter((a) => a.unlocked)
    .map((a) => a.def.rarity);
  return coinBalance(
    coinsEarned(stats, unlockedRarities, data.economy),
    data.economy,
  );
}

// Buy a cosmetic: must exist, not owned, meet level gate, affordable. Appends immutable spend entry. No-op if any guard fails.
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
      auditLog: audit(
        prev,
        "shop.buy",
        `Bought “${item.name}” for ${item.price} coins`,
        undefined,
        undefined,
        entry,
      ),
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
      economy: {
        ...prev.economy,
        equipped: { ...prev.economy.equipped, [slot]: itemId },
      },
    };
  });
}

// Apply streak freeze to a past miss. Costs coins, 1 per 7-day window.
export function redeemFreeze(habitId: string, dateK: string): void {
  update((prev) => {
    const today = new Date();
    if (!canUseFreeze(prev.economy, today)) return prev;
    if (!canFreezeDay(prev.economy, prev.marks, habitId, dateK)) return prev;
    if (balanceOf(prev, today) < FREEZE_PRICE) return prev;

    const nowIso = new Date().toISOString();
    const freeze = makeFreezeEntry(habitId, dateK, uid(), nowIso);
    const spend = {
      id: uid(),
      at: nowIso,
      amount: FREEZE_PRICE,
      item: "freeze",
    };
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

// Level for shop level gates (local helper).
function summarizeLevel(data: AppData, today: Date): number {
  return summarizeProgress(data, today).level.level;
}

/* ---------------- engagement features ---------------- */

// Claim daily check-in bonus. Returns reward + streak (0/0 if already claimed).
export function claimDailyCheckIn(): { reward: number; streak: number } {
  let result: { reward: number; streak: number } = { reward: 0, streak: 0 };
  update((prev) => {
    const now = new Date();
    const todayKey = dateKey(now);
    if (prev.economy.lastCheckIn === todayKey) return prev; // already claimed
    const prevStreak = prev.economy.checkInStreak;
    const yesterday = dateKey(addDays(now, -1));
    const streak = prev.economy.lastCheckIn === yesterday ? prevStreak + 1 : 1;
    const reward = checkInReward(streak);
    result = { reward, streak };
    return {
      ...prev,
      economy: {
        ...prev.economy,
        bonusCoins: prev.economy.bonusCoins + reward,
        lastCheckIn: todayKey,
        checkInStreak: streak,
      },
    };
  });
  return result;
}

// Refresh daily quest. Only generates if stored quest is from an older date or claimed.
export function refreshDailyQuest(): void {
  update((prev) => {
    const now = new Date();
    const todayKey = dateKey(now);
    // If today's quest already exists (claimed or unclaimed), don't regenerate
    if (prev.economy.lastQuestDate === todayKey) return prev;
    const quest = generateDailyQuest(prev.habits);
    return {
      ...prev,
      economy: {
        ...prev.economy,
        lastQuestDate: todayKey,
        currentQuest: quest ? { ...quest, current: 0 } : null,
      },
    };
  });
}

// Claim the daily quest reward. Only works if the quest is completed.
export function claimDailyQuest(): void {
  update((prev) => {
    const now = new Date();
    const q = prev.economy.currentQuest;
    if (!q || q.current < q.target || q.claimed) return prev;
    return {
      ...prev,
      economy: {
        ...prev.economy,
        bonusCoins: prev.economy.bonusCoins + q.reward,
        // Keep the quest around in a claimed state so the card stays visible
        // until midnight instead of vanishing the moment it's collected.
        currentQuest: { ...q, claimed: true },
        lastQuestDate: dateKey(now),
      },
    };
  });
}

// Do the daily spin. Returns the reward won, or null if already spun today.
export function doDailySpin(): {
  label: string;
  amount: number;
  isFreeze: boolean;
  originalLabel?: string;
} | null {
  let result: { label: string; amount: number; isFreeze: boolean; originalLabel?: string } | null = null;
  update((prev) => {
    const now = new Date();
    const todayKey = dateKey(now);
    if (prev.economy.lastSpinDate === todayKey) return prev; // already spun
    const reward = randomSpinReward();
    const isFreeze = reward.item === "freeze";
    // When the spin lands on "Streak Freeze", give a coin consolation prize
    // since a scatter-shot freeze entry can't target a real missed day.
    // Preserve the original reward label so the UI can display it properly.
    const effectiveAmount = isFreeze ? 25 : reward.amount;
    const effectiveLabel = isFreeze
      ? `25 coins (freeze consolation)`
      : reward.label;
    result = {
      label: effectiveLabel,
      amount: effectiveAmount,
      isFreeze,
      originalLabel: reward.label, // preserve original for display
    };
    return {
      ...prev,
      economy: {
        ...prev.economy,
        bonusCoins: prev.economy.bonusCoins + effectiveAmount,
        lastSpinDate: todayKey,
        lastSpinResult: result,
      },
    };
  });
  return result;
}

/* ---------------- undo / redo ---------------- */

// Undo the last action. Returns true if something was undone.
export function undoAction(): boolean {
  let didUndo = false;
  update((prev) => {
    const restored = undoHistory(prev);
    if (!restored) return prev;
    didUndo = true;
    // Preserve the current session's settings and profile to avoid losing
    // preferences when undoing
    return {
      ...restored,
      settings: prev.settings,
      profile: prev.profile,
    };
  }, false); // don't record history for undo itself
  return didUndo;
}

// Redo the last undone action. Returns true if something was redone.
export function redoAction(): boolean {
  let didRedo = false;
  update((prev) => {
    const restored = redoHistory(prev);
    if (!restored) return prev;
    didRedo = true;
    return {
      ...restored,
      settings: prev.settings,
      profile: prev.profile,
    };
  }, false); // don't record history for redo itself
  return didRedo;
}
