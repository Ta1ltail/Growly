"use client";

// StorageQuotaWarning — a dismissible warning banner shown when localStorage
// usage exceeds 75% of the available quota. Data is safe in Supabase, but
// offline edits may not be cached locally if storage is full.
//
// Checks usage once on mount via navigator.storage.estimate(). Falls back
// to a simple size check of the app's localStorage key if estimate is
// unavailable (some browsers block it in private mode).

import { useEffect, useState } from "react";
import { HardDrive, X } from "lucide-react";
import { getEffectiveStorageKey } from "@/lib/storage";

const WARN_THRESHOLD = 0.75; // 75% used → show warning
const DISMISS_KEY = "growly.storage_warn_dismissed";

export function StorageQuotaWarning() {
  const [warn, setWarn] = useState(false);
  const [usagePct, setUsagePct] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Skip check if user dismissed it this session — dismissed stays false but
    // warn stays false (check() never runs), so the banner stays hidden.
    if (sessionStorage.getItem(DISMISS_KEY)) {
      return;
    }
    // Only show the banner after async check completes

    async function check() {
      let shouldWarn = false;
      let pct = 0;

      // Try the modern Storage API first
      if (navigator.storage?.estimate) {
        try {
          const est = await navigator.storage.estimate();
          const quota = est.quota ?? 0;
          const used = est.usage ?? 0;
          if (quota > 0) {
            pct = Math.round((used / quota) * 100);
            shouldWarn = (used / quota) >= WARN_THRESHOLD;
          }
        } catch {
          // estimate() can fail in some environments — fall through to fallback
        }
      }

      // Fallback: check if our localStorage key is unusually large (>4MB)
      if (!shouldWarn) {
        try {
          const key = getEffectiveStorageKey();
          const raw = localStorage.getItem(key);
          if (raw) {
            const bytes = new Blob([raw]).size;
            if (bytes > 4_000_000) {
              // ~4MB in a 5-10MB quota is likely 75%+
              pct = Math.round((bytes / 5_000_000) * 100);
              shouldWarn = true;
            }
          }
        } catch {
          // localStorage unavailable — nothing to warn about
        }
      }

      // Batch state updates together after all async work completes
      setWarn(shouldWarn);
      setUsagePct(pct);
    }

    check();
  }, []);

  // Allow re-check on demand by clearing session storage
  if (dismissed || !warn) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[65] animate-fade-slide-up-lg">
      <div className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 backdrop-blur-md sm:px-6">
        <HardDrive className="size-4 shrink-0 text-amber-500" />
        <p className="flex-1 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
          Device storage is {usagePct}% full — offline edits may not save locally.
          Your data is safe in the cloud.
        </p>
        <button
          onClick={() => {
            setDismissed(true);
            try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
          }}
          className="rounded-lg p-1 text-amber-500/60 transition-colors hover:text-amber-500"
          aria-label="Dismiss storage warning"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
