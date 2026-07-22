// ═══════════════════════════════════════════════════════════════════════════
// Next.js Proxy — Security Headers + Session Management
// ═══════════════════════════════════════════════════════════════════════════
//
// Named proxy.ts (Next.js 16 convention) instead of middleware.ts.
// Applies security headers to all responses and manages Supabase auth
// sessions (redirect unauthenticated users, refresh expired tokens).
//
// Security headers applied:
//   Content-Security-Policy     — XSS mitigation (defense-in-depth)
//   Strict-Transport-Security   — HTTPS enforcement (HSTS)
//   X-Content-Type-Options      — MIME sniffing prevention
//   X-Frame-Options             — Clickjacking prevention
//   Referrer-Policy             — Referrer leakage control

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// ── CSP (Content Security Policy) ──
//
// 'unsafe-inline' is required for:
//   1. The theme anti-FOUC inline script in layout.tsx (controlled, no user input)
//   2. Tailwind CSS utility classes injected inline by Next.js
//   3. Service worker registration inline script
//
// In production, if all inline scripts are strictly controlled, 'unsafe-inline'
// can be replaced with a nonce-based approach for tighter security. The current
// policy provides defense-in-depth while preserving app functionality.

const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Scripts: self + inline (required for theme script + SW registration)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Styles: self + inline (required for Tailwind)
  "style-src 'self' 'unsafe-inline'",
  // Images: self, data: URIs (avatars), blob:, supabase storage
  "img-src 'self' data: blob: https://*.supabase.co",
  // Connections: supabase API + Realtime WebSocket
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // Fonts: self-hosted (Geist via Next.js)
  "font-src 'self' data:",
  // Frames: none (no iframes used)
  "frame-src 'none'",
  // Objects: none (no plugins)
  "object-src 'none'",
  // Base: self only
  "base-uri 'self'",
  // Forms: self only
  "form-action 'self'",
  // Manifest
  "manifest-src 'self'",
].join("; ");

/** Apply security headers to any response (normal or redirect). */
function applySecurityHeaders(response: NextResponse): void {
  response.headers.set("Content-Security-Policy", CSP_DIRECTIVES);
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");
}

export async function proxy(request: NextRequest) {
  // ── 1. Session management (auth redirects, token refresh) ──
  const sessionResponse = await updateSession(request);

  // If session management returned a redirect (unauthenticated → login,
  // authenticated user on login → dashboard), return it directly with
  // security headers applied. This ensures auth protection is never bypassed.
  if (sessionResponse.status >= 300 && sessionResponse.status < 400) {
    applySecurityHeaders(sessionResponse);
    return sessionResponse;
  }

  // ── 2. Build the normal response with security headers ──
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Merge in any cookies from the session response
  const sessionHeaders = new Headers(sessionResponse.headers);
  for (const [key, value] of sessionHeaders.entries()) {
    if (key.toLowerCase().startsWith("set-cookie")) {
      response.headers.append(key, value);
    }
  }

  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and internals
    "/((?!_next/static|_next/image|favicon\\.ico|icon-192\\.svg|sw\\.js|manifest\\.json|images/).*)",
  ],
};
