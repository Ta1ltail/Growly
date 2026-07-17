"use client";

import { createBrowserClient } from "@supabase/ssr";

// NOTE: env vars are read lazily inside createClient() rather than at module
// scope so that importing this file does not crash during Vercel's static
// prerendering (e.g. /_not-found) where env vars are not available.
// The client module is only actually instantiated in browser effects.

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !rawKey) {
    throw new Error(
      "Missing Supabase environment variables: " +
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }

  // Trim env vars to prevent trailing newlines (common when copying from the
  // Supabase dashboard) from corrupting the Realtime WebSocket URL. The REST
  // API trims auth headers internally, but the WebSocket URL constructed by
  // @supabase/realtime-js uses the raw key as a query parameter — a trailing
  // newline (%0A) causes the WebSocket handshake to fail with CHANNEL_ERROR.
  const url = rawUrl.trim();
  const key = rawKey.trim();

  // Note: the `realtime: { worker: true }` option was removed because it kept
  // the Realtime WebSocket heartbeat alive in backgrounded tabs, inflating
  // message usage even when the user wasn't actively using the app. The
  // notification Realtime subscription (useNotifications.ts) already handles
  // reconnection via a visibility change listener when the tab becomes active.
  return createBrowserClient(url, key);
}
