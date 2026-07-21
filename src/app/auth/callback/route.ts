// Auth callback route — handles OAuth redirects from Supabase (Google, GitHub).
// After the user authorizes the OAuth provider, Supabase redirects here with a
// code that we exchange for a session. The code is handled by the SSR client
// automatically via createServerClient's cookie management.
//
// This route also handles the password-reset flow (type=recovery) by redirecting
// the user to the settings page where they can set a new password.
//
// Routes:
//   GET /auth/callback?code=xxx&next=/dashboard   — standard OAuth login
//   GET /auth/callback?code=xxx&type=recovery&next=/settings  — password reset

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (supabaseUrl && supabaseKey) {
      const response = NextResponse.redirect(`${origin}${next}`);

      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      });

      // Exchange the auth code for a session (handles PKCE flow automatically)
      await supabase.auth.exchangeCodeForSession(code);
    }

    // Password reset flow — redirect to settings with a hash fragment that
    // the client-side recovery handler can pick up.
    if (type === "recovery") {
      return NextResponse.redirect(
        `${origin}/settings?recovery=true#update-password`,
      );
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code — redirect to home
  return NextResponse.redirect(`${origin}/?error=no_auth_code`);
}
