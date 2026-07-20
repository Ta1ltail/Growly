"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Mail,
  Lock,
  UserPlus,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Activity,
  Loader2,
  Check,
  X,
  ArrowRight,
  Quote,
  Shield,
  Zap,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  STORAGE_KEY,
  SCHEMA_VERSION,
  SAVED_EMAIL_KEY,
  REMEMBER_ME_KEY,
} from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { PasswordRequirements } from "@/components/ui/PasswordRequirements";

/* ── Password strength evaluation ── */
function evaluateStrength(pw: string): {
  score: number; // 0–4
  label: string;
  color: string;
  bars: number;
} {
  if (!pw) return { score: 0, label: "", color: "", bars: 0 };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  if (score <= 1)
    return { score, label: "Weak", color: "var(--color-missed)", bars: 1 };
  if (score === 2)
    return { score, label: "Fair", color: "#f97316", bars: 2 };
  if (score === 3)
    return { score, label: "Good", color: "#eab308", bars: 3 };
  return { score, label: "Strong", color: "var(--color-done)", bars: 4 };
}

/* ── Password requirements checklist ── */
const REQUIREMENTS = [
  { label: "At least 6 characters", test: (pw: string) => pw.length >= 6 },
  {
    label: "Uppercase & lowercase",
    test: (pw: string) => /[a-z]/.test(pw) && /[A-Z]/.test(pw),
  },
  { label: "At least one number", test: (pw: string) => /\d/.test(pw) },
  {
    label: "At least one symbol",
    test: (pw: string) => /[^a-zA-Z0-9]/.test(pw),
  },
];

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const pwStrength = useMemo(() => evaluateStrength(password), [password]);
  const passwordsMatch =
    confirmPassword.length === 0 || password === confirmPassword;

  // Derive validation flags synchronously
  const rawUsername = username.trim().toLowerCase().replace(/^@/, "");
  const usernameTooShort = rawUsername.length < 2;
  const usernameInvalidChars =
    !usernameTooShort && !/^[a-z0-9_]+$/.test(rawUsername);
  const shouldCheckUsername =
    !usernameTooShort && !usernameInvalidChars;

  // Debounced username availability check
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!shouldCheckUsername) return;
    queueMicrotask(() => setCheckingUsername(true));
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(async () => {
      const supabase = createClient();
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

  // Reset validation state when input is too short or invalid
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

    // Validation
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
      setError(
        'Username "' + cleanUsername + '" is already taken. Try another one.',
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
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
      window.location.href = "/login";
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SAVED_EMAIL_KEY);
      localStorage.removeItem("growly.last_auth_user");
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
          spent: [],
          owned: [],
          equipped: {},
          freezes: [],
          bonusCoins: 0,
          lastCheckIn: null,
          checkInStreak: 0,
          lastQuestDate: null,
          currentQuest: null,
          lastSpinDate: null,
          lastSpinResult: null,
        },
        progressSeen: {
          seeded: false,
          level: 1,
          title: "Habit Newbie",
          shop: [],
          streaks: {},
          tierUnlocks: [],
        },
      };
      localStorage.setItem("growly.data.v1", JSON.stringify(seededData));
      localStorage.setItem(REMEMBER_ME_KEY, "true");
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/login";
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* ── Minimal header with brand ── */}
      <div className="sticky top-0 z-10 bg-bg/90 backdrop-blur-sm px-5 py-4 lg:hidden">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-glow text-white shadow-lg shadow-accent/20">
            <Activity className="size-5" strokeWidth={2.5} />
          </span>
          <span className="text-base font-bold tracking-tight">Growly</span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-6 lg:py-10 safe-area-bottom">
        <div className="flex w-full max-w-md flex-col lg:flex-row lg:gap-12 lg:max-w-4xl lg:items-center">
          {/* ── Left: Value props (desktop only) ── */}
          <div className="hidden lg:block lg:w-1/2 lg:pr-8">
            <Link href="/" className="group inline-flex items-center gap-2.5 mb-8">
              <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-glow text-white shadow-lg shadow-accent/20 transition-all duration-300 group-hover:shadow-accent/40">
                <Activity className="size-5" strokeWidth={2.5} />
              </span>
              <span className="text-lg font-bold tracking-tight">Growly</span>
            </Link>
            <Quote className="mb-4 size-6 text-accent/30" />
            <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              Start your journey
              <br />
              <span className="bg-gradient-to-r from-accent to-accent-glow bg-clip-text text-transparent">
                in under 60 seconds
              </span>
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              Create your free account and start building streaks that matter. No
              credit card needed — ever.
            </p>
            <div className="mt-8 space-y-4">
              {[
                { icon: Target, text: "Set up your first habit in seconds" },
                { icon: Zap, text: "Unlock achievements as you grow" },
                { icon: Shield, text: "100% free, no hidden fees" },
                {
                  icon: Sparkles,
                  text: "Sync across devices seamlessly",
                },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <item.icon className="size-4" />
                  </span>
                  <span className="text-sm text-muted">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Form ── */}
          <div className="w-full lg:w-1/2">
          
          {/* Form header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              Start tracking your habits and building streaks today.
            </p>
          </div>

          {/* Social signup buttons */}
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
              <span className="bg-bg px-3 text-faint">
                or sign up with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-xs font-medium text-muted"
              >
                Username
              </label>
              <div className="group relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted transition-colors duration-200 group-focus-within:text-accent" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value.replace(/[^a-zA-Z0-9_]/g, ""),
                    )
                  }
                  placeholder="yourname"
                  autoComplete="username"
                  autoFocus
                  maxLength={30}
                  className="w-full rounded-xl border border-line/70 bg-surface/50 px-10 py-2.5 text-sm outline-none backdrop-blur-sm transition-all duration-200 placeholder:text-faint/70 hover:border-line focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15"
                />
                {/* Availability indicator */}
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
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

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-muted"
              >
                Email address
              </label>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted transition-colors duration-200 group-focus-within:text-accent" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-line/70 bg-surface/50 px-10 py-2.5 text-sm outline-none backdrop-blur-sm transition-all duration-200 placeholder:text-faint/70 hover:border-line focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15"
                />
              </div>
            </div>

            {/* Password */}
            <div className="relative">
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium text-muted"
              >
                Password
              </label>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted transition-colors duration-200 group-focus-within:text-accent" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="Create a strong password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-line/70 bg-surface/50 px-10 py-2.5 text-sm outline-none backdrop-blur-sm transition-all duration-200 placeholder:text-faint/70 hover:border-line focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink"
                  tabIndex={-1}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>

              {/* Floating password requirements tooltip — no layout shift */}
              <PasswordRequirements
                password={password}
                requirements={REQUIREMENTS}
                isFocused={passwordFocused}
                strengthLabel={pwStrength.label}
                strengthColor={pwStrength.color}
                strengthBars={pwStrength.bars}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-xs font-medium text-muted"
              >
                Confirm password
              </label>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted transition-colors duration-200 group-focus-within:text-accent" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                  className={`w-full rounded-xl border bg-surface/50 px-10 py-2.5 text-sm outline-none backdrop-blur-sm transition-all duration-200 placeholder:text-faint/70 hover:border-line focus:bg-surface focus:ring-2 ${
                    confirmPassword.length > 0 && !passwordsMatch
                      ? "border-missed/50 focus:border-missed focus:ring-missed/15"
                      : "border-line/70 focus:border-accent focus:ring-accent/15"
                  }`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink"
                  tabIndex={-1}
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1.5 animate-fade-in text-[11px] text-missed">
                  Passwords don&apos;t match
                </p>
              )}
            </div>

            {/* Terms */}
            <p className="text-[11px] leading-relaxed text-faint">
              By creating an account, you agree to our Terms of Service and
              Privacy Policy. Your data is encrypted and never shared.
            </p>

            {/* Error message */}              {error && (
              <div className="flex animate-fade-in items-start gap-2 rounded-xl bg-missed/8 px-3.5 py-2.5 text-xs text-missed">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
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

          {/* Footer link */}
          <p className="mt-6 text-center text-xs text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-semibold text-accent transition-colors hover:text-accent-glow"
            >
              Sign in
              <ArrowRight className="size-3" />
            </Link>
          </p>

          </div>
        </div>
      </div>
    </div>
  );
}

/** Maps Supabase error messages to user-friendly strings. */
function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("weak password")) {
    return "Password is too weak. Use at least 6 characters with a mix of letters and numbers.";
  }
  if (
    lower.includes("already registered") ||
    lower.includes("user already exists")
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (
    lower.includes("username") &&
    (lower.includes("taken") || lower.includes("already exists"))
  ) {
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
