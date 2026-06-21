"use client";

// Tracker — habits as rows, recent days as columns. Tap a cell to cycle.
// Habit lists scroll internally within a fixed container to prevent layout breaking.
// Past days lock (only today + a short grace window are editable).

import { memo, useCallback, useMemo, useState, Fragment } from "react";
import { Flame, LayoutGrid, Lock, Snowflake, ChevronDown, ChevronRight } from "lucide-react";
import { StreakFlame } from "@/components/habits/StreakFlame";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import { addDays, dateKey, DEFAULT_GRACE_HOURS } from "@/lib/storage";
import { cycleMark, useAppData } from "@/lib/store";
import { habitStreaks, isScheduled } from "@/lib/stats";
import { frozenSet, isFrozen } from "@/lib/economy";
import { canEditMark, isFutureDay } from "@/lib/policy";
import { useToday } from "@/hooks/useToday";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import type { MarkStatus } from "@/lib/types";

const RANGES = [
  { value: "14" as const, label: "14 days" },
  { value: "30" as const, label: "30 days" },
];

// Color-coded cell fill — no text labels, just background color states.
// Editable cells get a hover lift; locked cells are muted.
const CELL_STYLES: Record<string, string> = {
  done: "bg-done/90 shadow-sm shadow-done/20",
  missed: "bg-missed/80",
  skipped: "bg-skipped/70",
};

const TrackerCell = memo(function TrackerCell({
  dateKey,
  habitId,
  status,
  scheduled,
  editable,
  future,
  cellFrozen,
  onMark,
}: {
  dateKey: string;
  habitId: string;
  status: MarkStatus | undefined;
  scheduled: boolean;
  editable: boolean;
  future: boolean;
  cellFrozen: boolean;
  onMark: (dateKey: string, habitId: string) => void;
}) {
  const locked = !editable && !future;
  return (
    <td className="p-0.5">
      <button
        onClick={() => editable && onMark(dateKey, habitId)}
        disabled={!editable || (!scheduled && !status)}
        title={
          cellFrozen
            ? "Protected by a streak freeze"
            : locked
              ? "Locked — past days can't be changed"
              : status
                ? `Marked ${status}`
                : "Tap to mark"
        }
        className={`relative flex size-7 items-center justify-center rounded-md transition-all ${
          editable && scheduled && !status
            ? "hover:scale-110 active:scale-90 hover:ring-1 hover:ring-accent/50"
            : "cursor-default"
        } ${
          status
            ? `${CELL_STYLES[status]} ${locked ? "opacity-50" : ""}`
            : scheduled
              ? future
                ? "border border-dashed border-line/50 bg-transparent"
                : locked
                  ? "bg-transparent"
                  : "bg-empty hover:bg-line/60"
              : "bg-transparent"
        }`}
      >
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
});

export default function TrackerPage() {
  const data = useAppData();
  const today = useToday();
  const grace = data.settings.graceHours ?? DEFAULT_GRACE_HOURS;
  const [filter, setFilter] = useState<Category | "All">("All");
  const [range, setRange] = useState<"14" | "30">("14");
  const daysShown = Number(range);

  const columns = useMemo(
    () =>
      Array.from({ length: daysShown }, (_, i) =>
        addDays(today, -(daysShown - 1 - i)),
      ),
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
  const handleCellMark = useCallback((key: string, habitId: string) => {
    cycleMark(key, habitId);
  }, []);

  // Group habits by category for collapsible sections
  const [collapsedCategories, setCollapsedCategories] = useState<
    Set<string>
  >(new Set());
  const toggleCategory = useCallback((cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const groupedHabits = useMemo(() => {
    const map = new Map<string, typeof habits>();
    for (const h of habits) {
      const list = map.get(h.category) ?? [];
      list.push(h);
      map.set(h.category, list);
    }
    return CATEGORIES.filter((c) => map.has(c)).map((c) => ({
      category: c,
      color: CATEGORY_COLORS[c],
      habits: map.get(c)!,
    }));
  }, [habits]);

  const usedCategories = useMemo(
    () =>
      CATEGORIES.filter((c) =>
        data.habits.some((h) => !h.archived && h.category === c),
      ),
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
      <PageHeader
        title="Tracker"
        subtitle="Tap a cell to mark · past days lock automatically"
      />

      {habits.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Nothing to track yet"
          hint="Add habits and they'll show up here as a grid."
          illustration="tracker"
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              options={filterOptions}
              value={filter}
              onChange={setFilter}
            />
            <Segmented options={RANGES} value={range} onChange={setRange} />
          </div>

          {/* Fixed-height container with internal scroll for long habit lists */}
          <div className="h-[calc(100dvh-230px)] min-h-[300px]">
            <Card className="overflow-hidden h-full">
              <div className="h-full overflow-y-auto">
                <div
                  className={
                    daysShown === 30
                      ? "overflow-x-scroll overflow-y-hidden"
                      : "overflow-x-auto"
                  }
                  style={
                    daysShown === 30 ? { paddingBottom: "8px" } : undefined
                  }
                >
                  <table className="w-full border-collapse text-center font-mono text-xs">
                    <thead>
                      <tr>
                        <th className="sticky top-0 z-20 min-w-36 bg-surface px-3 py-3 text-left font-semibold shadow-sm">
                          Habit
                        </th>
                        {columns.map((d) => {
                          const isToday = dateKey(d) === dateKey(today);
                          return (
                            <th
                              key={dateKey(d)}
                              className={`sticky top-0 z-20 bg-surface px-1 py-2 font-medium shadow-sm ${isToday ? "text-accent" : "text-faint"}`}
                            >
                              <div className="text-[10px] uppercase">
                                {d.toLocaleDateString(undefined, {
                                  weekday: "narrow",
                                })}
                              </div>
                              <div className="text-[11px]">{d.getDate()}</div>
                            </th>
                          );
                        })}
                        <th className="sticky top-0 z-20 bg-surface px-2 py-2 shadow-sm">
                          <Flame className="mx-auto size-4 text-amber-500" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedHabits.map((group) => {
                        const isCollapsed = collapsedCategories.has(
                          group.category,
                        );
                        return (
                          <Fragment key={group.category}>
                            {/* Category group header */}
                            <tr
                              className="cursor-pointer select-none border-t border-line/60"
                              onClick={() => toggleCategory(group.category)}
                            >
                              <td
                                colSpan={columns.length + 2}
                                className="sticky left-0 bg-surface2/80 px-3 py-1.5 text-left backdrop-blur-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="size-2 rounded-full shrink-0"
                                    style={{ backgroundColor: group.color }}
                                  />
                                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                                    {group.category}
                                  </span>
                                  <span className="font-mono text-[10px] text-faint">
                                    {group.habits.length}
                                  </span>
                                  <span className="ml-auto text-faint">
                                    {isCollapsed ? (
                                      <ChevronRight className="size-3.5" />
                                    ) : (
                                      <ChevronDown className="size-3.5" />
                                    )}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {!isCollapsed &&
                              group.habits.map((habit) => {
                                const { current } = habitStreaks(
                                  habit,
                                  data.marks,
                                  today,
                                  frozen,
                                );
                                return (
                                  <tr
                                    key={habit.id}
                                    className="border-t border-line transition-colors hover:bg-surface2/30"
                                  >
                                    <td className="sticky left-0 z-10 min-w-36 border-r border-line bg-surface px-3 py-2 text-left">
                                      <span className="flex items-center gap-2 pl-5">
                                        <span
                                          className="size-1.5 shrink-0 rounded-full"
                                          style={{
                                            backgroundColor:
                                              CATEGORY_COLORS[
                                                habit.category
                                              ],
                                          }}
                                        />
                                        <span className="truncate font-sans text-[13px]">
                                          {habit.name}
                                        </span>
                                      </span>
                                    </td>
                                    {columns.map((d) => {
                                      const key = dateKey(d);
                                      const status =
                                        data.marks[key]?.[habit.id];
                                      const scheduled = isScheduled(habit, d);
                                      const editable = canEditMark(
                                        key,
                                        today,
                                        grace,
                                      );
                                      const future = isFutureDay(key, today);
                                      const cellFrozen =
                                        status === "missed" &&
                                        isFrozen(frozen, habit.id, key);
                                      return (
                                        <TrackerCell
                                          key={key}
                                          dateKey={key}
                                          habitId={habit.id}
                                          status={status}
                                          scheduled={scheduled}
                                          editable={editable}
                                          future={future}
                                          cellFrozen={cellFrozen}
                                          onMark={handleCellMark}
                                        />
                                      );
                                    })}
                                    <td className="px-2 font-semibold">
                                      {current > 0 ? (
                                        <StreakFlame
                                          streak={current}
                                          size={15}
                                          className="justify-center"
                                        />
                                      ) : (
                                        <span className="text-faint">0</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <Legend className="bg-done" label="done" />
            <Legend className="bg-missed" label="missed" />
            <Legend className="bg-skipped" label="skipped" />
            <span className="flex items-center gap-1.5">
              <Lock className="size-3.5" /> locked (past)
            </span>
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
