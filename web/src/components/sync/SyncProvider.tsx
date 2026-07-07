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
  resetSyncState,
} from "@/lib/supabase/sync";
import { createClient } from "@/lib/supabase/client";
import { setSyncCallback, reloadCache } from "@/lib/store";
import type { ChangedTables } from "@/lib/supabase/db";
import type { AppData } from "@/lib/types";
import { loadData } from "@/lib/storage";

// Interval for periodic polling fallback (ms)
const POLL_INTERVAL_MS = 30_000;

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

      // Clean up realtime
      if (supabaseRef.current) {
        supabaseRef.current.channel("sync-realtime").unsubscribe();
        supabaseRef.current = null;
      }

      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    const supabase = createClient();
    supabaseRef.current = supabase;

    // ── 1. Wire the sync callback into the store ──
    setSyncCallback(
      (data: AppData, changed: ChangedTables) => {
        pushMutation(userId, data, changed);
      },
      userId,
    );

    // ── 2. Initial full re-sync (shows sync indicator) ──
    fullResync(userId).then((result) => {
      if (result) reloadCache();
    });

    // ── 3. Subscribe to real-time changes ──
    // This catches changes made by the same user on other devices/sessions.
    const channel = supabase.channel("sync-realtime");
    for (const table of SYNC_TABLES) {
      channel.on(
        "postgres_changes" as never,
        {
          event: "*" as never,
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
            const result = await fullResync(userId, true);
            if (result) reloadCache();
          }, 2000);
        },
      );
    }
    channel.subscribe();

    // ── 4. Periodic polling as fallback (quiet mode) ──
    pollTimerRef.current = setInterval(() => {
      fullResync(userId, true).then((result) => {
        if (result) {
          const localData = loadData();
          if (JSON.stringify(localData) !== JSON.stringify(result)) {
            reloadCache();
          }
        }
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
      supabase.channel("sync-realtime").unsubscribe();
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
