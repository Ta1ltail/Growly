import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Target,
  Zap,
  Shield,
  Sparkles,
  Smartphone,
  Check,
  Star,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* ── Nav ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2 font-mono text-sm font-bold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-white">
              <Activity className="size-3.5" strokeWidth={2.5} />
            </span>
            Growly
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero — full viewport height ── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-48 -top-48 size-[32rem] rounded-full bg-accent/8 blur-[150px]" />
          <div className="absolute -bottom-48 -right-48 size-[32rem] rounded-full bg-accent/5 blur-[150px]" />
          <div className="absolute left-1/2 top-1/3 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/4 blur-[120px]" />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(var(--c-line) 1px, transparent 1px), linear-gradient(90deg, var(--c-line) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Make Today Count.
              <br />
              <span className="bg-gradient-to-r from-accent via-accent-glow to-accent bg-clip-text text-transparent">
                Build habits that stick
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-muted sm:text-lg">
              Track daily habits, earn achievements, build streaks, and grow
              with friends — all with honest, local-first tracking designed to
              keep you going.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:brightness-110 active:scale-95"
              >
                Start free <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-line px-6 py-3 text-sm font-semibold text-muted transition-colors hover:bg-surface2 hover:text-ink"
              >
                Sign in
              </Link>
            </div>

            {/* Trust markers */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-done" /> No credit card
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-done" /> Works offline
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-done" /> Local-first data
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-line bg-surface/50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need to stay consistent
            </h2>
            <p className="mt-3 text-muted">
              A modern habit tracker that respects your data and your time.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Target}
              title="Habit tracking"
              desc="Mark habits done/missed/skipped with one tap. Schedule daily, weekly, or monthly."
            />
            <FeatureCard
              icon={BarChart3}
              title="Rich analytics"
              desc="Completion rates, streaks, consistency scores, and smart insights powered by your actual data."
            />
            <FeatureCard
              icon={Zap}
              title="Gamification"
              desc="XP, levels, titles, achievements, and a shop with unlockable cosmetics. Progress feels rewarding."
            />
            <FeatureCard
              icon={Shield}
              title="Honest tracking"
              desc="Past days lock automatically. Streaks are earned, not manufactured. No cheating."
            />
            <FeatureCard
              icon={Smartphone}
              title="Works offline"
              desc="PWA with service worker. Your data stays on your device — no account needed to start."
            />
            <FeatureCard
              icon={Sparkles}
              title="Beautiful UI"
              desc="Dark/light themes, custom accent colors, smooth animations, and a fully responsive design."
            />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-accent/10">
            <Star className="size-6 text-accent" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Start your streak today
          </h2>
          <p className="mt-3 text-muted">
            No credit card. No data collection. Just a simple, honest habit
            tracker that works.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:brightness-110 active:scale-95"
            >
              Get started <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-line py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="flex items-center gap-2 font-mono text-xs font-bold text-faint">
              <span className="flex size-6 items-center justify-center rounded-md bg-accent/20 text-accent">
                <Activity className="size-3" strokeWidth={2.5} />
              </span>
              Growly
            </span>
            <div className="flex items-center gap-4 text-xs text-muted">
              <Link href="/login" className="hover:text-ink transition-colors">
                Sign in
              </Link>
              <Link
                href="/register"
                className="hover:text-ink transition-colors"
              >
                Register
              </Link>
            </div>
            <p className="font-mono text-[10px] text-faint">
              honest habit tracking · v0.5
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Target;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
      <span className="mb-3 flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Icon className="size-[18px]" />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{desc}</p>
    </div>
  );
}
