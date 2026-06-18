"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center animate-fade-in">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-surface2">
        <WifiOff className="size-8 text-muted" />
      </div>
      <h1 className="text-xl font-bold">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-muted">
        Your habits and progress are saved locally and will sync when you&apos;re back online.
      </p>
    </div>
  );
}
