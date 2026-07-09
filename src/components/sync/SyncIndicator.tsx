"use client";

// Floating sync status indicator — a small rotating circle fixed in the
// bottom-right corner. Spins while syncing, turns red on error, amber when
// offline. Uses position: fixed so it never causes layout shift.
// Only visible when the user is logged in and not idle.

import { useSyncExternalStore } from "react";
import {
  getSyncStatus,
  subscribeToSyncStatus,
  type SyncStatus,
} from "@/lib/supabase/sync";
import { useAuth } from "@/hooks/useAuth";

const COLORS: Record<SyncStatus, string> = {
  idle: "bg-done/80",
  syncing: "bg-accent",
  error: "bg-missed/80",
  offline: "bg-amber-500/80",
};

function getSnapshot(): SyncStatus {
  return getSyncStatus();
}

function getServerSnapshot(): SyncStatus {
  return "idle";
}

function subscribe(listener: () => void): () => void {
  return subscribeToSyncStatus(listener);
}

export function SyncIndicator() {
  const status = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { user } = useAuth();
  // Always render once mounted so we don't layout-shift on login; opacity
  // hides it when idle or logged out.
  const visible = !!user && status !== "idle";

  return (
    <span
      className={`fixed bottom-6 right-4 z-[60] grid size-3 place-items-center rounded-full shadow-lg ring-1 ring-white/10 backdrop-blur-sm transition-all duration-300 ${
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-1 scale-75 opacity-0"
      } ${COLORS[status]}`}
      role="status"
      aria-label={status === "syncing" ? "Syncing" : status === "error" ? "Sync error" : "Sync offline"}
      title={status === "syncing" ? "Syncing…" : status === "error" ? "Sync error" : "Offline"}
    >
      {status === "syncing" && (
        <span className="block size-1.5 animate-spin rounded-full border-[1.5px] border-white/70 border-t-transparent" />
      )}
      {status === "error" && <span className="block size-1.5 rounded-full bg-white/70" />}
      {status === "offline" && <span className="block size-1.5 rounded-full bg-white/70" />}
    </span>
  );
}
