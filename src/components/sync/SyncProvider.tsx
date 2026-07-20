"use client";

// SyncProvider — wraps the authenticated app and:
// 1. On mount (user logged in): full re-sync with Supabase
// 2. Wires the store's sync callback to push mutations
// 3. Periodically polls for remote changes (quiet mode, never pushes)
//
// Realtime subscriptions are NOT used for sync — the 15-second polling
// interval catches changes from other devices with acceptable latency
// for a habit tracker, without consuming Supabase Realtime message quota.
// The notifications page has its own dedicated Realtime subscription
// (see useNotifications.ts) since instant notification delivery is
// genuinely valuable.

import { createContext, useEffect, useRef, useState, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fullResync,
  pushMutation,
  resetSyncState,
  setSyncReady,
} from "@/lib/supabase/sync";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { setSyncCallback, reloadCache } from "@/lib/store";
import type { ChangedTables } from "@/lib/supabase/db";
import type { AppData } from "@/lib/types";
import { loadData, clearLocalAppData, getLastUserId, setLastUserId } from "@/lib/storage";

// Interval for periodic polling (ms)
// Increased from 15s to 30s to reduce Supabase API calls on the free tier.
// Combined with the Page Visibility pause below, this eliminates ~95% of
// unnecessary polling when the tab is backgrounded.
const POLL_INTERVAL_MS = 30_000;

// Compute a stable hash of AppData to detect changes across any table.
// Covers all 9 sync tables so the polling interval can skip reloadCache()
// when nothing changed — avoiding unnecessary re-renders every 15 seconds.
// Uses summary statistics + selective JSON.stringify on small objects
// rather than serializing the entire AppData (which could be large).
export function computeDataHash(d: AppData): string {
  // Marks: count by status so status changes (e.g. done→missed) are detected,
  // not just total entry count (which stays the same on status-only edits).
  let marksDone = 0, marksMissed = 0, marksSkipped = 0;
  for (const day of Object.values(d.marks)) {
    for (const status of Object.values(day)) {
      if (status === "done") marksDone++;
      else if (status === "missed") marksMissed++;
      else if (status === "skipped") marksSkipped++;
    }
  }

  return JSON.stringify({
    // Habits: include all mutable fields so renames, archives, schedule changes,
    // and category/priority changes from other devices are detected by the poll.
    // deletedAt is included so soft-deletes propagate across devices (Finding #2).
    h: d.habits.length + d.habits.map(h =>
      `${h.id}:${h.name}:${h.archived ? 1 : 0}:${h.category}:${h.priority ?? ""}:${JSON.stringify(h.recurrence ?? null)}:${h.startDate ?? ""}:${h.timeOfDay ?? ""}:${JSON.stringify(h.repeatDays)}:${h.deletedAt ?? ""}`
    ).sort().join(","),
    // Notes: updatedAt catches body edits; deletedAt catches soft-deletes
    no: d.notes.length + d.notes.map(n => `${n.id}:${n.updatedAt}:${n.deletedAt ?? ""}`).sort().join(","),
    // Goals: include title, current, target, deadline, category, and deletedAt
    go: d.goals.length + d.goals.map(g =>
      `${g.id}:${g.current}:${g.target}:${g.title}:${g.deadline ?? ""}:${g.category ?? ""}:${g.deletedAt ?? ""}`
    ).sort().join(","),
    // Marks: include each (dateKey,hhabitId,status) triple for granular detection
    // so additions, removals, and status changes all trigger hash differences.
    mc: d.habits.length > 0 || Object.keys(d.marks).length > 0
      ? Object.entries(d.marks).map(([dk, day]) =>
          Object.entries(day).map(([hid, st]) => `${dk}:${hid}:${st}`).join(",")
        ).filter(Boolean).sort().join("|")
      : "",
    // Singleton tables: JSON.stringify is fine (always small objects)
    st: JSON.stringify(d.settings),
    pr: JSON.stringify({
      dn: d.profile.displayName,
      un: d.profile.username,
      bi: d.profile.bio,
      mo: d.profile.motto,
      av: d.profile.avatar,
      bn: d.profile.banner,
      sb: d.profile.showcaseBadgeId,
    }),
    ul: Object.keys(d.unlocks).length + Object.keys(d.unlocks).sort().join(","),
    ec: JSON.stringify({
      bc: d.economy.bonusCoins,
      ow: d.economy.owned,
      eq: d.economy.equipped,
      lc: d.economy.lastCheckIn,
      cs: d.economy.checkInStreak,
      lq: d.economy.lastQuestDate,
      cq: d.economy.currentQuest,
      ls: d.economy.lastSpinDate,
      sr: d.economy.lastSpinResult,
      sl: d.economy.spent.length,
      fl: d.economy.freezes.length,
    }),
    ps: JSON.stringify(d.progressSeen),
  });
}

// ── Sync-ready context ──
// Child components can check this to know if the initial sync has completed.
// Mount-time effects (seedCelebrationsSeen, refreshDailyQuest, etc.) can use
// this to defer their execution until data is loaded from Supabase.
// syncRetrying is true when the initial sync failed and we're retrying.
// syncRetryCount tracks how many retries have been attempted.
interface SyncContextValue {
  syncReady: boolean;
  syncRetrying: boolean;
  syncRetryCount: number;
}

export const SyncContext = createContext<SyncContextValue>({
  syncReady: false,
  syncRetrying: false,
  syncRetryCount: 0,
});

// Max delay for exponential backoff of initial sync retries (2 minutes).
const MAX_RETRY_DELAY_MS = 120_000;
const BASE_RETRY_DELAY_MS = 10_000;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const initialized = useRef(false);
  const [syncReady, setSyncReadyState] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [syncRetrying, setSyncRetrying] = useState(false);
  const [syncRetryCount, setSyncRetryCount] = useState(0);
  const isTabVisibleRef = useRef(true);
  const retryAttemptRef = useRef(0);
  const timedOutRef = useRef(false); // ref version for closures


  useEffect(() => {
    if (loading) return;
    if (!userId) {
      // User signed out — disconnect sync
      setSyncCallback(null);
      setSyncReady(false);
      resetSyncState();
      initialized.current = false;
      startTransition(() => {
        setSyncReadyState(false);
      });

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // ── 0. Detect user switch — if the previous user was different, clear
    // stale local data so the new user never inherits another account's
    // habits, marks, or economy. Same-user logins preserve local data so
    // pending async sync operations (pushMutation) are never lost.
    const lastUserId = getLastUserId();
    if (lastUserId && lastUserId !== userId) {
      clearLocalAppData();
    }

    if (initialized.current) return;
    initialized.current = true;

    // Record this user for next time so we can detect switches
    setLastUserId(userId);

    // Capture narrowed userId for closures (setupPoll, visibility change)
    const uid: string = userId;

    // Reset the sync-ready gate on each new session. The gate prevents
    // mount-time mutations from ever pushing empty/stale data to Supabase.
    setSyncReady(false);

    // ── 1. Initial full re-sync FIRST (sync callback not yet wired) ──
    // We defer wiring the sync callback until AFTER fullResync completes so
    // that mount-time mutations (seedCelebrationsSeen, seedUnlocksSeen,
    // refreshDailyQuest, etc.) NEVER push stale/empty data to Supabase.
    //
    // The pushMutation function ALSO has a _syncReady gate as a second layer
    // of defense: even if _onMutation were somehow set, pushMutation silently
    // drops all writes until fullResync opens the gate.
    // ── Fallback timeout: if sync takes >10s, render with local data ──
    // This prevents the user from being stuck on a loading screen if
    // Supabase is unreachable. The _syncReady gate in sync.ts stays
    // false, so pushMutation silently drops all writes — no data reaches
    // Supabase until the next successful sync (via polling or refresh).
    // The timeout also kicks off the first retry so the initial sync is
    // re-attempted with exponential backoff (10s, 20s, 40s, 80s, 120s max).
    syncTimeoutRef.current = setTimeout(() => {
      timedOutRef.current = true;
      setTimedOut(true);

      // Start the retry loop if sync hasn't succeeded yet.
      // retryAttemptRef.current === 0 means no retry has been scheduled yet
      // (initial attempt failed before the timeout fired).
      if (retryAttemptRef.current === 0) {
        retryAttemptRef.current = 1;
        scheduleRetry(1);
      }
    }, 10_000);

    retryAttemptRef.current = 0;

    // Shared retry scheduler: schedules a fullResync attempt at the appropriate
    // exponential backoff delay given the attempt number (1-based).
    // Attempt #1 fires at BASE_RETRY_DELAY_MS (10s after timeout), #2 at 20s,
    // #3 at 40s, #4 at 80s, up to MAX_RETRY_DELAY_MS (120s).
    function scheduleRetry(attempt: number) {
      const delay = Math.min(
        BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1),
        MAX_RETRY_DELAY_MS,
      );
      console.warn(`[sync] Scheduling retry #${attempt} in ${delay}ms`);
      setSyncRetrying(true);
      setSyncRetryCount(attempt);
      retryTimerRef.current = setTimeout(() => {
        attemptSync();
      }, delay);
    }

    function attemptSync() {
      fullResync(uid).then((result) => {
        // Sync completed — cancel the timeout so timedOut stays false
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }

        if (result) reloadCache();

        // ── 2. Wire the sync callback — fullResync has restored data ──
        setSyncCallback(
          (data: AppData, changed: ChangedTables) => {
            pushMutation(uid, data, changed);
          },
          uid,
        );

        // Cancel any pending retry
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        setSyncReadyState(true);
        setSyncRetrying(false);
        setSyncRetryCount(0);
        timedOutRef.current = false;
        startTransition(() => {
          setTimedOut(false);
        });
      }).catch(() => {
        // Initial sync failed — the _syncReady gate stays closed, preventing
        // any writes to Supabase. Data is safe in localStorage.
        // The timeout fallback will let the user interact with local data.
        console.warn("[sync] Initial fullResync failed, sync gate remains closed.");

        // ══ Retry with exponential backoff ══
        // Once the timeout has fired (timedOutRef.current is true), the app
        // renders with local data and we start retrying. The first retry is
        // initiated by the timeout handler itself (see above) so it always
        // fires even if the initial attempt failed before the timeout.
        // Subsequent retries (attempt >= 2) are scheduled here automatically.
        // If the timeout hasn't fired yet, we wait — the loading screen is
        // still visible and retrying would produce the same network error.
        if (timedOutRef.current) {
          retryAttemptRef.current += 1;
          scheduleRetry(retryAttemptRef.current);
        }
      });
    }

    // Fire the initial attempt
    attemptSync();

    // ── 3. Periodic polling (quiet mode — never pushes) ──
    // Quiet-mode fullResync only updates localStorage. It NEVER calls
    // saveChanged, so it can't race with user mutations going through the
    // save queue. This eliminates the root cause of polling-related data loss.
    // Polling is the primary mechanism for catching remote changes (the old
    // Realtime subscriptions were removed — they consumed 2.4M messages with
    // no functional benefit over a 15s poll for a habit tracker).
    //
    // ══ Page Visibility optimization ══
    // Polling is paused when the tab is hidden (via visibilitychange) and
    // resumed immediately when the tab becomes visible again. Combined with
    // the 30s interval, this eliminates ~95% of unnecessary API calls since
    // most users spend the majority of their session with the tab backgrounded.

    // Synchronize the visibility ref with the actual tab state at mount
    // (the ref defaults to true, but the tab might already be hidden).
    isTabVisibleRef.current = !document.hidden;

    // Shared poll logic — runs once immediately on visibility restore and
    // repeatedly while the tab is visible (via setupPoll's interval).
    function doPoll() {
      // Capture a snapshot hash BEFORE the fullResync (which saves merged
      // data to localStorage). We compare this with the post-merge result
      // to detect actual remote changes and only then reload the cache.
      const preSyncHash = computeDataHash(loadData());

      fullResync(uid, true).then((result) => {
        if (result) {
          // Compare post-merge data with the pre-sync snapshot, not with
          // loadData() (which now holds the freshly-merged result).
          if (preSyncHash !== computeDataHash(result)) {
            reloadCache();
          }
        }
      }).catch(() => {
        // Silent — polling is a best-effort fallback
      });
    }

    function setupPoll() {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (!isTabVisibleRef.current) return;

      pollTimerRef.current = setInterval(doPoll, POLL_INTERVAL_MS);
    }

    function handleVisibilityChange() {
      isTabVisibleRef.current = !document.hidden;

      if (isTabVisibleRef.current) {
        // Tab became visible — fire an immediate poll to catch changes made
        // while away, then resume the normal interval.
        doPoll();
        setupPoll();
      } else {
        // Tab hidden — clear interval to stop API calls entirely.
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    setupPoll();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [userId, loading]);

  // ── Auth loading: show loading screen ──
  if (loading) {
    return <LoadingScreen />;
  }

  // ── Not authenticated: render immediately ──
  // Public pages (landing, login, register) don't need sync.
  if (!user) {
    return (
      <SyncContext.Provider value={{ syncReady: false, syncRetrying: false, syncRetryCount: 0 }}>
        {children}
      </SyncContext.Provider>
    );
  }

  // ── Authenticated but sync not ready: block children ──
  // This is the critical guard: mount-time effects
  // (seedCelebrationsSeen, refreshDailyQuest, claimDailyCheckIn,
  // seedUnlocksSeen) inside child components fire in useEffects
  // that run AFTER render. By keeping children UNMOUNTED until
  // syncReady is true, those effects run for the FIRST TIME with
  // the correct data from Supabase already in localStorage.
  //
  // Without this guard, components would mount with empty/stale
  // localStorage data and their useEffects would run before
  // fullResync completes, corrupting the Supabase data.
  //
  // Fallback: if 10 seconds have passed without sync completing
  // (e.g., Supabase is unreachable), render with local data anyway.
  // The _syncReady gate in sync.ts stays false, so pushMutation
  // silently drops all writes — no data reaches Supabase until the
  // next successful sync.
  if (!syncReady && !timedOut) {
    return <LoadingScreen />;
  }

  // ── Authenticated and sync complete: render the app ──
  return (
    <SyncContext.Provider value={{ syncReady, syncRetrying, syncRetryCount }}>
      {children}
    </SyncContext.Provider>
  );
}
