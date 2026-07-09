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
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
      // Use a Web Worker to keep the Realtime heartbeat alive when the
      // browser tab is backgrounded or throttled by the OS.
      worker: true,
    },
  });
}
