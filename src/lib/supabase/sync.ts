"use client";

// Sync orchestration — manages the data flow between localStorage ↔ Supabase.
// Keeps syncState observable so the UI can show a sync indicator.
// All operations go through the browser Supabase client (client.ts).

import { createClient } from "./client";
import {
  loadAllUserData,
  saveAllUserData,
  saveChanged,
  saveUserStatsSnapshot,
  type ChangedTables,
} from "./db";
import type { AppData } from "../types";
import { loadData, saveData } from "../storage";
import { summarizeProgress } from "../progress";
import { titleForLevel } from "../titles";
import { RANK_STYLE } from "../ranks";
import { consistencyScore } from "../stats";

/* ────────────────────────────────────────────
   Sync state (observable)
   ──────────────────────────────────────────── */

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

let _status: SyncStatus = "idle";
let _lastError: string | null = null;
const _listeners = new Set<() => void>();

function notify() {
  for (const l of _listeners) _listeners.forEach((l) => l());
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
   Pull: fetch all user data from Supabase
   ────────────────────────────────────────────
   Called on login. If Supabase has data, replace local storage.
   If Supabase has no data (new user), push local data up. */

export async function pullAllUserData(userId: string): Promise<AppData | null> {
  const supabase = createClient();
  setStatus("syncing");

  try {
    // ── Push local data to Supabase FIRST ──
    // This ensures any unsynced changes (onboarding, habits, etc.) are saved
    // before we pull. If the push fails (permissions, offline), we keep local
    // data rather than overwriting it with stale remote data.
    const localData = loadData();
    const hasLocalData =
      localData.habits.length > 0 ||
      Object.keys(localData.marks).length > 0;

    if (hasLocalData) {
      try {
        await saveAllUserData(supabase, userId, localData);
      } catch (pushErr) {
        // Push failed — don't pull either, keep local data intact
        console.warn("[sync] Initial push failed, keeping local data:", pushErr);
        await refreshStatsSnapshot(userId);
        setStatus("error", "Could not save local data to server");
        return localData;
      }
    }

    // ── Pull the latest remote data ──
    const remoteData = await loadAllUserData(supabase, userId);

    if (remoteData) {
      // Supabase has data — replace local storage
      // Preserve auditLog (local-only)
      remoteData.auditLog = localData.auditLog;
      saveData(remoteData);
      await refreshStatsSnapshot(userId);
      setStatus("idle");
      return remoteData;
    }

    // No remote data (shouldn't normally happen after a successful push)
    await refreshStatsSnapshot(userId);
    setStatus("idle");
    return localData;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    const details = e instanceof Error ? e.stack ?? "" : "";
    // Log the full error for debugging — includes Supabase error codes,
    // RLS policy violations, network failures, etc.
    console.error("[sync] Pull failed:", msg, "\n", details);
    setStatus("error", msg);
    return null;
  }
}

/* ────────────────────────────────────────────
   Push: send mutation changes to Supabase
   ────────────────────────────────────────────
   Called after every store mutation when the user is logged in.
   Uses incremental save (only changed tables). */

export async function pushMutation(
  userId: string,
  data: AppData,
  changed: ChangedTables,
): Promise<void> {
  setStatus("syncing");

  try {
    const supabase = createClient();
    await saveChanged(supabase, userId, data, changed);
    // Refresh stats snapshot after each mutation
    await refreshStatsSnapshot(userId);
    setStatus("idle");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    const details = e instanceof Error ? e.stack ?? "" : "";
    // If the error is a Supabase error, log its code and details
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
    // Don't throw — the mutation already saved to localStorage.
    // The sync will retry on the next mutation.
  }
}

/* ────────────────────────────────────────────
   Full push: send everything to Supabase
   ────────────────────────────────────────────
   Used on initial sync or manual "sync now". */

async function pushAllUserData(
  userId: string,
  data: AppData,
): Promise<void> {
  setStatus("syncing");

  try {
    const supabase = createClient();
    await saveAllUserData(supabase, userId, data);
    // Refresh stats snapshot after full push
    await refreshStatsSnapshot(userId);
    setStatus("idle");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    const details = e instanceof Error ? e.stack ?? "" : "";
    console.error("[sync] Full push failed:", msg, "\n", details);
    setStatus("error", msg);
  }
}
