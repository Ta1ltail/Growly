"use client";

// SyncIndicator — shows sync status as a small pill in the sidebar.
// Displays "Syncing…", "Saved", or an error state.

import { useSyncStatus } from "@/hooks/useSync";
import { Cloud, CloudOff, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/util";

export function SyncIndicator({ className }: { className?: string }) {
  const { status } = useSyncStatus();

  if (status === "idle") {
    // Don't show anything when idle — no news is good news
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        status === "syncing" && "bg-accent/10 text-accent",
        status === "error" && "bg-missed/10 text-missed",
        status === "offline" && "bg-amber-500/10 text-amber-500",
        className,
      )}
      title={
        status === "syncing"
          ? "Syncing your data…"
          : status === "error"
            ? "Sync failed — changes saved locally"
            : "Working offline"
      }
    >
      {status === "syncing" && (
        <>
          <Loader2 className="size-3 animate-spin" />
          <span>Syncing…</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle className="size-3" />
          <span>Sync error</span>
        </>
      )}
      {status === "offline" && (
        <>
          <CloudOff className="size-3" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}
