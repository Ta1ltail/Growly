"use client";

// Statistics — meaningful analytics, not just raw numbers: completion,
// streaks, consistency, a trend chart, per-category and per-weekday breakdowns,
// and plain-language insights.

import { useMemo, useState } from "react";
import { Target, CircleCheckBig, Flame, TrendingUp, Activity, ChartColumnIncreasing, Sparkles } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { useAppData } from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { addDays } from "@/lib/storage";
import {
  categoryCompletion,
  completionByWeekday,
  consistencyScore,
  habitStreaks,
  lastNDaysCompletion,
  rangeCompletion,
} from "@/lib/stats";
import { buildInsights } from "@/lib/insights";
import { WEEKDAY_SHORT } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import { TrendLineChart } from "@/components/stats/TrendLineChart";

const PERIODS = [
  { value: "7" as const, label: "Week" },
  { value: "30" as const, label: "Month" },
  { value: "90" as const, label: "90 days" },
];

const TONE: Record<string, string> = {
  good: "border-done/30 bg-done/5 text-done",
  info: "border-accent/30 bg-accent/5 text-accent",
  warn: "border-amber-500/30 bg-amber-500/5 text-amber-500",
};

export default function StatsPage() {
  const data = useAppData();
  const today = useToday();
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const days = Number(period);
  const active = useMemo(() => data.habits.filter((h) => !h.archived), [data.habits]);
  const from = useMemo(() => addDays(today, -(days - 1)), [today, days]);

  const range = useMemo(() => rangeCompletion(active, data.marks, from, today), [active, data.marks, from, today]);
  const chart = useMemo(
    () => lastNDaysCompletion(active, data.marks, today, Math.min(days, 14)),
    [active, data.marks, today, days],
  );
  const byCategory = useMemo(() => categoryCompletion(active, data.marks, from, today), [active, data.marks, from, today]);
  const topCategories = useMemo(() => [...byCategory].sort((a, b) => b.rate - a.rate), [byCategory]);
  const week7 = useMemo(() => lastNDaysCompletion(active, data.marks, today, 7), [active, data.marks, today]);
  const byWeekday = useMemo(() => completionByWeekday(active, data.marks, today, days), [active, data.marks, today, days]);
  const consistency = useMemo(() => consistencyScore(active, data.marks, today, days), [active, data.marks, today, days]);
  const insights = useMemo(() => buildInsights(active, data.marks, today, 4), [active, data.marks, today]);
  const streaks = useMemo(() => {
    let best = 0, current = 0;
    for (const h of active) {
      const s = habitStreaks(h, data.marks, today);
      best = Math.max(best, s.best);
      current = Math.max(current, s.current);
    }
    return { best, current };
  }, [active, data.marks, today]);

  if (active.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Statistics" subtitle="Your progress over time" />
        <EmptyState icon={ChartColumnIncreasing} title="No data yet" hint="Add and mark some habits to unlock your stats." />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Statistics"
        subtitle="Your progress over time"
        action={<Segmented options={PERIODS} value={period} onChange={setPeriod} />}
      />

      <div className="grid grid-cols-2 gap-3 stagger-children sm:grid-cols-5">
        <StatCard icon={Target} value={`${range.rate}%`} label="Completion" accent />
        <StatCard icon={Activity} value={`${consistency}%`} label="Consistency" />
        <StatCard icon={CircleCheckBig} value={range.done} label="Done" />
        <StatCard icon={Flame} value={streaks.best} label="Best streak" />
        <StatCard icon={TrendingUp} value={streaks.current} label="Current streak" />
      </div>

      {insights.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Sparkles className="size-4" /> Insights
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((ins, i) => (
              <div key={i} className={`rounded-2xl border px-4 py-3 text-sm ${TONE[ins.tone]}`}>{ins.text}</div>
            ))}
          </div>
        </div>
      )}

      {/* Equal-height analytics cards (spec §11). Each card is the same height;
          dense lists (Top categories, By weekday) scroll internally. */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {/* Recent trends — interactive line chart */}
        <StatPanel title="Recent trends">
          <TrendLineChart points={chart} height={180} />
        </StatPanel>

        {/* Last 7 days */}
        <StatPanel title="Last 7 days">
          <div className="flex h-full items-end justify-between gap-2">
            {week7.map(({ date, rate }) => (
              <div key={date.toISOString()} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-9 rounded-t-lg transition-[height] duration-500"
                    style={{
                      height: `${Math.max(rate, 4)}%`,
                      background: rate >= 100 ? "var(--color-done)" : "var(--c-accent)",
                      opacity: rate === 0 ? 0.25 : 1,
                    }}
                    title={`${rate}%`}
                  />
                </div>
                <span className="font-mono text-[10px] font-medium text-muted">
                  {date.toLocaleDateString(undefined, { weekday: "narrow" })}
                </span>
              </div>
            ))}
          </div>
        </StatPanel>

        {/* Top categories — scrolls internally */}
        <StatPanel title="Top categories" scroll>
          <div className="flex flex-col gap-3.5">
            {topCategories.map(({ category, rate }) => (
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
          </div>
        </StatPanel>

        {/* By weekday — scrolls internally */}
        <StatPanel title="By weekday" scroll>
          <div className="flex flex-col gap-2.5">
            {byWeekday.map(({ weekday, rate }) => (
              <div key={weekday} className="flex items-center gap-3">
                <span className="w-9 shrink-0 font-mono text-xs text-muted">{WEEKDAY_SHORT[weekday]}</span>
                <div className="flex-1"><ProgressBar value={rate} /></div>
                <span className="w-9 shrink-0 text-right font-mono text-xs text-muted">{rate}%</span>
              </div>
            ))}
          </div>
        </StatPanel>
      </div>
    </div>
  );
}

// Equal-height analytics card: fixed height, header, and a body that either
// fills the card or scrolls internally (keeps every card visually aligned).
function StatPanel({
  title,
  scroll = false,
  children,
}: {
  title: string;
  scroll?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex h-72 flex-col p-5">
      <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className={`min-h-0 flex-1 ${scroll ? "overflow-y-auto pr-1" : ""}`}>{children}</div>
    </Card>
  );
}
