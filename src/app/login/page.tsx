"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, Activity, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { completeOnboarding } from "@/lib/store";
import { REMEMBER_ME_KEY, SAVED_EMAIL_KEY } from "@/lib/storage";

/** Wrapper required because useSearchParams() needs a Suspense boundary in Next.js 16. */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted">Loading&hellip;</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState(() => {
    // SSR-safe: read from localStorage on first render (client only)
    if (typeof window === "undefined") return "";
    const saved = localStorage.getItem(REMEMBER_ME_KEY);
    return saved === "true"
      ? localStorage.getItem(SAVED_EMAIL_KEY) ?? ""
      : "";
  });
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(REMEMBER_ME_KEY) === "true";
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(mapAuthError(error.message));
      setLoading(false);
      return;
    }

    // Save Remember Me preference
    if (rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, "true");
      localStorage.setItem(SAVED_EMAIL_KEY, email);
    } else {
      localStorage.setItem(REMEMBER_ME_KEY, "false");
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    // Verify session is valid before redirecting
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Existing users logging in should not see the onboarding wizard.
      // This flag is set here so that the OnboardingWizard component
      // (which only shows when onboardingComplete is falsy) stays hidden.
      // Newly registered users get the wizard because clearLocalAppData()
      // in the register page resets the flag to false.
      completeOnboarding();

      // Hard navigation ensures the proxy runs and session is recognized
      window.location.href = redirectTo;
    } else {
      setError("Session could not be verified. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-bg">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 size-96 rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-accent/3 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(var(--c-line) 1px, transparent 1px), linear-gradient(90deg, var(--c-line) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Brand header */}
      <div className="relative z-10 flex items-center justify-center pt-8 sm:pt-12">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/25">
            <Activity className="size-5" strokeWidth={2.5} />
          </span>
          <span className="font-mono text-base font-bold tracking-tight">
            Growly
          </span>
        </Link>
      </div>

      {/* Auth form */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl border border-line bg-surface/80 p-6 shadow-[var(--shadow-lg)] backdrop-blur-sm sm:p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-glow text-white shadow-lg shadow-accent/25">
              <Sparkles className="size-5" strokeWidth={2.5} />
            </span>
            <h1 className="text-xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted">
              Sign in to continue your streak
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-muted"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full rounded-xl border border-line bg-surface2 py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-faint transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium text-muted"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-line bg-surface2 py-2.5 pl-10 pr-10 text-sm outline-none placeholder:text-faint transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-muted transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border-line bg-surface2 text-accent accent-accent focus:ring-accent/30"
              />
              <span className="text-xs text-muted">Stay signed in</span>
            </label>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-missed/10 px-3 py-2.5 text-xs text-missed">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in&hellip;
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="size-4" /> Sign in
                </span>
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-accent hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 pb-6 text-center">
        <p className="font-mono text-[10px] text-faint">
          honest habit tracking &mdash; v0.5
        </p>
      </footer>
    </div>
  );
}

/** Maps Supabase error messages to user-friendly strings. */
function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid email or password")
  ) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("user not found")) {
    return "No account found with this email address.";
  }
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("timeout")
  ) {
    return "Connection error. Please check your internet and try again.";
  }

  return message.length > 120 ? message.slice(0, 120) + "…" : message;
}
