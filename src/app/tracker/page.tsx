"use client";

// Tracker — habits as rows, last 21 days as columns. Tap a cell to cycle.
// Sticky habit-name column + header row, streak column, category filter.

import { useMemo, useState } from "react";
import { Flame, LayoutGrid } from "lucide-react";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import { addDays, dateKey } from "@/lib/storage";
import { cycleMark, useAppData } from "@/lib/store";
import { habitStreaks, isScheduled } from "@/lib/stats";
import { useToday } from "@/hooks/useToday";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import { MARK_LABEL } from "@/lib/marks";

const DAYS_SHOWN = 21;

const CELL: Record<string, string> = {
  done: "bg-done text-white",
  missed: "bg-missed text-white",
  skipped: "bg-skipped text-white",
};

export default function TrackerPage() {
  const data = useAppData();
  const today = useToday();
  const [filter, setFilter] = useState<Category | "All">("All");

  const columns = useMemo(
    () => Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, -(DAYS_SHOWN - 1 - i))),
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

  const filterOptions = useMemo(
    () => [
      { value: "All" as const, label: "All" },
      ...usedCategories.map((c) => ({ value: c, label: c })),
    ],
    [usedCategories],
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title="Tracker" subtitle={`Last ${DAYS_SHOWN} days · tap any cell to mark`} />

      {data.habits.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Nothing to track yet"
          hint="Add habits on the Today page and they'll show up here as a grid."
        />
      ) : (
        <>
          <div className="mb-4">
            <Segmented options={filterOptions} value={filter} onChange={setFilter} />
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center font-mono text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-36 bg-surface px-3 py-3 text-left font-semibold">
                      Habit
                    </th>
                    {columns.map((d) => {
                      const isToday = dateKey(d) === dateKey(today);
                      return (
                        <th
                          key={dateKey(d)}
                          className={`px-1 py-2 font-medium ${isToday ? "text-accent" : "text-faint"}`}
                        >
                          <div className="text-[10px] uppercase">
                            {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                          </div>
                          <div className="text-[11px]">{d.getDate()}</div>
                        </th>
                      );
                    })}
                    <th className="px-2 py-2">
                      <Flame className="mx-auto size-4 text-amber-500" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {habits.map((habit) => {
                    const { current } = habitStreaks(habit, data.marks, today);
                    return (
                      <tr key={habit.id} className="border-t border-line">
                        <td className="sticky left-0 z-10 min-w-36 border-r border-line bg-surface px-3 py-2 text-left">
                          <span className="flex items-center gap-2">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: CATEGORY_COLORS[habit.category] }}
                            />
                            <span className="truncate font-sans text-[13px]">{habit.name}</span>
                          </span>
                        </td>
                        {columns.map((d) => {
                          const key = dateKey(d);
                          const status = data.marks[key]?.[habit.id];
                          const scheduled = isScheduled(habit, d);
                          return (
                            <td key={key} className="p-1">
                              <button
                                onClick={() => cycleMark(key, habit.id)}
                                disabled={!scheduled && !status}
                                className={`flex size-7 items-center justify-center rounded-md text-[11px] font-bold transition-all hover:scale-110 active:scale-90 ${
                                  status
                                    ? CELL[status]
                                    : scheduled
                                      ? "bg-empty hover:bg-line"
                                      : "cursor-default bg-transparent"
                                }`}
                              >
                                {status ? MARK_LABEL[status] : ""}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-2 font-semibold">
                          {current > 0 ? current : <span className="text-faint">0</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <Legend className="bg-done" label="done" />
            <Legend className="bg-missed" label="missed" />
            <Legend className="bg-skipped" label="skipped" />
            <span className="flex items-center gap-1.5">
              <Flame className="size-3.5 text-amber-500" /> current streak
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block size-3 rounded ${className}`} />
      {label}
    </span>
  );
}
