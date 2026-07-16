"use client";

// Sync orchestration — manages the data flow between localStorage ↔ Supabase.
// Keeps syncState observable so the UI can show a sync indicator.
// All operations go through the browser Supabase client (client.ts).
//
// Strategy: Pull from Supabase FIRST, then merge remote changes on top of
// local. This prevents a stale local session from blowing away newer remote
// data. If both have changes, the local version wins for any given field
// (last-write-wins per table).

import { createClient } from "./client";
import {
  loadAllUserData,
  loadUserStatsSnapshot,
  saveChanged,
  type ChangedTables,
} from "./db";
import {
  DEFAULT_PROFILE,
  DEFAULT_PROGRESS_SEEN,
  type AppData,
  type Economy,
  type Profile,
  type ProgressSeen,
} from "../types";
import { DEFAULT_THEME } from "../theme";
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
          // Push to Supabase so the public profile / leaderboard stays current
          // Note: This is no longer a direct write — migration 008 revoked client
          // INSERT/UPDATE on user_stats_snapshots. The recompute-progression Edge
          // Function handles server-side stats. The local snapshot is saved to
          // localStorage and will be picked up by the next edge function call.
          void supabase.functions.invoke("recompute-progression").catch(() => {
            // Non-critical — edge function call is best-effort. Stats will be
            // recomputed on the next fullResync or login.
          });
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
   by ID (union), local wins on conflict.
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

  // Merge habits by ID — union of both, local overwrites same IDs
  const mergedHabits = mergeById(
    remote.habits,
    local.habits,
    (h) => h.id,
  );

  // Merge marks — union of date keys, local wins per habit per day
  const mergedMarks = { ...remote.marks };
  for (const [dateKey, day] of Object.entries(local.marks)) {
    mergedMarks[dateKey] = { ...(mergedMarks[dateKey] ?? {}), ...day };
  }

  // Merge notes by ID
  const mergedNotes = mergeById(
    remote.notes,
    local.notes,
    (n) => n.id,
  );

  // Merge goals by ID
  const mergedGoals = mergeById(
    remote.goals,
    local.goals,
    (g) => g.id,
  );

  // Merge unlocks by achievement_id
  const mergedUnlocks = { ...remote.unlocks, ...local.unlocks };

  return {
    ...remote,
    auditLog: local.auditLog, // auditLog stays local only
    habits: mergedHabits,
    marks: mergedMarks,
    notes: mergedNotes,
    goals: mergedGoals,
    // Singleton tables: field-level merge with the same pattern used in
    // mergeProfile — prefer local when it's been explicitly customized away
    // from its default/empty state, otherwise fall back to remote. This
    // prevents a cleared localStorage (fresh login) from wiping the user's
    // settings, economy, unlocks, or celebration markers, while still
    // respecting local customizations when the user has active data.
    settings: mergeSettings(local.settings, remote.settings),
    profile: mergeProfile(local.profile, remote.profile),
    unlocks:
      Object.keys(mergedUnlocks).length > 0
        ? mergedUnlocks
        : remote.unlocks,
    economy: isEmptyEconomy(local.economy) ? remote.economy : local.economy,
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
 * Merge settings with field-level granularity. Each field prefers the local
 * value when it has been explicitly customized away from its default/empty
 * state, otherwise falls back to the remote value. Consistent with
 * mergeProfile's approach.
 *
 * Edge cases considered:
 *  - Field not present locally (undefined) -> remote wins
 *  - Field set to empty array locally -> remote wins (empty = not customized)
 *  - Field set to non-default value locally -> local wins
 *  - Remote is undefined (DB error / new user) -> local entirely
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
      mode:
        local.theme.mode !== DEFAULT_THEME.mode
          ? local.theme.mode
          : remote.theme.mode,
      accent:
        local.theme.accent !== DEFAULT_THEME.accent
          ? local.theme.accent
          : remote.theme.accent,
    },
    graceHours:
      (local.graceHours ?? DEFAULT_GRACE_HOURS) !== DEFAULT_GRACE_HOURS
        ? (local.graceHours ?? DEFAULT_GRACE_HOURS)
        : (remote.graceHours ?? DEFAULT_GRACE_HOURS),
    usedTemplateIds: local.usedTemplateIds?.length
      ? local.usedTemplateIds
      : (remote.usedTemplateIds ?? []),
    widgetOrder:
      local.widgetOrder !== undefined
        ? local.widgetOrder
        : remote.widgetOrder,
    onboardingComplete:
      local.onboardingComplete !== undefined
        ? local.onboardingComplete
        : remote.onboardingComplete,
    customCategories: local.customCategories?.length
      ? local.customCategories
      : (remote.customCategories ?? []),
  };
}

/**
 * Merge progressSeen — prefers whichever has been baselined (seeded).
 * This is safe because progressSeen fields only ever ADVANCE monotonically
 * (level increases, streak tiers grow, shop unlocks accumulate). The
 * "seeded" flag marks whether the initial baseline has been written;
 * unseeded data (from a cleared localStorage) should never overwrite a
 * seeded remote to avoid re-firing past celebrations.
 *
 * Consistent with mergeProfile/mergeSettings: early return for undefined
 * remote, field-level fallback when both are seeded.
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

  // Prefer whichever has been baselined. An unseeded local (from cleared
  // storage) should never overwrite a seeded remote, because that would
  // re-fire every past celebration (level-ups, achievements) on each login.
  if (!local.seeded) return remote;
  if (!remote.seeded) return local;

  // Both seeded: local wins on individual fields when explicitly advanced
  // beyond defaults, otherwise remote wins. Consistent with mergeSettings.
  return {
    seeded: true,
    level: local.level > 1 ? local.level : remote.level,
    title: local.title !== "Habit Newbie" ? local.title : remote.title,
    shop: local.shop.length > 0 ? local.shop : remote.shop,
    streaks: Object.keys(local.streaks).length > 0
      ? local.streaks
      : remote.streaks,
    tierUnlocks: local.tierUnlocks.length > 0
      ? local.tierUnlocks
      : remote.tierUnlocks,
  };
}

/**
 * Merge profile — prefers the local profile when it has been explicitly
 * customized, but falls back to the remote (server-seeded) profile for
 * identity fields when local still carries the initial defaults.
 *
 * Key behaviors:
 *  - displayName/username/motto: local wins ONLY when it differs from the
 *    DEFAULT_PROFILE constant (meaning the user explicitly customized it
 *    during this session). The server-seeded version (from the SQL trigger
 *    on auth registration) is preferred otherwise.
 *  - bio/avatar/banner/showcaseBadgeId: optional fields use an explicit
 *    `!== undefined` check so that an intentionally empty string (`""`)
 *    set by the user is preserved, while `undefined` (never set) falls
 *    through to the remote value.
 *  - Fast-return when remote has no profile — avoid unnecessary comparisons.
 */
/** @visibleForTesting */
export function mergeProfile(local: Profile, remote: Profile | undefined): Profile {
  // Fast path: no remote data — trust local entirely.
  if (!remote) return local;

  return {
    // Identity fields: the server is the authority (generates unique
    // usernames and seeds display names from registration metadata).
    // Only use the local value when the user explicitly customized it
    // away from the initial default.
    displayName:
      local.displayName !== DEFAULT_PROFILE.displayName
        ? local.displayName
        : remote.displayName,
    username:
      local.username !== DEFAULT_PROFILE.username
        ? local.username
        : remote.username,
    // Optional fields: use `!== undefined` so that an empty string (`""`)
    // set by the user to "clear" a field is preserved, while a genuinely
    // unset field (undefined) delegates to the remote value.
    bio: local.bio !== undefined ? local.bio : remote.bio,
    motto:
      local.motto !== DEFAULT_PROFILE.motto
        ? local.motto
        : (remote.motto ?? DEFAULT_PROFILE.motto),
    avatar: local.avatar !== undefined ? local.avatar : remote.avatar,
    banner: local.banner !== undefined ? local.banner : remote.banner,
    showcaseBadgeId:
      local.showcaseBadgeId !== undefined
        ? local.showcaseBadgeId
        : remote.showcaseBadgeId,
  };
}

/** Merge two arrays by ID — remote items first, local overwrites same IDs */
/** @visibleForTesting */
export function mergeById<T extends { id: string }>(
  remote: T[],
  local: T[],
  getId: (item: T) => string = (item) => item.id,
): T[] {
  const map = new Map<string, T>();
  // Add remote items first
  for (const item of remote) {
    map.set(getId(item), item);
  }
  // Local overwrites same IDs
  for (const item of local) {
    map.set(getId(item), item);
  }
  return Array.from(map.values());
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

