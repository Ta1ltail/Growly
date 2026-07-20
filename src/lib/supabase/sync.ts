"use client";

// Sync orchestration — manages the data flow between localStorage ↔ Supabase.
// Keeps syncState observable so the UI can show a sync indicator.
// All operations go through the browser Supabase client (client.ts).
//
// Strategy: Pull from Supabase FIRST, then merge remote changes on top of
// local. This prevents a stale local session from blowing away newer remote
// data. When both have changes for the same record, the NEWEST timestamp
// wins (Finding #7), with soft-deleted records propagating their deletion
// state across devices (Finding #2).

import { createClient } from "./client";
import {
  loadAllUserData,
  loadUserStatsSnapshot,
  saveChanged,
  saveUserStatsSnapshot,
  type ChangedTables,
} from "./db";
import {
  DEFAULT_PROGRESS_SEEN,
  type AppData,
  type Economy,
  type Profile,
  type ProgressSeen,
} from "../types";
import type { Habit, Note, Goal } from "../types";
import {
  loadData,
  saveData,
  saveStatsSnapshot,
  DEFAULT_GRACE_HOURS,
  type StatsSnapshotData,
} from "../storage";
import { summarizeProgress } from "../progress";
import { titleForLevel } from "../titles";
import { RANK_STYLE } from "../ranks";
import { consistencyScore } from "../stats";
// All 9 tables — used when pushing a full snapshot (login, merge, etc.)
const ALL_TABLES: ChangedTables = {
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

/* ────────────────────────────────────────────
   Sync state (observable)
   ──────────────────────────────────────────── */

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

let _status: SyncStatus = "idle";
const _listeners = new Set<() => void>();

function notify() {
  for (const l of _listeners) l();
}

export function getSyncStatus(): SyncStatus {
  return _status;
}

export function subscribeToSyncStatus(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function setStatus(s: SyncStatus, _error?: string) {
  _status = s;
  if (_error) {
    console.debug("[sync]", _error);
  }
  notify();
}

/* ────────────────────────────────────────────
   Sync-ready gate — prevents mount-time
   mutations from ever reaching Supabase.
   ────────────────────────────────────────────
   _syncReady starts as false on every page load.
   It's set to true ONLY after the initial
   fullResync completes successfully. Until then,
   pushMutation silently drops all writes — data
   is safely cached in localStorage and will be
   pushed once the gate opens.
   This is the single most important guard against
   cleared-localStorage corrupting cloud data. */

let _syncReady = false;

/**
 * Generation counter incremented before destructive operations (clearAllData,
 * importRawData) so that any in-flight fullResync that loaded stale local data
 * before the destructive write can detect the change and skip saving its
 * (now-stale) merged result back to localStorage. Without this, a racing
 * polling fullResync can resurrect data the user just cleared.
 */
let _dataGeneration = 0;

/** @visibleForTesting */
export function bumpDataGeneration(): void {
  _dataGeneration++;
}

export function setSyncReady(ready: boolean): void {
  _syncReady = ready;
}

/** Check whether the sync-ready gate is currently open. */
export function getSyncReady(): boolean {
  return _syncReady;
}



/* ────────────────────────────────────────────
   Retry queue for failed pushes
   ──────────────────────────────────────────── */

interface QueuedPush {
  userId: string;
  data: AppData;
  changed: ChangedTables;
  attempts: number;
}

let _retryQueue: QueuedPush[] = [];
let _retryTimer: ReturnType<typeof setTimeout> | null = null;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

function processRetryQueue() {
  if (_retryTimer) {
    clearTimeout(_retryTimer);
    _retryTimer = null;
  }
  if (_retryQueue.length === 0) return;

  _retryTimer = setTimeout(async () => {
    const batch = [..._retryQueue];
    _retryQueue = [];

    for (const item of batch) {
      if (item.attempts >= MAX_RETRIES) {
        console.warn("[sync] Retry exhausted for push, discarding:", item.changed);
        setStatus("error", "Sync failed after retries");
        continue;
      }
      try {
        const supabase = createClient();

        // Check session before retrying — the session may not have been ready
        // on the original attempt (fresh registration). If still not ready,
        // re-queue without counting it as a wasted attempt.
        const { data: { user: verifiedUser } } =
          await supabase.auth.getUser();
        if (!verifiedUser) {
          console.warn("[sync] Retry: session still not ready, re-queuing");
          _retryQueue.push(item); // same attempts count, not incremented
          continue;
        }

        await saveChanged(supabase, item.userId, item.data, item.changed);
        setStatus("idle");
      } catch {
        // Re-queue with incremented attempt count
        _retryQueue.push({ ...item, attempts: item.attempts + 1 });
      }
    }

    // If there are still items in the queue after processing, schedule another run
    if (_retryQueue.length > 0) {
      processRetryQueue();
    }
  }, RETRY_DELAY_MS);
}

function enqueueRetry(
  userId: string,
  data: AppData,
  changed: ChangedTables,
): void {
  _retryQueue.push({ userId, data, changed, attempts: 1 });
  processRetryQueue();
}

// Stats snapshots are NOT updated from within fullResync. Instead, fullResync
// loads the existing remote stats snapshot from Supabase and caches it to
// localStorage — same treatment as economy_state. This prevents a cleared
// localStorage from triggering a stale recomputation (summarizeProgress on
// potentially corrupted marks data) that would overwrite the correct Level 23
// with a computed Level 11.
//
/* ────────────────────────────────────────────
   Full re-sync: pull all remote data and merge
   with local. Called on login and periodically.
   ────────────────────────────────────────────
   Strategy:
   1. Pull remote data FIRST (don't push local first)
   2. Merge by ID: combine local and remote records, with local winning
      on conflicts. This prevents stale local data from overwriting newer
      remote data created on other devices.
   3. Push the merged result back up only if something actually changed.
*/

export async function fullResync(
  userId: string,
  quiet = false,
): Promise<AppData | null> {
  const supabase = createClient();
  if (!quiet) setStatus("syncing");

  // Capture generation BEFORE any async work, so we can detect if a
  // destructive write (clearAllData, importRawData) fires while we fetch.
  const dataGenAtStart = _dataGeneration;

  try {
    const localData = loadData();

    // ── Step 1: Pull the latest remote data ──
    let remoteData: AppData | null = null;
    try {
      remoteData = await loadAllUserData(supabase, userId);
    } catch (pullErr) {
      if (!quiet) {
        console.warn("[sync] Pull failed, keeping local data:", pullErr);
        setStatus("error", "Could not fetch remote data");
      }
      return localData;
    }

    // ── Step 2: Merge by ID (union), local wins on conflict ──
    if (remoteData) {
      // Guard: if the data generation changed while we were fetching, a
      // destructive operation (clearAllData, importRawData) wrote to
      // localStorage. Our merge result is based on stale data — abort the
      // save to prevent data resurrection. Return the latest local state.
      if (dataGenAtStart !== _dataGeneration) {
        const currentLocal = loadData();
        if (!quiet) {
          setSyncReady(true);
          setStatus("idle");
        }
        return currentLocal;
      }

      // Re-read local data immediately before merging to catch any in-flight
      // user mutations that may have written to localStorage during the async
      // remote fetch above. This prevents a stale `localData` from being used
      // as the merge base, which could clobber the user's latest changes.
      const freshLocal = loadData();
      const merged = mergeAppData(freshLocal, remoteData);

      // Save merged result to localStorage
      saveData(merged);

      // ── Step 3: Only push back during non-quiet sync (initial login) ──
      // Quiet mode (polling, realtime) must NEVER push to Supabase — it only
      // updates the local cache. This eliminates the race between polling
      // fullResync and user mutations going through the save queue.
      if (!quiet && hasChanges(merged, remoteData)) {
        try {
          await saveChanged(supabase, userId, merged, ALL_TABLES);
        } catch (pushErr) {
          if (!quiet) {
            console.warn("[sync] Push of merged data failed, local is up to date:", pushErr);
          }
        }
      }

      if (!quiet) {
        // Load stats snapshot from Supabase (not computed from local data),
        // then save to localStorage so it survives page reloads.
        try {
          const remoteStats = await loadUserStatsSnapshot(supabase, userId);
          if (remoteStats) {
            saveStatsSnapshot(remoteStats);
          }
        } catch {
          // Non-critical — stats snapshot is derived data, app works without it
        }
      }

      if (!quiet) {
        // ══ Recompute stats snapshot from merged data ══
        // The stats snapshot in Supabase may have been set by a one-time seed
        // or the now-removed refreshStatsSnapshot function. Since marks may
        // have changed during the merge, we must recompute stats from the
        // merged data to keep the snapshot authoritative. Without this, the
        // DB-level stats (level, streaks, completions) diverge permanently
        // from what the UI computes from marks.
        try {
          const now = new Date();
          const summary = summarizeProgress(merged, now);
          const title = titleForLevel(summary.level.level);
          const rankStyle = RANK_STYLE[title.current.rank];
          const stats: StatsSnapshotData = {
            level: summary.level.level,
            currentStreak: summary.stats.maxCurrentStreak,
            bestStreak: summary.stats.maxBestStreak,
            totalCompletions: summary.stats.doneCount,
            consistency14d: consistencyScore(merged.habits, merged.marks, now, 14),
            achievementCount: summary.unlockedCount,
            titleName: title.current.name,
            rankIcon: rankStyle.icon,
            updatedAt: new Date().toISOString(),
          };
          // Save to localStorage so the UI can read it even when offline
          saveStatsSnapshot(stats);
          // Write stats snapshot directly to Supabase so the public profile /
          // leaderboard stays current. Migration 009 restored client INSERT/UPDATE
          // on user_stats_snapshots after the recompute-progression Edge Function
          // proved unreliable (503 errors).
          try {
            await saveUserStatsSnapshot(supabase, userId, stats);
          } catch (statsPushErr) {
            console.warn("[sync] Failed to push stats snapshot:", statsPushErr);
          }
        } catch (statsErr) {
          // Non-critical — the merged data IS saved to localStorage and Supabase
          // via the push above. The stats snapshot is derived data that can lag.
          console.warn("[sync] Stats snapshot recompute failed:", statsErr);
        }
      }

      if (!quiet) {
        // ══ Open the sync-ready gate ══
        // After a successful pull+merge, mount-time mutations can safely push.
        setSyncReady(true);
        setStatus("idle");
      }

      return merged;
    }

    // ── Step 4: No remote data (new user) — push local data up ──
    const hasLocalData =
      localData.habits.length > 0 ||
      Object.keys(localData.marks).length > 0;

    if (hasLocalData) {
      // Verify session before pushing local data (new user registration)
      if (!(await verifySessionReady(supabase))) {
        if (!quiet) setStatus("offline");
        return localData;
      }
      try {
        await saveChanged(supabase, userId, localData, ALL_TABLES);
      } catch (pushErr) {
        if (!quiet) {
          console.warn("[sync] Initial push for new user failed:", pushErr);
        }
      }
    }

    if (!quiet) {
      // ══ Open the sync-ready gate for new users too ══
      // If the user has local data, mount-time mutations after this point
      // should push to Supabase. Without this gate, newly registered users'
      // mutations would be silently dropped forever (only polling pushes).
      setSyncReady(true);
      setStatus("idle");
    }
    return localData;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    if (!quiet) {
      console.error("[sync] fullResync failed:", msg);
      setStatus("error", msg);
    }
    return null;
  }
}

/* ────────────────────────────────────────────
   Merge helper: combine local and remote AppData
   by ID (union), REMOTE wins on conflict.
   The database is the single source of truth.
   ──────────────────────────────────────────── */

function mergeAppData(local: AppData, remote: AppData): AppData {
  // Fresh-login fast path: this branch only runs when REMOTE has real data.
  // If LOCAL carries no habits and no marks, it's a just-cleared snapshot (the
  // previous sign-out wiped localStorage) whose singleton state is nothing but
  // hardcoded defaults — possibly already mutated by a mount-time celebration
  // baseline. Adopt remote wholesale so we never clobber the user's real coins,
  // cosmetics, settings, unlocks, or celebration markers with those defaults.
  const localIsEmpty =
    local.habits.length === 0 && Object.keys(local.marks).length === 0;
  if (localIsEmpty) {
    return { ...remote, auditLog: local.auditLog };
  }

  // Remote is empty — adopt local entirely (nothing to merge).
  const remoteIsEmpty =
    remote.habits.length === 0 && Object.keys(remote.marks).length === 0;
  if (remoteIsEmpty) {
    return local;
  }

  // Merge habits by ID — newest timestamp wins (Finding #7), and
  // soft-deleted records propagate across devices (Finding #2).
  // Remote items are inserted LAST so they win on conflict.
  const mergedHabits = mergeById(
    local.habits,
    remote.habits,
    (h) => h.id,
    compareHabitTimestamp,
  );

  // Merge marks — union of date keys, REMOTE wins per habit per day
  const mergedMarks = { ...local.marks };
  for (const [dateKey, day] of Object.entries(remote.marks)) {
    mergedMarks[dateKey] = { ...(mergedMarks[dateKey] ?? {}), ...day };
  }

  // Merge notes by ID — newest timestamp wins, remote wins on tie
  const mergedNotes = mergeById(
    local.notes,
    remote.notes,
    (n) => n.id,
    compareNoteTimestamp,
  );

  // Merge goals by ID — newest timestamp wins, remote wins on tie
  const mergedGoals = mergeById(
    local.goals,
    remote.goals,
    (g) => g.id,
    compareGoalTimestamp,
  );

  // Merge unlocks — remote wins (database is source of truth)
  const mergedUnlocks = { ...local.unlocks, ...remote.unlocks };

  return {
    ...remote,
    auditLog: local.auditLog, // auditLog stays local only
    habits: mergedHabits,
    marks: mergedMarks,
    notes: mergedNotes,
    goals: mergedGoals,
    // Remote wins on all singleton tables (database is source of truth).
    // Local values are only preserved when remote has no data.
    settings: mergeSettings(local.settings, remote.settings),
    profile: mergeProfile(local.profile, remote.profile),
    unlocks: Object.keys(mergedUnlocks).length > 0 ? mergedUnlocks : remote.unlocks,
    economy: isEmptyEconomy(remote.economy) ? local.economy : remote.economy,
    progressSeen: mergeProgressSeen(local.progressSeen, remote.progressSeen),
  };
}

/** True when the economy holds no real player state (fresh/default snapshot).
 *  Economy is inherently interdependent (owned items require spend entries,
 *  freezes reference habits). An all-or-nothing check is safest here since
 *  field-level merging could produce inconsistent states (e.g., owning an
 *  item without a matching spend entry after a failed sync). */
/** @visibleForTesting */
export function isEmptyEconomy(e: Economy | undefined): boolean {
  if (!e) return true;
  return (
    (e.owned?.length ?? 0) === 0 &&
    (e.spent?.length ?? 0) === 0 &&
    (e.freezes?.length ?? 0) === 0 &&
    (e.bonusCoins ?? 0) === 0 &&
    (e.checkInStreak ?? 0) === 0 &&
    !e.lastCheckIn &&
    !e.lastQuestDate &&
    !e.currentQuest &&
    !e.lastSpinDate &&
    Object.keys(e.equipped ?? {}).length === 0
  );
}

/**
 * Merge settings with field-level granularity. REMOTE wins on all fields.
 * Local values are only preserved when remote has no data (undefined).
 * The database is the single source of truth.
 *
 * Edge cases considered:
 *  - Remote field present -> remote wins
 *  - Remote field absent (undefined) -> local wins
 *  - Remote is undefined entirely (DB error / new user) -> local entirely
 */
/** @visibleForTesting */
export function mergeSettings(
  local: AppData["settings"],
  remote: AppData["settings"] | undefined,
): AppData["settings"] {
  // Fast path: no remote data — trust local entirely.
  if (!remote) return local;

  return {
    theme: {
      mode: remote.theme.mode,
      accent: remote.theme.accent,
    },
    graceHours: remote.graceHours ?? DEFAULT_GRACE_HOURS,
    usedTemplateIds: remote.usedTemplateIds ?? [],
    widgetOrder: remote.widgetOrder,
    onboardingComplete: remote.onboardingComplete,
    customCategories: remote.customCategories ?? [],
  };
}

/**
 * Merge progressSeen — REMOTE wins on all fields.
 * The database is the single source of truth. Local values are only
 * preserved when remote has no data (undefined).
 * Unseeded data (from cleared localStorage) never overwrites seeded
 * remote to avoid re-firing past celebrations.
 */
/** @visibleForTesting */
export function mergeProgressSeen(
  local: ProgressSeen | undefined,
  remote: ProgressSeen | undefined,
): ProgressSeen {
  // Fast path: no remote data — trust local entirely.
  if (!remote) return local ?? DEFAULT_PROGRESS_SEEN;
  // Fast path: no local data — use remote entirely.
  if (!local) return remote;

  // An unseeded local (from cleared storage) should never overwrite a
  // seeded remote, because that would re-fire every past celebration
  // (level-ups, achievements) on each login.
  if (!local.seeded) return remote;
  if (!remote.seeded) return local;

  // Both seeded: remote wins (database is source of truth).
  return {
    seeded: true,
    level: remote.level,
    title: remote.title,
    shop: remote.shop,
    streaks: remote.streaks,
    tierUnlocks: remote.tierUnlocks,
  };
}

/**
 * Merge profile — REMOTE wins on all fields.
 * The database is the single source of truth. Local values are only
 * preserved when remote has no data (undefined).
 *
 * Key behaviors:
 *  - All fields prefer the remote value.
 *  - Remote being undefined (DB error / new user) -> local entirely.
 */
/** @visibleForTesting */
export function mergeProfile(local: Profile, remote: Profile | undefined): Profile {
  // Fast path: no remote data — trust local entirely.
  if (!remote) return local;

  return {
    // All fields: remote wins (database is source of truth).
    // Local value is only used when remote doesn't have it.
    displayName: remote.displayName,
    username: remote.username,
    bio: remote.bio ?? undefined,
    motto: remote.motto ?? undefined,
    avatar: remote.avatar ?? undefined,
    banner: remote.banner ?? undefined,
    showcaseBadgeId: remote.showcaseBadgeId ?? undefined,
  };
}

/**
 * Merge two arrays by ID, with optional timestamp-based conflict resolution.
 * When a `compare` function is provided, the NEWER item wins (Finding #7).
 * Without a compare function, REMOTE wins (database is source of truth).
 * Soft-deleted records (with `deletedAt`) are treated as "newer" than live
 * ones of the same ID, so deletions propagate across devices (Finding #2).
 *
 * IMPORTANT: remote is passed as the SECOND argument so that when
 * both items have the same timestamp, the remote value wins (it's
 * inserted last).
/** @visibleForTesting */
export function mergeById<T extends { id: string }>(
  first: T[],
  second: T[],
  getId: (item: T) => string = (item) => item.id,
  compare?: (a: T, b: T) => number, // positive = a is newer/more-important
): T[] {
  const map = new Map<string, T>();

  const insert = (item: T) => {
    const key = getId(item);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else if (compare) {
      // Use comparison function: keep the newer/more-important item
      if (compare(item, existing) > 0) {
        map.set(key, item);
      }
    } else {
      // No comparator: second wins (inserted later = more recent,
      // and database is the source of truth)
      map.set(key, item);
    }
  };

  // Process first items FIRST, then second items — second items are
  // inserted last, so they win on conflict (database is source of truth).
  // When a `compare` function is used, the newer/more-important
  // item wins regardless of insertion order.
  //
  // IMPORTANT: The callers pass (local, remote) so that remote wins.
  for (const item of first) insert(item);
  for (const item of second) insert(item);

  return Array.from(map.values());
}

// ── Timestamp comparison helpers (Finding #7 + Finding #2) ──
//
// Each comparator returns a number: positive = `a` is newer/more-important.
// The comparison considers:
//   1. deletedAt — if one has deletedAt and the other doesn't, the deleted
//      one wins (propagates the deletion). If both have deletedAt, the
//      newer deletion wins.
//   2. createdAt/updatedAt — if neither is deleted, the newer timestamp wins.

/** Compare two Habits by timestamp. Prefers deleted over live. */
function compareHabitTimestamp(a: Habit, b: Habit): number {
  // Deletion wins over non-deletion
  if (a.deletedAt && !b.deletedAt) return 1;
  if (!a.deletedAt && b.deletedAt) return -1;
  // Both deleted or both live: compare by last-changed timestamp
  const aTime = a.deletedAt ?? a.createdAt;
  const bTime = b.deletedAt ?? b.createdAt;
  return aTime.localeCompare(bTime);
}

/** Compare two Notes by timestamp. Prefers deleted over live. */
function compareNoteTimestamp(a: Note, b: Note): number {
  if (a.deletedAt && !b.deletedAt) return 1;
  if (!a.deletedAt && b.deletedAt) return -1;
  const aTime = a.deletedAt ?? a.updatedAt;
  const bTime = b.deletedAt ?? b.updatedAt;
  return aTime.localeCompare(bTime);
}

/** Compare two Goals by timestamp. Prefers deleted over live. */
function compareGoalTimestamp(a: Goal, b: Goal): number {
  if (a.deletedAt && !b.deletedAt) return 1;
  if (!a.deletedAt && b.deletedAt) return -1;
  const aTime = a.deletedAt ?? a.createdAt;
  const bTime = b.deletedAt ?? b.createdAt;
  return aTime.localeCompare(bTime);
}

/** Deep compare two AppData objects (excluding auditLog) */
function hasChanges(a: AppData, b: AppData): boolean {
  return (
    JSON.stringify({ ...a, auditLog: [] }) !==
    JSON.stringify({ ...b, auditLog: [] })
  );
}

/* ────────────────────────────────────────────
   Helper: verify the auth session is ready before pushing.
   On fresh registration the auth.users record may not have
   propagated yet, causing all FK constraints to fail.
   ──────────────────────────────────────────── */

async function verifySessionReady(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn("[sync] Session not ready yet: no user");
    return false;
  }
  return true;
}

// Lightweight, network-free session check for the hot per-mutation push path.
// Unlike getUser() (a round-trip to the auth server on every mark toggle), this
// reads the locally-cached session. The heavier verifySessionReady() is still
// used on fresh registration where server-side propagation must be confirmed.
async function hasLocalSession(
  supabase: ReturnType<typeof createClient>,
): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

/* ────────────────────────────────────────────
   Push: send mutation changes to Supabase
   ────────────────────────────────────────────
   Called after every store mutation when the user is logged in.
   Uses incremental save (only changed tables). On failure, enqueues
   the mutation for retry.

   ══ Sync-ready gate ══
   pushMutation silently returns if _syncReady is false. This prevents
   mount-time mutations (seedCelebrationsSeen, refreshDailyQuest,
   claimDailyCheckIn, etc.) from EVER pushing empty/default data to
   Supabase during the window before fullResync completes.
   Mutation data is safely cached in localStorage and will be pushed
   once the sync-ready gate opens. */

export async function pushMutation(
  userId: string,
  data: AppData,
  changed: ChangedTables,
): Promise<void> {
  // ══ Sync-ready gate: silently drop if initial sync hasn't completed ══
  if (!_syncReady) {
    return;
  }

  setStatus("syncing");

  try {
    const supabase = createClient();

    // Fast, network-free session check on this hot path. If there's no cached
    // session at all, queue for retry (verifySessionReady's server round-trip
    // is reserved for the fresh-registration path in fullResync).
    if (!(await hasLocalSession(supabase))) {
      enqueueRetry(userId, data, changed);
      setStatus("offline");
      return;
    }

    await saveChanged(supabase, userId, data, changed);
    // Stats snapshots are updated only by fullResync (on initial load and
    // periodic polling), not by per-mutation pushes. Computing stats from
    // `loadData()` inside a debounced timer that fires after as-yet-unknown
    // state changes can write stale Level-11 data over the user's real Level
    // 23 — races we can't win. The polling fallback ensures stats stay
    // current without this corruption risk.
    setStatus("idle");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    const details = e instanceof Error ? e.stack ?? "" : "";
    const errorCode =
      e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    console.error(
      "[sync] Push failed:",
      msg,
      errorCode ? `(code: ${errorCode})` : "",
      "\n",
      details,
    );
    setStatus("error", msg);

    // Enqueue for retry — the mutation is already saved to localStorage,
    // so no data is lost. The retry queue will attempt to push again.
    enqueueRetry(userId, data, changed);
  }
}

/* ────────────────────────────────────────────
   Reset retry state (called on sign-out)
   ──────────────────────────────────────────── */

export function resetSyncState(): void {
  _retryQueue = [];
  if (_retryTimer) {
    clearTimeout(_retryTimer);
    _retryTimer = null;
  }
  setStatus("idle");
}

