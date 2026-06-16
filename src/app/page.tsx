"use client";

// Dashboard — the at-a-glance command center: today's progress, momentum
// stats, a 7-day trend, top categories, and smart insights. Links into the
// deeper screens. Designed to fit without excessive scrolling.

import { useMemo } from "react";
import Link from "next/link";
import { Flame, TrendingUp, Activity, ArrowRight, ListChecks, Sparkles } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { useAppData } from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { useHydrated } from "@/hooks/useHydrated";
import { dateKey, addDays } from "@/lib/storage";
import {
  categoryCompletion,
  consistencyScore,
  dayCompletion,
  habitStreaks,
  isScheduled,
  lastNDaysCompletion,
} from "@/lib/stats";
import { frozenSet } from "@/lib/economy";
import { buildInsights } from "@/lib/insights";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { buttonClasses } from "@/components/ui/Button";

const TONE: Record<string, string> = {
  good: "border-done/30 bg-done/5 text-done",
  info: "border-accent/30 bg-accent/5 text-accent",
  warn: "border-amber-500/30 bg-amber-500/5 text-amber-500",
};

export default function DashboardPage() {
  const data = useAppData();
  const today = useToday();
  const hydrated = useHydrated();
  const todayKey = dateKey(today);
  const active = useMemo(() => data.habits.filter((h) => !h.archived), [data.habits]);

  const todaysHabits = useMemo(() => active.filter((h) => isScheduled(h, today)), [active, today]);
  const doneToday = todaysHabits.filter((h) => data.marks[todayKey]?.[h.id] === "done").length;
  const progress = dayCompletion(active, data.marks, today);

  const consistency = useMemo(() => consistencyScore(active, data.marks, today, 14), [active, data.marks, today]);
  const week = useMemo(() => lastNDaysCompletion(active, data.marks, today, 7), [active, data.marks, today]);
  const cats = useMemo(
    () => categoryCompletion(active, data.marks, addDays(today, -29), today).slice(0, 4),
    [active, data.marks, today],
  );
  const frozen = useMemo(() => frozenSet(data.economy), [data.economy]);
  const streaks = useMemo(() => {
    let best = 0, current = 0;
    for (const h of active) {
      const s = habitStreaks(h, data.marks, today, frozen);
      best = Math.max(best, s.best);
      current = Math.max(current, s.current);
    }
    return { best, current };
  }, [active, data.marks, today, frozen]);
  const insights = useMemo(() => buildInsights(active, data.marks, today), [active, data.marks, today]);

  if (!hydrated) return <PageSkeleton />;

  if (active.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Dashboard" subtitle="Your habits at a glance" />
        <EmptyState
          icon={Activity}
          title="Welcome to project_101"
          hint="Create your first habit to start building momentum. Your dashboard fills in as you go."
          action={
            <Link href="/today" className={buttonClasses()}>
              Go to Today <ArrowRight className="size-4" />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Your habits at a glance"
        action={
          <Link
            href="/today"
            className="hidden items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 sm:flex"
          >
            Open Today <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today summary */}
        <Card className="flex items-center gap-5 p-5">
          <ProgressRing value={progress} size={96}>
            <span className="font-mono text-xl font-bold">{progress}%</span>
          </ProgressRing>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Today</p>
            <p className="mt-1 text-2xl font-bold">
              {doneToday}
              <span className="text-base font-medium text-muted">/{todaysHabits.length}</span>
            </p>
            <p className="text-sm text-muted">habits done</p>
            <Link href="/today" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
              Complete them <ArrowRight className="size-3" />
            </Link>
          </div>
        </Card>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <StatCard icon={Activity} value={`${consistency}%`} label="14-day consistency" accent />
          <StatCard icon={Flame} value={streaks.current} label="Current streak" />
          <StatCard icon={TrendingUp} value={streaks.best} label="Best streak" />
          <StatCard icon={ListChecks} value={active.length} label="Active habits" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* 7-day trend */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Last 7 days</h2>
          <Card className="p-5">
            <div className="flex items-end justify-between gap-2 sm:gap-3">
              {week.map(({ date, rate }) => (
                <div key={date.toISOString()} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-28 w-full items-end justify-center">
                    <div
                      className="w-full max-w-9 rounded-t-lg transition-[height] duration-500"
                      style={{
                        height: `${Math.max(rate, 4)}%`,
                        background: rate >= 100 ? "var(--c-done)" : "var(--c-accent)",
                        opacity: rate === 0 ? 0.25 : 1,
                      }}
                      title={`${rate}%`}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-medium text-muted">
                    {date.toLocaleDateString(undefined, { weekday: "narrow" })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top categories */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Top categories</h2>
          <Card className="flex flex-col gap-3.5 p-5">
            {cats.length === 0 ? (
              <p className="text-sm text-muted">Complete some habits to see category breakdowns.</p>
            ) : (
              cats.map(({ category, rate }) => (
                <div key={category}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="size-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] }} />
                      {category}
                    </span>
                    <span className="font-mono text-muted">{rate}%</span>
                  </div>
                  <ProgressBar value={rate} color={CATEGORY_COLORS[category]} />
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Sparkles className="size-4" /> Insights
          </h2>
          <div className="grid gap-3 stagger-children sm:grid-cols-2">
            {insights.map((ins, i) => (
              <div key={i} className={`rounded-2xl border px-4 py-3 text-sm ${TONE[ins.tone]}`}>
                {ins.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
