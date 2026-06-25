import Link from "next/link";
import { Activity, ArrowRight, BarChart3, Target, Zap, Shield, Sparkles, Smartphone } from "lucide-react";

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
            project_101
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

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-24 sm:pt-32">
        <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-accent/10 blur-[120px]" />
        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              <Sparkles className="size-3" /> Honest tracking · Real progress
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Build habits that<br />
              <span className="bg-gradient-to-r from-accent via-accent-glow to-accent bg-clip-text text-transparent">
                actually stick
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-muted sm:text-lg">
              Track daily habits, earn achievements, and build streaks — all
              with honest, local-first tracking designed to keep you going.
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
        <p className="text-center font-mono text-xs text-faint">
          project_101 · honest habit tracking · v0.5
        </p>
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
