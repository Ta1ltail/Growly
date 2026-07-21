"use client";

// SyncProvider: handles initial full re-sync, wires mutation push, polls for remote changes.
// Uses 15s polling (not Realtime) to avoid quota issues. Notifications have their own Realtime sub.

import { createContext, useEffect, useRef, useState, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
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
import { loadData, clearLocalAppData, getLastUserId, setLastUserId, setDataUserId } from "@/lib/storage";

// 15s polling interval. Combined with Page Visibility pause, ~15 calls/device/foreground-hour.
const POLL_INTERVAL_MS = 15_000;

// Stable hash of AppData to detect remote changes. Avoids unnecessary re-renders.
export function computeDataHash(d: AppData): string {
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

// Sync-ready context: child components defer mount-time effects until sync completes.
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

// Exponential backoff: base 10s, max 2 min.
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
  const pathname = usePathname();
  const lastPathRef = useRef(pathname);

  // ── Re-sync on page navigation ──
  // Whenever the URL changes (client-side navigation), trigger a quiet
  // fullResync so the new page always shows the latest data from the
  // database. This ensures the database is the single source of truth
  // and stale local data is replaced immediately.
  // Always reload the cache after navigation to guarantee fresh data.
  useEffect(() => {
    if (!userId || !syncReady) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    fullResync(userId, true).then((result) => {
      if (result) reloadCache();
    }).catch((e) => {
      console.warn("[sync] Navigation re-sync failed:", e);
    });
  }, [pathname, userId, syncReady]);

  // ── Cross-tab user switch detection ──
  // When another tab logs in as a different user, it sets lastUserId in
  // localStorage. This tab detects the change via the `storage` event and
  // hard-reloads to pick up the new session — the safest approach since it
  // clears all in-memory state and lets the auth flow redirect appropriately.
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key !== "growly.last_user_id") return;
      if (!e.newValue || !userId) return;
      if (e.newValue !== userId) {
        window.location.reload();
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [userId]);

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
      // Reset the initialized flag so the new user's data is loaded from
      // Supabase instead of being skipped by the early return below.
      initialized.current = false;
    }

    if (initialized.current) return;
    initialized.current = true;

    // Scope localStorage to this user — all subsequent data reads/writes
    // will use `growly.data.v1_{userId}` instead of the shared `growly.data.v1`.
    // This ensures data is never shared between accounts on the same device.
    setDataUserId(userId);

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
      fullResync(uid).then(() => {
        // Sync completed — cancel the timeout so timedOut stays false
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }

        // Always invalidate the in-memory store cache after a sync attempt,
        // even if the sync returned null (failure). This prevents stale data
        // from the previous user (or old session) from persisting in the store
        // when clearLocalAppData() has already cleared localStorage.
        reloadCache();

        // ── 2. Wire the sync callback — fullResync has restored data ──
        setSyncCallback(
          (data: AppData, changed: ChangedTables) => {
            pushMutation(uid, data, changed);
          },
          uid,
        );

        // ── 3. Push any accumulated local mutations ──
        // If the user made edits while the sync-ready gate was closed
        // (e.g. during the 10-second timeout window), those changes are
        // only in localStorage and were never pushed. Re-push all tables
        // to ensure Supabase has the latest local state.
        // The _syncReady gate inside sync.ts is now open, so pushMutation
        // will accept this push.
        const accumulatedData = loadData();
        pushMutation(uid, accumulatedData, {
          habits: true,
          marks: true,
          notes: true,
          goals: true,
          settings: true,
          profile: true,
          unlocks: true,
          economy: true,
          progressSeen: true,
        });

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
      }).catch((e) => {
        console.warn("[sync] Polling sync failed:", e);
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
      // Reset the initialized flag so the effect re-runs if re-mounted.
      // Without this, React Strict Mode double-mount (or any re-mount event)
      // would skip the entire sync initialization, leaving the new user with
      // stale data from the previous mount.
      initialized.current = false;
      timedOutRef.current = false;

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
