"use client";

// The Tracker grid — habits as rows, the last 14 days as columns.
// Tap a cell to cycle its mark. Sticky habit-name column + header row.

import { useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import { addDays, dateKey } from "@/lib/storage";
import { cycleMark, useAppData } from "@/lib/store";
import { habitStreaks, isScheduled } from "@/lib/stats";
import { MARK_LABEL } from "@/lib/marks";

const DAYS_SHOWN = 14;

const CELL_BG = {
  done: "bg-done text-white",
  missed: "bg-missed text-white",
  skipped: "bg-skipped text-white",
} as const;

export default function TrackerPage() {
  const data = useAppData();
  const [filter, setFilter] = useState<Category | "All">("All");

  const today = useMemo(() => new Date(), []);

  // Columns: oldest -> today.
  const columns = useMemo(
    () =>
      Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, -(DAYS_SHOWN - 1 - i))),
    [today],
  );

  const habits = useMemo(
    () => (filter === "All" ? data.habits : data.habits.filter((h) => h.category === filter)),
    [data.habits, filter],
  );

  const usedCategories = useMemo(
    () => CATEGORIES.filter((c) => data.habits.some((h) => h.category === c)),
    [data.habits],
  );

  return (
    <>
      <header className="pt-6 pb-4">
        <h1 className="font-mono text-lg font-semibold tracking-tight">Tracker</h1>
        <p className="text-sm text-muted">Last {DAYS_SHOWN} days · tap a cell to mark</p>
      </header>

      {/* Category filter */}
      {usedCategories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {(["All", ...usedCategories] as (Category | "All")[]).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === c
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-surface text-muted hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {data.habits.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
          No habits yet. Add some on the Today page.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse text-center font-mono text-xs">
            <thead>
              <tr className="bg-surface">
                <th className="sticky left-0 z-10 min-w-32 bg-surface px-2 py-2 text-left font-semibold">
                  Habit
                </th>
                {columns.map((d) => (
                  <th key={dateKey(d)} className="px-1 py-2 font-medium text-muted">
                    <div>{d.toLocaleDateString(undefined, { weekday: "narrow" })}</div>
                    <div>{d.getDate()}</div>
                  </th>
                ))}
                <th className="px-2 py-2 font-semibold">🔥</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => {
                const { current } = habitStreaks(habit, data.marks, today);
                return (
                  <tr key={habit.id} className="border-t border-line">
                    <td className="sticky left-0 z-10 min-w-32 border-r border-line bg-surface px-2 py-1.5 text-left">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: CATEGORY_COLORS[habit.category] }}
                        />
                        <span className="truncate font-sans">{habit.name}</span>
                      </span>
                    </td>
                    {columns.map((d) => {
                      const key = dateKey(d);
                      const status = data.marks[key]?.[habit.id];
                      const scheduled = isScheduled(habit, d);
                      return (
                        <td key={key} className="p-0.5">
                          <button
                            onClick={() => cycleMark(key, habit.id)}
                            disabled={!scheduled && !status}
                            className={`flex size-7 items-center justify-center rounded-sm transition-colors ${
                              status
                                ? CELL_BG[status]
                                : scheduled
                                  ? "bg-empty hover:bg-line"
                                  : "bg-transparent"
                            }`}
                          >
                            {status ? MARK_LABEL[status] : ""}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 font-semibold">{current}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          <span className="mr-1 inline-block size-2.5 rounded-sm bg-done align-middle" />
          done
        </span>
        <span>
          <span className="mr-1 inline-block size-2.5 rounded-sm bg-missed align-middle" />
          missed
        </span>
        <span>
          <span className="mr-1 inline-block size-2.5 rounded-sm bg-skipped align-middle" />
          skipped
        </span>
        <span>🔥 current streak</span>
      </p>
    </>
  );
}
