"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, UserPlus, User, AlertCircle, Eye, EyeOff, Sparkles, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clearLocalAppData } from "@/lib/storage";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // Sign up
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
        },
      },
    });

    if (signUpError) {
      setError(mapAuthError(signUpError.message));
      setLoading(false);
      return;
    }

    // Since email confirmation is disabled, try to sign in immediately
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // If sign-in fails, redirect to login
      window.location.href = "/login";
      return;
    }

    // Verify session is valid
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // ── Fresh start for every new account ──
      // Clear any stale data from a previous user that may still be in
      // localStorage (e.g. if the previous user didn't sign out). This
      // ensures a newly registered user never inherits someone else's habits,
      // marks, unlocks, or profile.
      clearLocalAppData();

      // Save Remember Me preference
      localStorage.setItem("project101.remember_me", "true");
      // Hard navigation ensures the proxy runs
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/login";
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
            project_101
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
            <h1 className="text-xl font-bold tracking-tight">Get started</h1>
            <p className="mt-1 text-sm text-muted">
              Create your account and start tracking today
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="displayName"
                className="mb-1.5 block text-xs font-medium text-muted"
              >
                Display name <span className="text-faint">(optional)</span>
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  autoFocus
                  className="w-full rounded-xl border border-line bg-surface2 py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-faint transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </div>
            </div>

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
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
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

            {/* Password hint */}
            <p className="text-[11px] text-faint leading-relaxed">
              By creating an account, you agree to our Terms of Service and Privacy
              Policy. Your data is encrypted and never shared.
            </p>

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
                  Creating account&hellip;
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="size-4" /> Create account
                </span>
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-accent hover:underline"
            >
              Sign in
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

  if (lower.includes("weak password")) {
    return "Password is too weak. Use at least 6 characters with a mix of letters and numbers.";
  }
  if (lower.includes("already registered") || lower.includes("user already exists")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("timeout")
  ) {
    return "Connection error. Please check your internet and try again.";
  }
  if (lower.includes("invalid email")) {
    return "Please enter a valid email address.";
  }

  return message.length > 120 ? message.slice(0, 120) + "…" : message;
}
