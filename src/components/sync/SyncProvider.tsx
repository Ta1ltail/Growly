"use client";

// SyncProvider — wraps the authenticated app and:
// 1. On mount (user logged in): full re-sync with Supabase
// 2. Wires the store's sync callback to push mutations
// 3. Subscribes to Supabase Realtime for live changes from other sessions
// 4. Periodically polls for changes as a fallback (local cache only, never pushes)
// Sync runs silently — no on-screen status indicator is rendered.

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fullResync,
  pushMutation,
  resetSyncState,
  setSyncReady,
} from "@/lib/supabase/sync";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { createClient } from "@/lib/supabase/client";
import { setSyncCallback, reloadCache } from "@/lib/store";
import type { ChangedTables } from "@/lib/supabase/db";
import type { AppData } from "@/lib/types";
import { loadData, clearLocalAppData, getLastUserId, setLastUserId } from "@/lib/storage";

// Interval for periodic polling fallback (ms)
const POLL_INTERVAL_MS = 15_000;

// Tables we subscribe to for real-time changes
const SYNC_TABLES = [
  "habits",
  "marks",
  "notes",
  "goals",
  "user_settings",
  "user_profile",
  "unlocks",
  "economy_state",
  "economy_spent",
  "economy_freezes",
  "progress_seen",
] as const;

// ── Sync-ready context ──
// Child components can check this to know if the initial sync has completed.
// Mount-time effects (seedCelebrationsSeen, refreshDailyQuest, etc.) can use
// this to defer their execution until data is loaded from Supabase.
interface SyncContextValue {
  syncReady: boolean;
}

const SyncContext = createContext<SyncContextValue>({ syncReady: false });

export function useSyncReady(): boolean {
  return useContext(SyncContext).syncReady;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const initialized = useRef(false);
  const [syncReady, setSyncReadyState] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelsRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]>[]>([]);
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
      setSyncReadyState(false);

      // Clean up polling
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      // Clean up all realtime channels
      if (supabaseRef.current) {
        for (const ch of channelsRef.current) {
          supabaseRef.current.removeChannel(ch);
        }
        channelsRef.current = [];
        supabaseRef.current = null;
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

    const supabase = createClient();
    supabaseRef.current = supabase;

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

    // ── 3. Subscribe to real-time changes ──
    // This catches changes made by the same user on other devices/sessions.
    // Uses a channel per table so a single table misconfiguration doesn't
    // block all subscriptions.
    const channels: ReturnType<ReturnType<typeof createClient>["channel"]>[] = [];
    channelsRef.current = channels;
    for (const table of SYNC_TABLES) {
      const ch = supabase.channel(`sync-${table}`);
      channels.push(ch);
      ch.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Debounced quiet re-sync: batches rapid changes from other
          // devices into a single sync, without flashing the indicator.
          if (realtimeTimerRef.current) {
            clearTimeout(realtimeTimerRef.current);
          }
          realtimeTimerRef.current = setTimeout(async () => {
            try {
              const result = await fullResync(userId, true);
              if (result) reloadCache();
            } catch {
              // Silent fallback — polling covers missed updates
            }
          }, 2000);
        },
      );
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Connected successfully — no action needed
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            `[sync] Realtime subscription failed for ${table}: ${status}. ` +
            "Falling back to periodic polling.",
          );
        }
      });
    }

    // ── 4. Periodic polling as fallback (quiet mode — never pushes) ──
    // Quiet-mode fullResync only updates localStorage. It NEVER calls
    // saveChanged, so it can't race with user mutations going through the
    // save queue. This eliminates the root cause of polling-related data loss.
    pollTimerRef.current = setInterval(() => {
      fullResync(userId, true).then((result) => {
        if (result) {
          // Only reload cache if the merged data differs from local, to avoid
          // unnecessary re-renders every 15 seconds.
          const localData = loadData();
          if (JSON.stringify({ ...localData, auditLog: [] }) !==
              JSON.stringify({ ...result, auditLog: [] })) {
            reloadCache();
          }
        }
      }).catch(() => {
        // Silent — polling is a best-effort fallback
      });
    }, POLL_INTERVAL_MS);

    return () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      // Remove all realtime channels
      for (const ch of channelsRef.current) {
        supabase.removeChannel(ch);
      }
      channelsRef.current = [];
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
