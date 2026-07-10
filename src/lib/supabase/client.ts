"use client";

import { createBrowserClient } from "@supabase/ssr";

const RAW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const RAW_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!RAW_URL || !RAW_KEY) {
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
const SUPABASE_URL = RAW_URL.trim();
const SUPABASE_ANON_KEY = RAW_KEY.trim();

export function createClient() {
  // Note: the `realtime: { worker: true }` option was removed because it kept
  // the Realtime WebSocket heartbeat alive in backgrounded tabs, inflating
  // message usage even when the user wasn't actively using the app. The
  // notification Realtime subscription (useNotifications.ts) already handles
  // reconnection via a visibility change listener when the tab becomes active.
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
