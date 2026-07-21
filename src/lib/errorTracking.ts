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
 * Currently logs to console.error for visibility during development and beta.
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

  console.error(
    `[error] ${contextStr}${errorObj.message}`,
    {
      name: errorObj.name,
      stack: errorObj.stack,
      ...(metadata ? { metadata } : {}),
    },
  );
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
