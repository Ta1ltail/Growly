"use client";
// Tracker — habits as rows, recent days as columns. Tap a cell to cycle.
// Habit lists scroll internally within a fixed container to prevent layout breaking.
// Past days lock (only today + a short grace window are editable).
import { memo, useCallback, useMemo, useState, Fragment } from "react";
import {
  Flame,
  LayoutGrid,
  Lock,
  Snowflake,
  Check,
  X,
  Minus,
} from "lucide-react";
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
import { AppPageShell } from "@/components/layout/AppPageShell";

const RANGES = [
  { value: "14" as const, label: "14 days" },
  { value: "30" as const, label: "30 days" },
];

// Row metrics — used to compute the sticky offset for category header rows
// so they dock directly beneath the column header row instead of behind it.
const HEADER_ROW_H = 44; // px, matches th py-3 + content height

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
  category,
  status,
  scheduled,
  editable,
  future,
  cellFrozen,
  onMark,
}: {
  dateKey: string;
  habitId: string;
  category: string;
  status: MarkStatus | undefined;
  scheduled: boolean;
  editable: boolean;
  future: boolean;
  cellFrozen: boolean;
  onMark: (dateKey: string, habitId: string, category: string) => void;
}) {
  const locked = !editable && !future;
  return (
    <td className="p-0.5">
      <button
        onClick={() => editable && onMark(dateKey, habitId, category)}
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
        {/* Status glyph for instant readability (✔ done · ✖ missed · – skipped) */}
        {status === "done" && (
          <Check className="size-4 text-white" strokeWidth={3} aria-hidden />
        )}
        {status === "missed" && (
          <X className="size-4 text-white" strokeWidth={3} aria-hidden />
        )}
        {status === "skipped" && (
          <Minus className="size-4 text-white/80" strokeWidth={3} aria-hidden />
        )}
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

  const handleCellMark = useCallback(
    (key: string, habitId: string, category: string) => {
      cycleMark(key, habitId, category);
    },
    [],
  );

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
    <AppPageShell>
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
            {/* Fixed-height container. A SINGLE overflow-auto element handles both
              axes so sticky-top (header) and sticky-left (habit column) resolve
              against the same scrolling ancestor, and the horizontal scrollbar
              lives at the bottom of this box — always reachable, independent of
              vertical scroll position. */}
            <div className="h-[calc(100dvh-18rem)] min-h-[300px] md:h-[calc(100dvh-15rem)]">
              <Card className="overflow-hidden h-full">
                <div className="h-full w-full overflow-auto">
                  <table className="w-full border-collapse text-center font-mono text-xs">
                    <thead>
                      <tr>
                        <th className="sticky left-0 top-0 z-40 min-w-36 border-r border-line bg-surface px-3 py-3 text-left font-semibold shadow-sm">
                          Habit
                        </th>
                        {columns.map((d) => {
                          const isToday = dateKey(d) === dateKey(today);
                          return (
                            <th
                              key={dateKey(d)}
                              className={`sticky top-0 z-30 bg-surface px-1 py-2 font-medium shadow-sm ${isToday ? "text-accent" : "text-faint"}`}
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
                        <th className="sticky top-0 z-30 bg-surface px-2 py-2 shadow-sm">
                          <Flame className="mx-auto size-4 text-amber-500" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedHabits.map((group) => {
                        return (
                          <Fragment key={group.category}>
                            {/* Category group header. A colSpan cell can't stick
                              correctly on both axes at once — its content sits
                              wherever the cell was laid out, not anchored to the
                              viewport, so the label would scroll off-screen while
                              the (invisible) cell background stayed pinned. Instead
                              we use TWO cells: a sticky-left label cell (mirrors the
                              Habit column) and a plain cell that spans the day
                              columns, just carrying the matching background so the
                              band looks continuous as you scroll right. Both cells
                              also stick to `top: HEADER_ROW_H` so the whole band
                              docks under the header while scrolling down. */}
                            <tr className="select-none border-t border-line/60">
                              <td
                                className="sticky left-0 z-20 min-w-36 bg-surface2/95 px-3 py-1.5 text-left backdrop-blur-sm"
                                style={{ top: HEADER_ROW_H }}
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
                                </div>
                              </td>
                              <td
                                colSpan={columns.length + 1}
                                className="sticky z-[15] bg-surface2/95 backdrop-blur-sm"
                                style={{ top: HEADER_ROW_H }}
                              />
                            </tr>
                            {group.habits.map((habit) => {
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
                                            CATEGORY_COLORS[habit.category],
                                        }}
                                      />
                                      <span className="truncate font-sans text-[13px]">
                                        {habit.name}
                                      </span>
                                    </span>
                                  </td>
                                  {columns.map((d) => {
                                    const key = dateKey(d);
                                    const status = data.marks[key]?.[habit.id];
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
                                        category={habit.category}
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
    </AppPageShell>
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
