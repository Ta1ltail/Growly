import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasSupabase = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes — always accessible
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/auth/");

  // If Supabase isn't configured, treat all routes as public
  if (!hasSupabase) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Use getSession() instead of getUser() for offline-first support.
  // getUser() makes a network round-trip to the Supabase Auth server to
  // validate the JWT, which fails when offline. getSession() reads the
  // session from SSR cookies without a network call, so it works offline.
  // The trade-off: while offline we can't detect immediate token revocation,
  // but session expiration is still enforced via cookie TTL, and the
  // client-side auth hook (useAuth) still calls getUser() when online.
  let user = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    user = session?.user ?? null;
  } catch {
    // If even getSession() fails (corrupted cookies, etc.), treat as unauthenticated
  }

  // ── Guest routes (login/register) — redirect authenticated users to dashboard ──
  if (user && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
    const url = new URL("/dashboard", request.url);
    return NextResponse.redirect(url);
  }

  // ── Protected routes — redirect unauthenticated users to login ──
  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
