// Lightweight error tracking — logs errors to console and optionally sends
// them to an external monitoring service. Designed to be swapped out with
// Sentry, Datadog, or similar with minimal code changes.
//
// Usage:
//   import { reportError } from "@/lib/errorTracking";
//   reportError(error, { context: "dashboard" });

/**
 * Whether @sentry/nextjs is available and configured.
 * Auto-detected via NEXT_PUBLIC_SENTRY_DSN env var.
 * To enable Sentry:
 *   1. npm install @sentry/nextjs
 *   2. Set NEXT_PUBLIC_SENTRY_DSN in your environment
 *   3. Sentry is auto-detected on the next app build
 */
const SENTRY_AVAILABLE =
  typeof process !== "undefined" &&
  typeof process.env?.NEXT_PUBLIC_SENTRY_DSN === "string" &&
  process.env.NEXT_PUBLIC_SENTRY_DSN.length > 0;

/**
 * Lazily imported Sentry instance — null until first use.
 * The type is `any` to avoid a compile-time TS2307 when @sentry/nextjs
 * isn't installed (it's an optional dependency detected at runtime).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sentry: any = null;

async function getSentry(): Promise<any> {
  if (!SENTRY_AVAILABLE) return null;
  if (_sentry) return _sentry;
  try {
    // @ts-expect-error — @sentry/nextjs is optional; auto-detected at runtime
    // via NEXT_PUBLIC_SENTRY_DSN. TypeScript can't resolve the module when
    // the package isn't installed, but the try/catch handles it gracefully.
    _sentry = await import("@sentry/nextjs");
    return _sentry;
  } catch {
    return null;
  }
}

/**
 * Report an error to the monitoring system.
 *
 * In production, this sends errors to Sentry (when configured) or falls back
 * to the server-side /api/log-error endpoint for persistent capture.
 *
 * To configure Sentry:
 *   1. Install: npm install @sentry/nextjs
 *   2. Set NEXT_PUBLIC_SENTRY_DSN in your environment
 *   3. Sentry is auto-detected and used on the next app build
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

  // Sentry path — fire-and-forget (no await to keep the API synchronous)
  if (SENTRY_AVAILABLE) {
    getSentry().then((sentry) => {
      if (sentry) {
        sentry.captureException(errorObj, {
          tags: { context: context ?? "unknown" },
          extra: { ...(metadata as Record<string, unknown>) },
        });
      }
    });
    return;
  }

  // Fallback: send to server-side /api/log-error endpoint.
  // Uses fetch() with keepalive for reliability (works during page unload)
  // and better error handling than sendBeacon.
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

    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // Ensures request completes even during page unload
    }).catch(() => {
      // Silent — logging should never throw; network errors are expected in
      // offline scenarios and don't warrant user-visible feedback.
    });
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
