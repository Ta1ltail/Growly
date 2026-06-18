"use client";

// Tracker — habits as rows, recent days as columns. Tap a cell to cycle.
// Honest Tracking: past days lock (only today + a short grace window are
// editable), so cells outside that window are read-only.

import { useMemo, useState } from "react";
import { Flame, LayoutGrid, Lock, Snowflake } from "lucide-react";
import { StreakFlame } from "@/components/habits/StreakFlame";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import { addDays, dateKey, DEFAULT_GRACE_HOURS } from "@/lib/storage";
import { cycleMark, useAppData } from "@/lib/store";
import { habitStreaks, isScheduled } from "@/lib/stats";
import { frozenSet, isFrozen } from "@/lib/economy";
import { canEditMark, isFutureDay } from "@/lib/policy";
import { MARK_LABEL } from "@/lib/marks";
import { useToday } from "@/hooks/useToday";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";

const RANGES = [
  { value: "14" as const, label: "14 days" },
  { value: "30" as const, label: "30 days" },
];

const CELL: Record<string, string> = {
  done: "bg-done text-white",
  missed: "bg-missed text-white",
  skipped: "bg-skipped text-white",
};

export default function TrackerPage() {
  const data = useAppData();
  const today = useToday();
  const grace = data.settings.graceHours ?? DEFAULT_GRACE_HOURS;
  const [filter, setFilter] = useState<Category | "All">("All");
  const [range, setRange] = useState<"14" | "30">("14");
  const daysShown = Number(range);

  const columns = useMemo(
    () => Array.from({ length: daysShown }, (_, i) => addDays(today, -(daysShown - 1 - i))),
    [today, daysShown],
  );

  const habits = useMemo(
    () =>
      data.habits
        .filter((h) => !h.archived)
        .filter((h) => filter === "All" || h.category === filter),
    [data.habits, filter],
  );

  const frozen = useMemo(() => frozenSet(data.economy), [data.economy]);
  const usedCategories = useMemo(
    () => CATEGORIES.filter((c) => data.habits.some((h) => !h.archived && h.category === c)),
    [data.habits],
  );
  const filterOptions = useMemo(
    () => [{ value: "All" as const, label: "All" }, ...usedCategories.map((c) => ({ value: c, label: c }))],
    [usedCategories],
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title="Tracker" subtitle="Tap a cell to mark · past days lock automatically" />

      {habits.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Nothing to track yet"
          hint="Add habits and they'll show up here as a grid."
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented options={filterOptions} value={filter} onChange={setFilter} />
            <Segmented options={RANGES} value={range} onChange={setRange} />
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center font-mono text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-36 bg-surface px-3 py-3 text-left font-semibold">Habit</th>
                    {columns.map((d) => {
                      const isToday = dateKey(d) === dateKey(today);
                      return (
                        <th key={dateKey(d)} className={`px-1 py-2 font-medium ${isToday ? "text-accent" : "text-faint"}`}>
                          <div className="text-[10px] uppercase">{d.toLocaleDateString(undefined, { weekday: "narrow" })}</div>
                          <div className="text-[11px]">{d.getDate()}</div>
                        </th>
                      );
                    })}
                    <th className="px-2 py-2"><Flame className="mx-auto size-4 text-amber-500" /></th>
                  </tr>
                </thead>
                <tbody>
                  {habits.map((habit) => {
                    const { current } = habitStreaks(habit, data.marks, today, frozen);
                    return (
                      <tr key={habit.id} className="border-t border-line">
                        <td className="sticky left-0 z-10 min-w-36 border-r border-line bg-surface px-3 py-2 text-left">
                          <span className="flex items-center gap-2">
                            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[habit.category] }} />
                            <span className="truncate font-sans text-[13px]">{habit.name}</span>
                          </span>
                        </td>
                        {columns.map((d) => {
                          const key = dateKey(d);
                          const status = data.marks[key]?.[habit.id];
                          const scheduled = isScheduled(habit, d);
                          const editable = canEditMark(key, today, grace);
                          const future = isFutureDay(key, today);
                          const locked = !editable && !future;
                          const cellFrozen = status === "missed" && isFrozen(frozen, habit.id, key);
                          return (
                            <td key={key} className="p-1">
                              <button
                                onClick={() => editable && cycleMark(key, habit.id)}
                                disabled={!editable || (!scheduled && !status)}
                                title={cellFrozen ? "Protected by a streak freeze" : locked ? "Locked — past days can't be changed" : undefined}
                                className={`relative flex size-7 items-center justify-center rounded-md text-[11px] font-bold transition-all ${
                                  editable ? "hover:scale-110 active:scale-90" : "cursor-not-allowed"
                                } ${
                                  status
                                    ? `${CELL[status]} ${locked ? "opacity-70" : ""}`
                                    : scheduled
                                      ? future
                                        ? "border border-dashed border-line bg-transparent text-faint"
                                        : locked
                                          ? "bg-transparent text-faint"
                                          : "bg-empty hover:bg-line"
                                      : "cursor-default bg-transparent"
                                }`}
                              >
                                {status ? MARK_LABEL[status] : locked && scheduled ? <Lock className="size-2.5" /> : ""}
                                {cellFrozen && (
                                  <span
                                    aria-hidden
                                    className="absolute -right-1 -top-1 grid size-3.5 place-items-center rounded-full bg-sky-500 text-white ring-2 ring-surface"
                                  >
                                    <Snowflake className="size-2" strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-2 font-semibold">
                          {current > 0 ? (
                            <StreakFlame streak={current} size={15} className="justify-center" />
                          ) : (
                            <span className="text-faint">0</span>
                          )}
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
            <span className="flex items-center gap-1.5"><Lock className="size-3.5" /> locked (past)</span>
            <span className="flex items-center gap-1.5"><Flame className="size-3.5 text-amber-500" /> current streak</span>
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
