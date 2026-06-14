"use client";

// Statistics — completion, streaks, a 7-day chart, and per-category bars.

import { useMemo } from "react";
import { Target, CircleCheckBig, Flame, TrendingUp, ChartColumnIncreasing } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { useAppData } from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import {
  categoryCompletion,
  habitStreaks,
  lastNDaysCompletion,
  rangeCompletion,
} from "@/lib/stats";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";

export default function StatsPage() {
  const data = useAppData();
  const today = useToday();
  const monthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);

  const month = useMemo(
    () => rangeCompletion(data.habits, data.marks, monthStart, today),
    [data.habits, data.marks, monthStart, today],
  );
  const week = useMemo(
    () => lastNDaysCompletion(data.habits, data.marks, today, 7),
    [data.habits, data.marks, today],
  );
  const byCategory = useMemo(
    () => categoryCompletion(data.habits, data.marks, monthStart, today),
    [data.habits, data.marks, monthStart, today],
  );
  const streaks = useMemo(() => {
    let best = 0, current = 0;
    for (const h of data.habits) {
      const s = habitStreaks(h, data.marks, today);
      best = Math.max(best, s.best);
      current = Math.max(current, s.current);
    }
    return { best, current };
  }, [data.habits, data.marks, today]);

  if (data.habits.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Statistics" subtitle="This month so far" />
        <EmptyState icon={ChartColumnIncreasing} title="No data yet" hint="Add and mark some habits to unlock your stats." />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Statistics" subtitle="This month so far" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Target} value={`${month.rate}%`} label="Completion" accent />
        <StatCard icon={CircleCheckBig} value={month.done} label="Done this month" />
        <StatCard icon={Flame} value={streaks.best} label="Best streak" />
        <StatCard icon={TrendingUp} value={streaks.current} label="Current streak" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* 7-day chart */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Last 7 days</h2>
          <Card className="p-5">
            <div className="flex items-end justify-between gap-2 sm:gap-3">
              {week.map(({ date, rate }) => (
                <div key={date.toISOString()} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end justify-center">
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
                  <span className="font-mono text-[10px] text-faint">{rate}%</span>
                  <span className="font-mono text-[11px] font-medium text-muted">
                    {date.toLocaleDateString(undefined, { weekday: "narrow" })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Per-category */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">By category</h2>
          <Card className="flex flex-col gap-3.5 p-5">
            {byCategory.map(({ category, rate }) => (
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
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
