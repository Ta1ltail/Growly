"use client";

// Route-level error boundary — catches rendering errors inside any page and
// shows a clean fallback without crashing the navigation shell. The top-level
// ErrorBoundary in RootLayout remains as the last resort for catastrophic
// failures (sync, layout crashes).
//
// Next.js auto-wires this as the "error" UI for the (/) route segment.
// See: https://nextjs.org/docs/app/building-your-application/routing/error-handling

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error.tsx] Page-level error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-surface p-8 text-center shadow-lg ring-1 ring-line">
        <div className="mb-4 text-4xl" role="img" aria-label="Warning sign">
          ⚠️
        </div>
        <h1 className="mb-2 text-xl font-bold text-ink">
          Something went wrong
        </h1>
        <p className="mb-2 text-sm text-muted">
          An unexpected error occurred on this page. Your data is safely stored
          locally.
        </p>
        {error.digest && (
          <p className="mb-4 font-mono text-[10px] text-faint">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={() => reset()}
          className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent/90 hover:shadow-md active:scale-95"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
