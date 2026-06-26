"use client";

// React hook that exposes sync status and provides pull/push actions.
// Used by SyncProvider internally and can be consumed by pages/widgets
// that want to show sync state or trigger manual sync.

import { useSyncExternalStore, useCallback } from "react";
import {
  getSyncStatus,
  getLastSyncError,
  subscribeToSyncStatus,
  type SyncStatus,
} from "@/lib/supabase/sync";

export function useSyncStatus() {
  const status = useSyncExternalStore(
    subscribeToSyncStatus,
    getSyncStatus,
    () => "idle" as SyncStatus,
  );

  const error = useSyncExternalStore(
    subscribeToSyncStatus,
    getLastSyncError,
    () => null,
  );

  return { status, error, isSyncing: status === "syncing" };
}
