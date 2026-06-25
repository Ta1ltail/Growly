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
import { buildGameStats, evaluateAchievements } from "./achievements";
import { baselineProgressSeen, type CelebrationEvent } from "./celebrations";
import {
  pushSnapshot,
  undo as undoHistory,
  redo as redoHistory,
} from "./history";

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

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(data: AppData): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveData(data);
    saveTimer = null;
  }, 100);
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
  // Immediate save for undo/redo and destructive actions, debounced for
  // high-frequency toggles (mark cycling, text input).
  if (!recordHistory) {
    scheduleSave(cache);
  } else {
    if (saveTimer) clearTimeout(saveTimer);
    saveData(cache);
  }
  for (const listener of listeners) listener();
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Granular selector hook — subscribe to a specific slice of AppData so
// components re-render only when their relevant data changes, not on every
// store mutation. Usage:
//   const habits = useAppDataSelector((d) => d.habits);
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
    return {
      ...prev,
      habits: prev.habits.filter((h) => h.id !== id),
      auditLog: audit(
        prev,
        "habit.delete",
        `Deleted “${before?.name ?? "habit"}”`,
        id,
        before,
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

// Cycle a mark. Past/future days are locked per the Honest Tracking Policy,
// so this is a no-op outside the editable window. Also progresses the daily
// quest when a habit is marked "done" today.
export function cycleMark(
  dateK: string,
  habitId: string,
  habitCategory?: string,
): void {
  // Skip history for individual mark toggles — they're high-frequency and
  // undoing a single mark is rarely the desired action. Users can still undo
  // habit creation/editing/deletion and bulk actions.
  update((prev) => {
    const grace = prev.settings.graceHours ?? DEFAULT_GRACE_HOURS;
    if (!canEditMark(dateK, new Date(), grace)) return prev;
    const day = { ...(prev.marks[dateK] ?? {}) };
    const next = nextStatus(day[habitId]);
    if (next === undefined) delete day[habitId];
    else day[habitId] = next;
    const updated = { ...prev, marks: { ...prev.marks, [dateK]: day } };
    // Marking can satisfy achievements — persist any new unlocks for popups.
    const { unlocks } = reconcileUnlocks(
      updated,
      new Date(),
      new Date().toISOString(),
    );
    // Progress daily quest if marking done today
    const todayKey = dateKey(new Date());
    let eco = updated.economy;
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
  update((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) }));
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
          notes: prev.notes.filter((n) => n.id !== existing.id),
        };
      }
      return {
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === existing.id
            ? { ...n, body: text, updatedAt: new Date().toISOString() }
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
  update((prev) => ({
    ...prev,
    settings: { ...prev.settings, graceHours: Math.max(0, hours) },
  }));
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
      freezes: prev.economy.freezes,
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

// Re-read from localStorage into the cache and notify. Used after a raw write
// so the validated/migrated result flows back through the normal load path.
function reloadData(): void {
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
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
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
    const { unlocks, newlyUnlocked } = reconcileUnlocks(
      prev,
      new Date(),
      new Date().toISOString(),
    );
    if (newlyUnlocked.length === 0) return prev;
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
      // Reverse-lookup rarity from RARITY_ORDER value
      const RARITY_BY_ORDER: Record<number, string> = {
        0: "common",
        1: "rare",
        2: "epic",
        3: "legendary",
      };
      const rarity = RARITY_BY_ORDER[event.tier];
      if (rarity && !ps.tierUnlocks.includes(rarity)) {
        next = { ...ps, tierUnlocks: [...ps.tierUnlocks, rarity] };
      }
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

// Level for the current snapshot — used for shop level gates. Local helper to
// avoid importing the full progress façade into the buy path twice.
function summarizeLevel(data: AppData, today: Date): number {
  return summarizeProgress(data, today).level.level;
}

/* ---------------- engagement features ---------------- */

// Claim the daily check-in bonus. Returns the reward amount and streak (0/0 if
// already claimed today, so the UI can skip showing the popup).
export function claimDailyCheckIn(): { reward: number; streak: number } {
  let result: { reward: number; streak: number } = { reward: 0, streak: 0 };
  update((prev) => {
    const todayKey = dateKey(new Date());
    if (prev.economy.lastCheckIn === todayKey) return prev; // already claimed
    const prevStreak = prev.economy.checkInStreak;
    const yesterday = dateKey(addDays(new Date(), -1));
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

// Refresh/generate the daily quest. Safe to call every time Today loads —
// only generates if the stored quest is from an older date or has been
// claimed (currentQuest is null despite lastQuestDate being today).
export function refreshDailyQuest(): void {
  update((prev) => {
    const todayKey = dateKey(new Date());
    // If quest was already claimed today (lastQuestDate=today, currentQuest=null), don't regenerate
    if (prev.economy.lastQuestDate === todayKey && !prev.economy.currentQuest)
      return prev;
    if (prev.economy.lastQuestDate === todayKey && prev.economy.currentQuest)
      return prev;
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
        lastQuestDate: dateKey(new Date()),
      },
    };
  });
}

// Do the daily spin. Returns the reward won, or null if already spun today.
export function doDailySpin(): {
  label: string;
  amount: number;
  isFreeze: boolean;
} | null {
  let result: { label: string; amount: number; isFreeze: boolean } | null =
    null;
  update((prev) => {
    const todayKey = dateKey(new Date());
    if (prev.economy.lastSpinDate === todayKey) return prev; // already spun
    const reward = randomSpinReward();
    const isFreeze = reward.item === "freeze";
    // When the spin lands on "Streak Freeze", give a coin consolation prize
    // since a scatter-shot freeze entry can't target a real missed day.
    const effectiveAmount = isFreeze ? 25 : reward.amount;
    const effectiveLabel = isFreeze
      ? `25 coins (freeze consolation)`
      : reward.label;
    result = { label: effectiveLabel, amount: effectiveAmount, isFreeze };
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

// Undo the last action. Returns true if something was undone, false if the
// stack was empty.
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

// Redo the last undone action. Returns true if something was redone, false if
// the stack was empty.
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
