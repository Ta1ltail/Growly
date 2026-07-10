"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  Activity,
  Sparkles,
  ArrowRight,
  Quote,
  Check,
  Target,
  Zap,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { completeOnboarding } from "@/lib/store";
import { REMEMBER_ME_KEY, SAVED_EMAIL_KEY } from "@/lib/storage";

/** Wrapper required because useSearchParams() needs a Suspense boundary in Next.js 16. */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-accent/10">
              <Activity className="size-6 text-accent animate-pulse" strokeWidth={2.5} />
            </div>
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

    if (rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, "true");
      localStorage.setItem(SAVED_EMAIL_KEY, email);
    } else {
      localStorage.setItem(REMEMBER_ME_KEY, "false");
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      completeOnboarding();
      window.location.href = redirectTo;
    } else {
      setError("Session could not be verified. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg lg:flex-row">
      {/* ── Left panel: Branding / showcase ── */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-accent/8 via-accent/4 to-transparent px-8 py-10 lg:w-1/2 lg:px-12 lg:py-14">
        {/* Background decorations */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 size-[30rem] rounded-full bg-accent/6 blur-[140px]" />
          <div className="absolute -bottom-20 -right-20 size-[30rem] rounded-full bg-accent/4 blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(var(--c-line) 1px, transparent 1px), linear-gradient(90deg, var(--c-line) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg/40 to-transparent lg:bg-gradient-to-r lg:from-bg/20 lg:to-transparent" />
        </div>

        {/* Brand link */}
        <div className="relative z-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-glow text-white shadow-lg shadow-accent/20 transition-all duration-300 group-hover:shadow-accent/40">
              <Activity className="size-5" strokeWidth={2.5} />
            </span>
            <span className="text-lg font-bold tracking-tight">Growly</span>
          </Link>
        </div>

        {/* Value props (desktop) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 hidden lg:block"
        >
          <Quote className="mb-4 size-6 text-accent/30" />
          <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            Build habits that
            <br />
            <span className="bg-gradient-to-r from-accent to-accent-glow bg-clip-text text-transparent">
              actually stick
            </span>
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Join thousands of people who&apos;ve transformed their daily routines
            with honest, local-first habit tracking.
          </p>

          {/* Feature bullets */}
          <div className="mt-8 space-y-4">
            {[
              { icon: Target, text: "Track daily habits in seconds" },
              { icon: Zap, text: "Earn rewards and level up" },
              { icon: Shield, text: "Your data stays on your device" },
              { icon: Sparkles, text: "Beautiful, intuitive interface" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <item.icon className="size-4" />
                </span>
                <span className="text-sm text-muted">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom branding (desktop) */}
        <div className="relative z-10 hidden lg:block">
          <p className="font-mono text-[11px] text-faint">
            honest habit tracking &middot; v0.5
          </p>
        </div>
      </div>

      {/* ── Right panel: Form ── */}
      <div className="relative flex flex-1 items-center justify-center px-5 py-8 lg:px-12 lg:py-14">
        {/* Mobile brand header */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-center pt-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
              <Activity className="size-4" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-bold">Growly</span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Form header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted">
              Sign in to continue your streak
            </p>
          </div>

          {/* Social login buttons */}
          <div className="mb-6 flex gap-3">
            <button
              type="button"
              disabled
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line/60 bg-surface/50 px-4 py-2.5 text-sm font-medium text-muted shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-line hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
            <button
              type="button"
              disabled
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line/60 bg-surface/50 px-4 py-2.5 text-sm font-medium text-muted shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-line hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line/60" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-bg px-3 text-faint">or continue with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-muted"
              >
                Email address
              </label>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint transition-colors duration-200 group-focus-within:text-accent" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full rounded-xl border border-line/70 bg-surface/50 px-10 py-2.5 text-sm outline-none backdrop-blur-sm transition-all duration-200 placeholder:text-faint/70 hover:border-line focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-muted"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="text-[11px] font-medium text-accent transition-colors hover:text-accent-glow"
                  tabIndex={-1}
                >
                  Forgot password?
                </button>
              </div>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint transition-colors duration-200 group-focus-within:text-accent" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-line/70 bg-surface/50 px-10 py-2.5 text-sm outline-none backdrop-blur-sm transition-all duration-200 placeholder:text-faint/70 hover:border-line focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-muted"
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
            <label className="flex cursor-pointer items-center gap-2.5 select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer size-4 appearance-none rounded-md border border-line/70 bg-surface/50 transition-all duration-200 checked:border-accent checked:bg-accent hover:border-line focus:ring-2 focus:ring-accent/15"
                />
                {rememberMe && (
                  <Check className="pointer-events-none absolute left-0 top-0 size-4 text-white" strokeWidth={3} />
                )}
              </div>
              <span className="text-xs text-muted">Stay signed in</span>
            </label>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-xl bg-missed/8 px-3.5 py-2.5 text-xs text-missed"
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit */}
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

          {/* Footer link */}
          <p className="mt-6 text-center text-xs text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="inline-flex items-center gap-1 font-semibold text-accent transition-colors hover:text-accent-glow"
            >
              Create an account
              <ArrowRight className="size-3" />
            </Link>
          </p>

          {/* Mobile footer */}
          <p className="mt-8 text-center font-mono text-[10px] text-faint lg:hidden">
            honest habit tracking &mdash; v0.5
          </p>
        </motion.div>
      </div>
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
