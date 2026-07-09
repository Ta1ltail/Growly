"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Mail, Lock, UserPlus, AtSign, AlertCircle, Eye, EyeOff, Sparkles, Activity, Loader2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_KEY, SCHEMA_VERSION, SAVED_EMAIL_KEY, REMEMBER_ME_KEY } from "@/lib/storage";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Derive validation flags synchronously from the raw input to avoid
  // react-hooks/set-state-in-effect for the early-return branches.
  const rawUsername = username.trim().toLowerCase().replace(/^@/, "");
  const usernameTooShort = rawUsername.length < 2;
  const usernameInvalidChars = !usernameTooShort && !/^[a-z0-9_]+$/.test(rawUsername);
  const shouldCheckUsername = !usernameTooShort && !usernameInvalidChars;

  // Debounced username availability check
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!shouldCheckUsername) {
      return;
    }
    queueMicrotask(() => setCheckingUsername(true));
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(async () => {
      const supabase = createClient();
      // username_exists() is a SECURITY DEFINER RPC that returns only a boolean,
      // so anon can check availability without read access to profile rows.
      const { data } = await supabase.rpc("username_exists", {
        p_username: rawUsername,
      });
      setUsernameAvailable(data === false);
      setCheckingUsername(false);
    }, 400);
    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [username, rawUsername, shouldCheckUsername]);

  // Separate effect to reset validation state when input is too short or invalid
  useEffect(() => {
    if (usernameTooShort || usernameInvalidChars) {
      queueMicrotask(() => {
        setUsernameAvailable(null);
        setCheckingUsername(false);
      });
    }
  }, [usernameTooShort, usernameInvalidChars]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    if (!cleanUsername || cleanUsername.length < 2) {
      setError("Username must be at least 2 characters.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setError("Username can only contain letters, numbers, and underscores.");
      return;
    }
    if (usernameAvailable === false) {
      setError('Username "' + cleanUsername + '" is already taken. Try another one.');
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // Sign up — pass both username and a display_name placeholder
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: cleanUsername, // start with username as display name
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
      // Clear any stale data from a previous user, then seed the local
      // profile with the submitted username. This prevents the default
      // profile (which has a hardcoded placeholder username) from being
      // pushed to Supabase later, which would cause 23505 conflicts.
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SAVED_EMAIL_KEY);
      localStorage.removeItem("project101.last_auth_user");
      const seededData = {
        version: SCHEMA_VERSION,
        habits: [],
        marks: {},
        notes: [],
        goals: [],
        auditLog: [],
        settings: {
          theme: { mode: "dark" as const, accent: "blue" },
          graceHours: 5,
          usedTemplateIds: [],
        },
        profile: { displayName: cleanUsername, username: cleanUsername },
        unlocks: {},
        economy: {
          spent: [], owned: [], equipped: {}, freezes: [],
          bonusCoins: 0, lastCheckIn: null, checkInStreak: 0,
          lastQuestDate: null, currentQuest: null,
          lastSpinDate: null, lastSpinResult: null,
        },
        progressSeen: {
          seeded: false, level: 1, title: "Habit Newbie",
          shop: [], streaks: {}, tierUnlocks: [],
        },
      };
      localStorage.setItem("project101.data.v1", JSON.stringify(seededData));

      // Save Remember Me preference
      localStorage.setItem(REMEMBER_ME_KEY, "true");
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
                htmlFor="username"
                className="mb-1.5 block text-xs font-medium text-muted"
              >
                Username
              </label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  placeholder="yourname"
                  autoComplete="username"
                  autoFocus
                  maxLength={30}
                  className="w-full rounded-xl border border-line bg-surface2 py-2.5 pl-10 pr-10 text-sm outline-none placeholder:text-faint transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
                {/* Availability indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername ? (
                    <Loader2 className="size-4 animate-spin text-faint" />
                  ) : usernameAvailable === true ? (
                    <Check className="size-4 text-done" />
                  ) : usernameAvailable === false ? (
                    <X className="size-4 text-missed" />
                  ) : null}
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-faint">
                Letters, numbers, and underscores. Must be unique.
              </p>
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
  if (lower.includes("username") && (lower.includes("taken") || lower.includes("already exists"))) {
    return "This username is already taken. Please choose another one.";
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
