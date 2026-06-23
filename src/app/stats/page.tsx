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
import { addDays } from "@/lib/storage";
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
    () => data.habits.filter((h) => !h.archived),
    [data.habits],
  );
  const from = useMemo(() => addDays(today, -(days - 1)), [today, days]);

  const range = useMemo(
    () => rangeCompletion(active, data.marks, from, today),
    [active, data.marks, from, today],
  );
  const chart = useMemo(
    () => lastNDaysCompletion(active, data.marks, today, Math.min(days, 14)),
    [active, data.marks, today, days],
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
      <div className="animate-fade-in">
        <PageHeader title="Statistics" subtitle="Your progress over time" />
        <EmptyState
          icon={ChartColumnIncreasing}
          title="No data yet"
          hint="Add and mark some habits to unlock your stats."
          illustration="stats"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Statistics"
        subtitle="Your progress over time"
        action={
          <Segmented options={PERIODS} value={period} onChange={setPeriod} />
        }
      />

      {/* Fixed-size stat cards */}
      <StaggerContainer className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
            <Sparkles className="size-4" /> Insights
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
            <Gauge className="size-4" /> Projection
          </h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="p-4 h-[100px] flex flex-col justify-center">
              <p className="text-xs text-muted">Estimated completion</p>
              <p className="mt-1 text-2xl font-bold">
                {projection.estimatedCompletion}%
              </p>
              <div className="mt-1 flex items-center gap-1">
                {projection.trend === "up" && (
                  <ArrowUp className="size-3.5 text-done" />
                )}
                {projection.trend === "down" && (
                  <ArrowDown className="size-3.5 text-missed" />
                )}
                {projection.trend === "stable" && (
                  <Minus className="size-3.5 text-muted" />
                )}
                <span className="text-[11px] text-muted capitalize">
                  {projection.trend}
                </span>
              </div>
            </Card>
            <Card className="p-4 h-[100px] flex flex-col justify-center">
              <p className="text-xs text-muted">Projected streak</p>
              <p className="mt-1 text-2xl font-bold">
                {projection.estimatedStreak} days
              </p>
              <p className="mt-1 text-[11px] text-muted">In the next 7 days</p>
            </Card>
            <Card className="p-4 h-[100px] flex flex-col justify-center">
              <p className="text-xs text-muted">XP per day</p>
              <p className="mt-1 text-2xl font-bold">{xpPerDay}</p>
              <p className="mt-1 text-[11px] text-muted">Average</p>
            </Card>
            <Card className="p-4 h-[100px] flex flex-col justify-center">
              <p className="text-xs text-muted">Next level</p>
              <p className="mt-1 text-2xl font-bold">
                {projection.estimatedDaysToNextLevel != null
                  ? `${projection.estimatedDaysToNextLevel}d`
                  : "—"}
              </p>
              <p className="mt-1 text-[11px] text-muted">At current pace</p>
            </Card>
          </div>
        </div>
      )}

      {/* Equal-height analytics cards — fixed height, internal scroll for overflow */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {/* Recent trends — interactive line chart */}
        <div className="h-[280px]">
          <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">
            Recent trends
          </h2>
          <Card className="p-5 h-[calc(100%-28px)] flex flex-col">
            <div className="flex-1 min-h-0">
              <TrendLineChart points={chart} height={180} />
            </div>
          </Card>
        </div>

        {/* Last 7 Days — fixed with bar chart, proper sizing */}
        <div className="h-[280px]">
          <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">
            Last 7 days
          </h2>
          <Card className="p-5 h-[calc(100%-28px)] flex flex-col">
            <div className="flex-1 flex items-end justify-between gap-2">
              {week7.map(({ date, rate }) => (
                <div
                  key={date.toISOString()}
                  className="flex flex-1 flex-col items-center gap-2 h-full justify-end"
                >
                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      className="w-full max-w-9 rounded-t-lg transition-all duration-500 hover:opacity-80"
                      style={{
                        height: `${Math.max(rate, 4)}%`,
                        background:
                          rate >= 100 ? "var(--color-done)" : "var(--c-accent)",
                        opacity: rate === 0 ? 0.25 : 1,
                      }}
                      title={`${rate}%`}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-medium text-muted shrink-0">
                    {date.toLocaleDateString(undefined, { weekday: "narrow" })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top categories — fixed height, internal scroll */}
        <div className="h-[280px]">
          <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">
            Top categories
          </h2>
          <Card className="p-5 h-[calc(100%-28px)] flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="flex flex-col gap-3.5">
                {topCategories.length === 0 ? (
                  <p className="text-sm text-muted">
                    Complete some habits to see category breakdowns.
                  </p>
                ) : (
                  topCategories.map(({ category, rate }) => (
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
                        <span className="font-mono text-muted">{rate}%</span>
                      </div>
                      <ProgressBar
                        value={rate}
                        color={CATEGORY_COLORS[category]}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* By weekday — fixed height, internal scroll */}
        <div className="h-[280px]">
          <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">
            By weekday
          </h2>
          <Card className="p-5 h-[calc(100%-28px)] flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="flex flex-col gap-2.5">
                {byWeekday.map(({ weekday, rate }) => (
                  <div key={weekday} className="flex items-center gap-3">
                    <span className="w-9 shrink-0 font-mono text-xs text-muted">
                      {WEEKDAY_SHORT[weekday]}
                    </span>
                    <div className="flex-1">
                      <ProgressBar value={rate} />
                    </div>
                    <span className="w-9 shrink-0 text-right font-mono text-xs text-muted">
                      {rate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Habit correlations */}
      {correlations.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Link2 className="size-4" /> Habit Correlations
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
    </div>
  );
}
