"use client";

// SyncProvider — wraps the authenticated app and:
// 1. On mount (user logged in): full re-sync with Supabase
// 2. Wires the store's sync callback to push mutations
// 3. Subscribes to Supabase Realtime for live changes from other sessions
// 4. Periodically polls for changes as a fallback
// Sync runs silently — no on-screen status indicator is rendered.

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fullResync,
  pushMutation,
  refreshStatsSnapshot,
  resetSyncState,
} from "@/lib/supabase/sync";
import { createClient } from "@/lib/supabase/client";
import { setSyncCallback, reloadCache } from "@/lib/store";
import type { ChangedTables } from "@/lib/supabase/db";
import type { AppData } from "@/lib/types";
import { loadData, clearLocalAppData, getLastUserId, setLastUserId } from "@/lib/storage";

// Interval for periodic polling fallback (ms)
// Reduced from 30s to 15s since cross-device sync was relying entirely on
// polling (the realtime publication was missing all sync tables except
// notifications). With the publication now fixed, realtime handles changes
// within ~2s; the poll is a backup for WebSocket interruptions.
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

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const initialized = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelsRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]>[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      // User signed out — disconnect sync
      setSyncCallback(null);
      resetSyncState();
      initialized.current = false;

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

    // ── 1. Initial full re-sync FIRST (sync callback not yet wired) ──
    // We defer wiring the sync callback until AFTER fullResync completes so
    // that mount-time mutations (seedCelebrationsSeen, seedUnlocksSeen,
    // refreshDailyQuest, etc.) NEVER push stale/empty data to Supabase.
    //
    // These mount-time mutations fire during child component effects, WHILE
    // fullResync is still fetching remote data. If the callback were active,
    // they would call pushMutation with empty localStorage data (habits: [],
    // marks: {}, unlocks: {}), which would:
    //   a) overwrite the user's real achievements in Supabase (unlocks)
    //   b) overwrite progressSeen with a freshly-baselined empty snapshot
    //   c) overwrite economy_state with default zeros
    //
    // By keeping the callback null during this critical window, mount-time
    // mutations only touch localStorage (which fullResync overwrites with the
    // correct merged data once it completes).
    fullResync(userId).then((result) => {
      if (result) reloadCache();

      // ── 2. Wire the sync callback NOW — fullResync has restored data ──
      setSyncCallback(
        (data: AppData, changed: ChangedTables) => {
          pushMutation(userId, data, changed);
        },
        userId,
      );
    }).catch(() => {
      // Initial sync failure — wire callback anyway so subsequent mutations
      // sync. Data may be stale until next fullResync, but local changes
      // should still be pushed so they're not lost.
      setSyncCallback(
        (data: AppData, changed: ChangedTables) => {
          pushMutation(userId, data, changed);
        },
        userId,
      );
    });

    // ── 3. Subscribe to real-time changes ──
    // This catches changes made by the same user on other devices/sessions.
    // Uses a channel per table so a single table misconfiguration doesn't
    // block all subscriptions, and each .subscribe() call has its own status.
    // Store all channels so cleanup can remove each one individually
    const channels: ReturnType<ReturnType<typeof createClient>["channel"]>[] = [];
    channelsRef.current = channels;
    for (const table of SYNC_TABLES) {
      // Use null (anonymous) channel names to avoid name collisions with any
      // leftover subscriptions from previous effect cycles.
      // Use a unique channel name per table to avoid name collisions with any
      // leftover subscriptions from previous effect cycles.
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
          // Connection failed — polling fallback will handle updates
          console.warn(
            `[sync] Realtime subscription failed for ${table}: ${status}. ` +
            "Falling back to periodic polling.",
          );
        }
      });
    }

    // ── 4. Periodic polling as fallback (quiet mode) ──
    pollTimerRef.current = setInterval(() => {
      fullResync(userId, true).then((result) => {
        if (result) {
          const localData = loadData();
          if (JSON.stringify(localData) !== JSON.stringify(result)) {
            // Data changed upstream — update local cache and refresh the
            // public stats snapshot from the authoritative remote data.
            reloadCache();
            void refreshStatsSnapshot(userId);
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
      // Remove all realtime channels
      for (const ch of channelsRef.current) {
        supabase.removeChannel(ch);
      }
      channelsRef.current = [];
    };
    // Keyed on userId (a stable string) rather than the user object, whose
    // reference changes on every token refresh / tab focus — using the object
    // would tear down and (thanks to the initialized guard) never re-establish
    // the realtime channel and poll timer after the first hourly refresh.
  }, [userId, loading]);

  // The sync status pill is intentionally not rendered — sync runs silently in
  // the background and surfaces no persistent on-screen indicator.
  return <>{children}</>;
}
