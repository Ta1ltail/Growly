"use client";

// Statistics — completion rate, streaks, per-category bars, and a 7-day chart.
// Charts are plain CSS bars (no extra dependency) to keep the app lightweight.

import { useMemo } from "react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { addDays } from "@/lib/storage";
import { useAppData } from "@/lib/store";
import {
  categoryCompletion,
  habitStreaks,
  lastNDaysCompletion,
  rangeCompletion,
} from "@/lib/stats";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <div className="font-mono text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export default function StatsPage() {
  const data = useAppData();
  const today = useMemo(() => new Date(), []);

  const monthStart = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );

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
    let best = 0;
    let current = 0;
    for (const h of data.habits) {
      const s = habitStreaks(h, data.marks, today);
      best = Math.max(best, s.best);
      current = Math.max(current, s.current);
    }
    return { best, current };
  }, [data.habits, data.marks, today]);

  if (data.habits.length === 0) {
    return (
      <>
        <header className="pt-6 pb-4">
          <h1 className="font-mono text-lg font-semibold tracking-tight">Statistics</h1>
        </header>
        <div className="rounded-md border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
          Add some habits to see your stats here.
        </div>
      </>
    );
  }

  return (
    <>
      <header className="pt-6 pb-4">
        <h1 className="font-mono text-lg font-semibold tracking-tight">Statistics</h1>
        <p className="text-sm text-muted">This month so far</p>
      </header>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Completion" value={`${month.rate}%`} />
        <Stat label="Done this month" value={`${month.done}`} />
        <Stat label="Best streak" value={`${streaks.best}`} />
        <Stat label="Current streak" value={`${streaks.current}`} />
      </div>

      {/* 7-day chart */}
      <section className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Last 7 days
        </h2>
        <div className="flex items-end justify-between gap-2 rounded-md border border-line bg-surface p-4">
          {week.map(({ date, rate }) => (
            <div key={date.toISOString()} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-28 w-full items-end">
                <div
                  className="w-full rounded-t bg-accent transition-all"
                  style={{ height: `${Math.max(rate, 3)}%` }}
                  title={`${rate}%`}
                />
              </div>
              <span className="font-mono text-[10px] text-muted">{rate}%</span>
              <span className="font-mono text-[10px] text-muted">
                {date.toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Per-category */}
      <section className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          By category
        </h2>
        <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
          {byCategory.map(({ category, rate }) => (
            <div key={category}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-sm"
                    style={{ backgroundColor: CATEGORY_COLORS[category] }}
                  />
                  {category}
                </span>
                <span className="font-mono text-muted">{rate}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-empty">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${rate}%`, backgroundColor: CATEGORY_COLORS[category] }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-4 text-center font-mono text-[10px] text-muted">
        Tracking since {addDays(monthStart, 0).toLocaleDateString()}
      </p>
    </>
  );
}
