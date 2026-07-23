"use client";

// Statistics — meaningful analytics, not just raw numbers: completion,
// streaks, consistency, a trend chart, per-category and per-weekday breakdowns,
// and plain-language insights. All stat cards use fixed sizes to prevent layout
// shifting. The Last 7 Days section is fixed with internal scrolling.

import { useMemo, useState } from "react";
import {
  Target,
  CircleCheckBig,
  Flame,
  TrendingUp,
  Activity,
  ChartColumnIncreasing,
  Sparkles,
  Gauge,
  ArrowUp,
  ArrowDown,
  Minus,
  Link2,
} from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { useAppData } from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { addDays } from "@/lib/date";
import {
  categoryCompletion,
  completionByWeekday,
  consistencyScore,
  habitCorrelations,
  habitStreaks,
  lastNDaysCompletion,
  rangeCompletion,
} from "@/lib/stats";
import { frozenSet } from "@/lib/economy";
import { buildInsights } from "@/lib/insights";
import { WEEKDAY_SHORT } from "@/lib/format";
import { TONE } from "@/lib/util";
import { weeklyProjection } from "@/lib/prediction";
import { summarizeProgress } from "@/lib/progress";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/StaggerContainer";
import { TrendLineChart } from "@/components/stats/TrendLineChart";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useHydrated } from "@/hooks/useHydrated";
import { AppPageShell } from "@/components/layout/AppPageShell";

const PERIODS = [
  { value: "7" as const, label: "Week" },
  { value: "30" as const, label: "Month" },
  { value: "90" as const, label: "90 days" },
];

export default function StatsPage() {
  const data = useAppData();
  const today = useToday();
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const days = Number(period);
  const active = useMemo(
    () => data.habits.filter((h) => !h.archived && !h.deletedAt),
    [data.habits],
  );
  const from = useMemo(() => addDays(today, -(days - 1)), [today, days]);

  const range = useMemo(
    () => rangeCompletion(active, data.marks, from, today),
    [active, data.marks, from, today],
  );
  const chart = useMemo(
    () => lastNDaysCompletion(active, data.marks, today, 14),
    [active, data.marks, today],
  );
  const byCategory = useMemo(
    () => categoryCompletion(active, data.marks, from, today),
    [active, data.marks, from, today],
  );
  const topCategories = useMemo(
    () => [...byCategory].sort((a, b) => b.rate - a.rate),
    [byCategory],
  );
  const week7 = useMemo(
    () => lastNDaysCompletion(active, data.marks, today, 7),
    [active, data.marks, today],
  );
  const byWeekday = useMemo(
    () => completionByWeekday(active, data.marks, today, days),
    [active, data.marks, today, days],
  );
  const consistency = useMemo(
    () => consistencyScore(active, data.marks, today, days),
    [active, data.marks, today, days],
  );
  const insights = useMemo(
    () => buildInsights(active, data.marks, today, 4),
    [active, data.marks, today],
  );
  const frozen = useMemo(() => frozenSet(data.economy), [data.economy]);
  const correlations = useMemo(
    () => habitCorrelations(active, data.marks),
    [active, data.marks],
  );

  // Prediction engine
  const summary = useMemo(() => summarizeProgress(data, today), [data, today]);
  const xpPerDay = useMemo(() => {
    if (active.length === 0 || summary.xp === 0) return 0;
    const firstDate = active.reduce((earliest, h) => {
      const d = new Date(h.createdAt);
      return d < earliest ? d : earliest;
    }, new Date());
    const daysElapsed = Math.max(
      1,
      Math.round((today.getTime() - firstDate.getTime()) / 86400000),
    );
    return Math.round(summary.xp / daysElapsed);
  }, [active, summary.xp, today]);

  const projection = useMemo(
    () =>
      weeklyProjection(
        active,
        data.marks,
        today,
        xpPerDay,
        summary.level.xpForNext - summary.level.xpIntoLevel,
      ),
    [active, data.marks, today, xpPerDay, summary.level],
  );
  const streaks = useMemo(() => {
    let best = 0,
      current = 0;
    for (const h of active) {
      const s = habitStreaks(h, data.marks, today, frozen);
      best = Math.max(best, s.best);
      current = Math.max(current, s.current);
    }
    return { best, current };
  }, [active, data.marks, today, frozen]);

  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;

  if (active.length === 0) {
    return (
      <AppPageShell>
        <div className="animate-fade-in">
          <PageHeader title="Statistics" subtitle="Your progress over time" />
          <EmptyState
            icon={ChartColumnIncreasing}
            title="No data yet"
            hint="Add and mark some habits to unlock your stats."
            illustration="stats"
          />
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell>
      <PageHeader
        title="Statistics"
        subtitle="Your progress over time"
        action={
          <Segmented options={PERIODS} value={period} onChange={setPeriod} />
        }
      />

      {/* Fixed-size stat cards — 2 cols mobile, 3 tablet, 5 desktop */}
      <StaggerContainer className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        <StatCard
          icon={Target}
          value={`${range.rate}%`}
          label="Completion"
          accent
        />
        <StatCard
          icon={Activity}
          value={`${consistency}%`}
          label="Consistency"
        />
        <StatCard icon={CircleCheckBig} value={range.done} label="Done" />
        <StatCard icon={Flame} value={streaks.best} label="Best streak" />
        <StatCard
          icon={TrendingUp}
          value={streaks.current}
          label="Current streak"
        />
      </StaggerContainer>

      {insights.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Sparkles className="size-4 icon-accent" /> Insights
          </h2>
          <StaggerContainer className="grid gap-3 sm:grid-cols-2">
            {insights.map((ins, i) => (
              <StaggerItem key={i}>
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${TONE[ins.tone]}`}
                >
                  {ins.text}
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      )}

      {/* Prediction — fixed-size cards */}
      {active.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Gauge className="size-4 icon-accent" /> Projection
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="flex flex-col justify-center p-4 min-h-[100px]">
              <p className="text-xs font-medium text-muted">Estimated completion</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight">
                {projection.estimatedCompletion}%
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                {projection.trend === "up" && (
                  <ArrowUp className="size-3.5 text-done" />
                )}
                {projection.trend === "down" && (
                  <ArrowDown className="size-3.5 text-missed" />
                )}
                {projection.trend === "stable" && (
                  <Minus className="size-3.5 text-muted" />
                )}
                <span className="text-[11px] capitalize text-muted">
                  {projection.trend}
                </span>
              </div>
            </Card>
            <Card className="flex flex-col justify-center p-4 min-h-[100px]">
              <p className="text-xs font-medium text-muted">Projected streak</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight">
                {projection.estimatedStreak}
              </p>
              <p className="mt-1 text-[11px] text-muted">days in next 7</p>
            </Card>
            <Card className="flex flex-col justify-center p-4 min-h-[100px]">
              <p className="text-xs font-medium text-muted">XP per day</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight">
                {xpPerDay}
              </p>
              <p className="mt-1 text-[11px] text-muted">Average</p>
            </Card>
            <Card className="flex flex-col justify-center p-4 min-h-[100px]">
              <p className="text-xs font-medium text-muted">Next level</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight">
                {projection.estimatedDaysToNextLevel != null
                  ? `${projection.estimatedDaysToNextLevel}d`
                  : "—"}
              </p>
              <p className="mt-1 text-[11px] text-muted">At current pace</p>
            </Card>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent trends — interactive line chart */}
        <div className="flex flex-col">
          <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">
            Recent trends
          </h2>
          <Card className="flex flex-1 flex-col p-5 min-h-[260px]">
            <div className="flex-1 min-h-0">
              <TrendLineChart points={chart} />
            </div>
          </Card>
        </div>
        {/* Last 7 Days — bar chart matching the line chart aesthetic */}
        <div className="flex flex-col">
          <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">
            Last 7 days
          </h2>
          <Card className="flex flex-1 flex-col p-5 min-h-[260px]">
            <div className="relative flex-1 flex items-end gap-2">
              {/* Grid lines background */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  left: "10%", right: 0,
                  top: "5%", bottom: "8%",
                }}
              >
                {[0, 25, 50, 75, 100].map((g) => (
                  <div
                    key={g}
                    className="absolute w-full border-t border-dashed"
                    style={{
                      borderColor: "var(--c-line)",
                      borderWidth: "0.5px",
                      top: `${100 - g}%`,
                    }}
                  />
                ))}
              </div>
              {/* Bars */}
              {week7.map(({ date, rate }) => (
                <div
                  key={date.toISOString()}
                  className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end relative z-10"
                >
                  {/* Bar — title attr provides native tooltip */}
                  <div className="relative flex w-full items-end justify-center">
                    <div
                      className="w-full max-w-8 rounded-t-md transition-all duration-500 ease-out hover:brightness-110"
                      style={{
                        height: `${Math.max(rate, 4)}%`,
                        background:
                          rate >= 100
                            ? "var(--color-done)"
                            : rate >= 50
                              ? "var(--c-accent)"
                              : "var(--c-accent-glow)",
                        opacity: rate === 0 ? 0.25 : 0.85,
                      }}
                      title={`${rate}%`}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-medium text-muted shrink-0">
                    {date.toLocaleDateString(undefined, {
                      weekday: "narrow",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        {/* Top categories — scrollable */}
        <div className="flex flex-col">
          <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">
            Top categories
          </h2>
          <Card className="flex flex-1 flex-col p-5 overflow-y-auto min-h-[240px]">
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted">
                Complete some habits to see category breakdowns.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {topCategories.map(({ category, rate }) => (
                  <div key={category}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor: CATEGORY_COLORS[category],
                          }}
                        />
                        {category}
                      </span>
                      <span className="font-mono tabular-nums text-muted">
                        {rate}%
                      </span>
                    </div>
                    <ProgressBar
                      value={rate}
                      color={CATEGORY_COLORS[category]}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        {/* By weekday */}
        <div className="flex flex-col">
          <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">
            By weekday
          </h2>
          <Card className="flex flex-1 flex-col p-5 overflow-y-auto min-h-[240px]">
            <div className="flex flex-col gap-3">
              {byWeekday.map(({ weekday, rate }) => (
                <div key={weekday} className="flex items-center gap-3">
                  <span className="w-9 shrink-0 font-mono text-xs font-medium text-muted">
                    {WEEKDAY_SHORT[weekday]}
                  </span>
                  <div className="flex-1">
                    <ProgressBar value={rate} />
                  </div>
                  <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                    {rate}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Habit correlations */}
      {correlations.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Link2 className="size-4 icon-accent" /> Habit Correlations
          </h2>
          <Card className="p-5">
            <p className="mb-3 text-xs text-muted">
              Habits you tend to complete together. Higher strength means when
              you do one, you almost always do the other.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {correlations.slice(0, 6).map((pair) => (
                <div
                  key={`${pair.habitA.id}-${pair.habitB.id}`}
                  className="flex items-center gap-3 rounded-xl bg-surface2/50 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <span>{pair.habitA.name}</span>
                      <span className="text-faint">+</span>
                      <span>{pair.habitB.name}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {pair.bothDone} of {pair.totalShared} days together
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{pair.strength}%</span>
                    <p className="text-[10px] text-muted">strength</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </AppPageShell>
  );
}
