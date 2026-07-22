// Lightweight error tracking — logs errors to console and optionally sends
// them to an external monitoring service. Designed to be swapped out with
// Sentry, Datadog, or similar with minimal code changes.
//
// Usage:
//   import { reportError } from "@/lib/errorTracking";
//   reportError(error, { context: "dashboard" });

/**
 * Report an error to the monitoring system.
 *
 * In production, this can be extended to send errors to Sentry, Datadog, etc.
 * Currently logs to console.error and optionally sends to a server-side
 * logging endpoint for persistent capture.
 *
 * To integrate a production monitoring service (Sentry, Datadog, LogRocket):
 *   1. Install the SDK (e.g. @sentry/nextjs)
 *   2. Import and call Sentry.captureException() here
 *   3. Configure the DSN via NEXT_PUBLIC_SENTRY_DSN
 *
 * @param error The error to report
 * @param context Optional context about where the error occurred
 * @param metadata Additional structured metadata for debugging
 */
export function reportError(
  error: unknown,
  context?: string,
  metadata?: Record<string, unknown>,
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const contextStr = context ? `[${context}] ` : "";

  // Always log to console for immediate visibility
  console.error(
    `[error] ${contextStr}${errorObj.message}`,
    {
      name: errorObj.name,
      stack: errorObj.stack,
      ...(metadata ? { metadata } : {}),
    },
  );

  // Send to server-side logging endpoint for persistent capture.
  // This uses sendBeacon which is non-blocking and works even during page
  // unload. If the endpoint is not set up, the fetch will silently fail.
  try {
    const payload = {
      message: errorObj.message,
      name: errorObj.name,
      stack: errorObj.stack?.slice(0, 2000), // Truncate to avoid payload limits
      context,
      metadata,
      url: typeof window !== "undefined" ? window.location.href : "server",
      timestamp: new Date().toISOString(),
    };

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/log-error",
        new Blob([JSON.stringify(payload)], { type: "application/json" }),
      );
    }
  } catch {
    // Silent — logging should never throw
  }
}

/** AppError — use for expected errors (e.g. network timeouts). */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly context?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
