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
import { DEFAULT_PROFILE, type AppData, type Profile } from "../types";
import { loadData, saveData } from "../storage";
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
        console.log("[sync] Retry succeeded for:", item.changed);
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
    settings: local.settings ?? remote.settings,
    profile: mergeProfile(local.profile, remote.profile),
    unlocks:
      Object.keys(mergedUnlocks).length > 0
        ? mergedUnlocks
        : remote.unlocks,
    economy: local.economy ?? remote.economy,
    progressSeen: local.progressSeen ?? remote.progressSeen,
  };
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

    // Verify the auth session is valid before pushing.
    // On fresh registration the auth.users record may not have propagated yet,
    // causing all FK constraints to fail. getUser() refreshes the session if
    // needed and returns null if the user doesn't exist server-side.
    if (!(await verifySessionReady(supabase))) {
      enqueueRetry(userId, data, changed);
      setStatus("offline");
      return;
    }

    await saveChanged(supabase, userId, data, changed);
    // Refresh stats snapshot after each mutation
    await refreshStatsSnapshot(userId);
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

