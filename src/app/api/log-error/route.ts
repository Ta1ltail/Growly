// Error logging endpoint — receives client-side error reports from
// errorTracking.ts's sendBeacon() call and logs them server-side for
// persistent capture. This provides basic error monitoring without
// requiring a third-party service like Sentry.
//
// In production, replace this with an integration to Sentry, Datadog,
// LogRocket, or your preferred monitoring platform. The client-side
// errorTracking.ts is designed to be swapped with minimal changes.
//
// POST /api/log-error
// Body: { message, name, stack, context, metadata, url, timestamp }

import { NextResponse, type NextRequest } from "next/server";

interface ErrorPayload {
  message: string;
  name: string;
  stack?: string;
  context?: string;
  metadata?: Record<string, unknown>;
  url?: string;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: ErrorPayload = await request.json();

    // Structured logging — in production this would go to your log aggregator
    console.error(
      `[client-error] [${payload.context ?? "unknown"}] ${payload.name}: ${payload.message}`,
      {
        stack: payload.stack?.slice(0, 500), // Limit stack trace length
        url: payload.url,
        metadata: payload.metadata,
        timestamp: payload.timestamp ?? new Date().toISOString(),
      },
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    // If parsing fails, log the raw body and return a 400
    console.error("[log-error] Failed to parse error payload:", e);
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 },
    );
  }
}

// Don't cache error reports
export const dynamic = "force-dynamic";
