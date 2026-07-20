"use client";

// SyncWarningBanner — a persistent warning banner shown when the initial sync
// has failed and the app is retrying with exponential backoff. During this
// window, user mutations are saved to localStorage but NOT pushed to Supabase.
// The banner disappears once sync succeeds or the user hides it.
//
// Positioned at the top of the page content area (below the nav bar).

import { useContext, useState } from "react";
import { CloudOff, RefreshCw, X } from "lucide-react";
import { SyncContext } from "./SyncProvider";
import {
  fullResync,
  getSyncReady,
  setSyncReady,
} from "@/lib/supabase/sync";
import {
  getLastUserId,
} from "@/lib/storage";
import { reloadCache, setSyncCallback } from "@/lib/store";
import type { ChangedTables } from "@/lib/supabase/db";
import type { AppData } from "@/lib/types";
import { pushMutation } from "@/lib/supabase/sync";

export function SyncWarningBanner() {
  const { syncReady, syncRetrying, syncRetryCount } = useContext(SyncContext);
  const [dismissed, setDismissed] = useState(false);
  const [retryingNow, setRetryingNow] = useState(false);

  // Don't show if sync is ready, not retrying, or dismissed by the user
  if (syncReady || dismissed) return null;

  // Don't show during the initial loading screen (before 10s timeout)
  // Only show when we're actively retrying after the timeout
  if (!syncRetrying) return null;

  const message = syncRetrying
    ? `Couldn't connect to the cloud yet — changes are saved locally and will sync automatically. Retry #${syncRetryCount}…`
    : "Changes are saved locally but not syncing to the cloud yet. Retrying…";

  async function handleRetryNow() {
    setRetryingNow(true);
    const userId = getLastUserId();
    if (!userId) {
      setRetryingNow(false);
      return;
    }

    try {
      const result = await fullResync(userId);
      if (result) reloadCache();
      // Wire sync callback if gate was closed
      if (!getSyncReady()) {
        setSyncReady(true);
        setSyncCallback(
          (data: AppData, changed: ChangedTables) => {
            pushMutation(userId, data, changed);
          },
          userId,
        );
      }
    } catch {
      // Retry failed — the backoff loop will try again
    }
    setRetryingNow(false);
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-[70] animate-fade-slide-up-lg"
      style={{ animationDelay: "0.1s" }}
    >
      <div className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 backdrop-blur-md sm:px-6">
        <CloudOff className="size-4 shrink-0 text-amber-500" />
        <p className="flex-1 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
          {message}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRetryNow}
            disabled={retryingNow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-600 transition-colors hover:bg-amber-500/25 disabled:opacity-50 dark:text-amber-400"
          >
            <RefreshCw
              className={`size-3 ${retryingNow ? "animate-spin" : ""}`}
            />
            Retry now
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-amber-500/60 transition-colors hover:text-amber-500"
            aria-label="Dismiss warning"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
