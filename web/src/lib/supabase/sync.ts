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
  saveChanged,
  saveUserStatsSnapshot,
  type ChangedTables,
} from "./db";
import {
  DEFAULT_PROFILE,
  type AppData,
  type Economy,
  type Profile,
  type ProgressSeen,
} from "../types";
import { DEFAULT_THEME } from "../theme";
import { loadData, saveData, DEFAULT_GRACE_HOURS } from "../storage";
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
let _lastError: string | null = null;
const _listeners = new Set<() => void>();

function notify() {
  for (const l of _listeners) l();
}

export function getSyncStatus(): SyncStatus {
  return _status;
}

export function getLastSyncError(): string | null {
  return _lastError;
}

export function subscribeToSyncStatus(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function setStatus(s: SyncStatus, error?: string) {
  _status = s;
  if (error) _lastError = error;
  else if (s === "idle") _lastError = null;
  notify();
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

/* ────────────────────────────────────────────
   Stats snapshot helper — called after every
   successful sync to update public profile data.
   ──────────────────────────────────────────── */

// Debounce the (fairly heavy) stats snapshot so a burst of mark toggles results
// in a single recompute+upsert once the user pauses, instead of one per tap.
const SNAPSHOT_DEBOUNCE_MS = 3000;
let _snapshotTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleStatsSnapshot(userId: string): void {
  if (_snapshotTimer) clearTimeout(_snapshotTimer);
  _snapshotTimer = setTimeout(() => {
    _snapshotTimer = null;
    void refreshStatsSnapshot(userId);
  }, SNAPSHOT_DEBOUNCE_MS);
}

async function refreshStatsSnapshot(userId: string): Promise<void> {
  try {
    const data = loadData();
    const summary = summarizeProgress(data, new Date());
    const title = titleForLevel(summary.level.level);
    const rankStyle = RANK_STYLE[title.current.rank];

    const supabase = createClient();
    await saveUserStatsSnapshot(supabase, userId, {
      level: summary.level.level,
      currentStreak: summary.stats.maxCurrentStreak,
      bestStreak: summary.stats.maxBestStreak,
      totalCompletions: summary.stats.doneCount,
      consistency14d: consistencyScore(data.habits, data.marks, new Date(), 14),
      achievementCount: summary.unlockedCount,
      titleName: title.current.name,
      rankIcon: rankStyle.icon,
    });
  } catch (e) {
    // Non-critical — snapshot failures don't block the app
    console.warn("[sync] Stats snapshot refresh failed:", e);
  }
}

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
      const merged = mergeAppData(localData, remoteData);

      // Save merged result to localStorage
      saveData(merged);

      // ── Step 3: Only push back if merged data differs from remote ──
      if (hasChanges(merged, remoteData)) {
        try {
          await saveChanged(supabase, userId, merged, ALL_TABLES);
        } catch (pushErr) {
          if (!quiet) {
            console.warn("[sync] Push of merged data failed, local is up to date:", pushErr);
          }
        }
      }

      if (!quiet) {
        await refreshStatsSnapshot(userId);
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
      await refreshStatsSnapshot(userId);
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
    // Singleton tables: local wins ONLY when it holds real data. On a fresh
    // login (local was cleared on the previous sign-out) these locals are the
    // hardcoded defaults — picking `local ?? remote` there silently wipes the
    // user's coins, cosmetics, streaks, settings, and celebration markers and
    // then pushes the defaults back to the server. Prefer remote unless local
    // is genuinely customized/populated.
    settings: isDefaultSettings(local.settings) ? remote.settings : local.settings,
    profile: mergeProfile(local.profile, remote.profile),
    unlocks:
      Object.keys(mergedUnlocks).length > 0
        ? mergedUnlocks
        : remote.unlocks,
    economy: isEmptyEconomy(local.economy) ? remote.economy : local.economy,
    progressSeen: mergeProgressSeen(local.progressSeen, remote.progressSeen),
  };
}

/** True when the economy holds no real player state (fresh/default snapshot). */
function isEmptyEconomy(e: Economy | undefined): boolean {
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

/** True when settings are the untouched defaults (no real user customization). */
function isDefaultSettings(s: AppData["settings"] | undefined): boolean {
  if (!s) return true;
  return (
    s.theme?.mode === DEFAULT_THEME.mode &&
    s.theme?.accent === DEFAULT_THEME.accent &&
    (s.graceHours ?? DEFAULT_GRACE_HOURS) === DEFAULT_GRACE_HOURS &&
    (s.usedTemplateIds?.length ?? 0) === 0 &&
    !s.widgetOrder &&
    !s.onboardingComplete &&
    (s.customCategories?.length ?? 0) === 0
  );
}

/**
 * Prefer whichever progressSeen has actually been baselined. A cleared local
 * carries `seeded: false`; taking it over a `seeded: true` remote re-fires
 * every past celebration (level-ups, achievements) on each login.
 */
function mergeProgressSeen(
  local: ProgressSeen | undefined,
  remote: ProgressSeen | undefined,
): ProgressSeen {
  if (local?.seeded) return local;
  if (remote?.seeded) return remote;
  return local ?? remote ?? { seeded: false, level: 1, title: "", shop: [], streaks: {}, tierUnlocks: [] };
}

/**
 * Merge profile — prefer remote values when local has placeholder defaults.
 * The local profile may be DEFAULT_PROFILE (from clearLocalAppData) while the
 * remote profile was seeded by the SQL trigger with the user's registration
 * data and a unique username. We don't want to overwrite server-generated
 * identity fields with hardcoded placeholders.
 */
function mergeProfile(local: Profile, remote: Profile | undefined): Profile {
  return {
    displayName:
      local.displayName !== DEFAULT_PROFILE.displayName
        ? local.displayName
        : (remote?.displayName ?? local.displayName),
    username:
      local.username !== DEFAULT_PROFILE.username
        ? local.username
        : (remote?.username ?? local.username),
    bio: local.bio ?? remote?.bio,
    motto:
      local.motto !== DEFAULT_PROFILE.motto
        ? local.motto
        : (remote?.motto ?? local.motto),
    avatar: local.avatar ?? remote?.avatar,
    banner: local.banner ?? remote?.banner,
    showcaseBadgeId: local.showcaseBadgeId ?? remote?.showcaseBadgeId,
  };
}

/** Merge two arrays by ID — remote items first, local overwrites same IDs */
function mergeById<T extends { id: string }>(
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
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.warn("[sync] Session not ready yet:", error?.message ?? "no user");
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
   the mutation for retry. */

export async function pushMutation(
  userId: string,
  data: AppData,
  changed: ChangedTables,
): Promise<void> {
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
    // Refresh the public stats snapshot — debounced so rapid mark toggles
    // collapse into one recompute+upsert rather than one per tap.
    scheduleStatsSnapshot(userId);
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

