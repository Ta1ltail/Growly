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
const POLL_INTERVAL_MS = 15_000;

// ── Sync-ready context ──
// Child components can check this to know if the initial sync has completed.
// Mount-time effects (seedCelebrationsSeen, refreshDailyQuest, etc.) can use
// this to defer their execution until data is loaded from Supabase.
interface SyncContextValue {
  syncReady: boolean;
}

const SyncContext = createContext<SyncContextValue>({ syncReady: false });

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const initialized = useRef(false);
  const [syncReady, setSyncReadyState] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timedOut, setTimedOut] = useState(false);

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
    syncTimeoutRef.current = setTimeout(() => {
      setTimedOut(true);
    }, 10_000);

    fullResync(userId).then((result) => {
      // Sync completed — cancel the timeout so timedOut stays false
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      if (result) reloadCache();

      // ── 2. Wire the sync callback — fullResync has restored data ──
      setSyncCallback(
        (data: AppData, changed: ChangedTables) => {
          pushMutation(userId, data, changed);
        },
        userId,
      );
      setSyncReadyState(true);
    }).catch(() => {
      // Initial sync failed — the _syncReady gate stays closed, preventing
      // any writes to Supabase. Data is safe in localStorage.
      // The timeout fallback will let the user interact with local data.
      console.warn("[sync] Initial fullResync failed, sync gate remains closed.");
    });

    // ── 3. Periodic polling (quiet mode — never pushes) ──
    // Quiet-mode fullResync only updates localStorage. It NEVER calls
    // saveChanged, so it can't race with user mutations going through the
    // save queue. This eliminates the root cause of polling-related data loss.
    // Polling is the primary mechanism for catching remote changes (the old
    // Realtime subscriptions were removed — they consumed 2.4M messages with
    // no functional benefit over a 15s poll for a habit tracker).
    pollTimerRef.current = setInterval(() => {
      fullResync(userId, true).then((result) => {
        if (result) {
          // Only reload cache if the merged data differs from local, to avoid
          // unnecessary re-renders every 15 seconds. Use a quick structural
          // comparison (lengths + object key counts) instead of full-object
          // JSON.stringify which is O(n) on the entire AppData.
          const localData = loadData();
          // Count total mark entries across all days (detects additions within
          // existing day objects unlike day-only Object.keys length).
          const totalMarks = (d: typeof result) =>
            Object.values(d.marks).reduce((s, day) => s + Object.keys(day).length, 0);
          const quickHash = (d: typeof result) =>
            `${d.habits.length}|${totalMarks(d)}|${d.notes.length}|${d.goals.length}|${d.economy.bonusCoins}`;
          if (quickHash(localData) !== quickHash(result)) {
            reloadCache();
          }
        }
      }).catch(() => {
        // Silent — polling is a best-effort fallback
      });
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
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
      <SyncContext.Provider value={{ syncReady: false }}>
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
    <SyncContext.Provider value={{ syncReady }}>
      {children}
    </SyncContext.Provider>
  );
}
