"use client";

// Tracker — habits as rows, recent days as columns. Tap a cell to cycle.
// Desktop: clean table with sticky headers. Mobile: compact card view.

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
} from "react";
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
import { addDays, dateKey } from "@/lib/date";
import { DEFAULT_GRACE_HOURS } from "@/lib/storage";
import { cycleMark, useAppData } from "@/lib/store";
import { habitStreaks, isScheduled } from "@/lib/stats";
import { frozenSet, isFrozen } from "@/lib/economy";
import { canEditMark, isFutureDay } from "@/lib/policy";
import { useToday } from "@/hooks/useToday";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useHydrated } from "@/hooks/useHydrated";
import type { MarkStatus } from "@/lib/types";
import { AppPageShell } from "@/components/layout/AppPageShell";

/* ── Constants ───────────────────────────────────────────── */

const RANGES = [
  { value: "7" as const, label: "7 days" },
  { value: "14" as const, label: "14 days" },
  { value: "30" as const, label: "30 days" },
];

const HEADER_ROW_H_FALLBACK = 44;

const STATUS_STYLES: Record<string, string> = {
  done: "bg-done/85 text-white",
  missed: "bg-missed/75 text-white",
  skipped: "bg-skipped/65 text-white/80",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  done: <Check className="size-3.5" strokeWidth={3} aria-hidden />,
  missed: <X className="size-3.5" strokeWidth={3} aria-hidden />,
  skipped: <Minus className="size-3.5" strokeWidth={3} aria-hidden />,
};

/* ── TrackerCell ──────────────────────────────────────────── */

const TrackerCell = memo(function TrackerCell({
  dateKey: dk,
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
  const hasStatus = !!status;
  const interactive = editable && (scheduled || hasStatus);

  return (
    <td className="p-0.5">
      <button
        type="button"
        onClick={() => editable && onMark(dk, habitId, category)}
        disabled={!interactive}
        title={
          cellFrozen
            ? "Protected by streak freeze"
            : locked && hasStatus
              ? `Locked — ${status}`
              : locked
                ? "Locked — past days can't be changed"
                : hasStatus
                  ? `Marked ${status}`
                  : future
                    ? "Future — scheduled"
                    : "Tap to mark"
        }
        className={`relative flex size-7 items-center justify-center rounded-md transition-all duration-100 ${
          interactive && !hasStatus
            ? "hover:scale-110 hover:ring-1 hover:ring-accent/40 active:scale-90 cursor-pointer"
            : "cursor-default"
        } ${
          hasStatus
            ? `${STATUS_STYLES[status!]} ${locked ? "opacity-40" : ""}`
            : scheduled
              ? future
                ? "border border-dashed border-line/30 bg-transparent"
                : "bg-empty hover:bg-line/50"
              : "bg-transparent"
        }`}
      >
        {hasStatus && STATUS_ICONS[status!]}

        {cellFrozen && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 grid size-3 place-items-center rounded-full bg-sky-500 text-white ring-[2px] ring-surface"
          >
            <Snowflake className="size-1.5" strokeWidth={3} />
          </span>
        )}
      </button>
    </td>
  );
});

/* ── MobileCardView ───────────────────────────────────────── */

function MobileCardView({
  groupedHabits,
  columns,
  marks,
  today,
  grace,
  frozen,
  onMark,
}: {
  groupedHabits: { category: string; color: string; habits: import("@/lib/types").Habit[] }[];
  columns: Date[];
  marks: import("@/lib/types").Marks;
  today: Date;
  grace: number;
  frozen: Set<string>;
  onMark: (dateKey: string, habitId: string, category: string) => void;
}) {
  const todayKey = dateKey(today);

  return (
    <div className="space-y-4 md:hidden">
      {groupedHabits.map((group) => (
        <div key={group.category}>
          {/* Category header */}
          <div className="mb-2 flex items-center gap-2 px-0.5">
            <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {group.category}
            </span>
            <span className="font-mono text-[10px] text-faint">{group.habits.length}</span>
          </div>

          {/* Habit cards */}
          <div className="space-y-2">
            {group.habits.map((habit) => {
              const { current } = habitStreaks(habit, marks, today, frozen);
              return (
                <Card key={habit.id} className="p-3">
                  {/* Habit name */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="flex-1 truncate text-sm font-medium">{habit.name}</span>
                    {current > 0 && <StreakFlame streak={current} size={15} className="shrink-0" />}
                  </div>

                  {/* Day circles */}
                  <div className="flex items-center gap-1">
                    {columns.map((d) => {
                      const dk = dateKey(d);
                      const status = marks[dk]?.[habit.id];
                      const scheduled = isScheduled(habit, d);
                      const editable = canEditMark(dk, today, grace);
                      const future = isFutureDay(dk, today);
                      const cellFrozen = status === "missed" && isFrozen(frozen, habit.id, dk);
                      const isDayToday = dk === todayKey;
                      const show = scheduled || !!status;

                      if (!show) return <div key={dk} className="size-8 shrink-0" />;

                      return (
                        <div key={dk} className="flex flex-col items-center gap-0.5 shrink-0" style={{ width: `${100 / columns.length}%`, maxWidth: 36 }}>
                          <span
                            className={`text-[7px] font-medium uppercase leading-tight ${isDayToday ? "text-accent" : "text-faint/60"}`}
                          >
                            {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                          </span>
                          <button
                            onClick={() => editable && onMark(dk, habit.id, habit.category)}
                            disabled={!editable || (!scheduled && !status)}
                            className={`relative flex size-7 items-center justify-center rounded-full transition-all active:scale-90 ${
                              editable && !status && scheduled
                                ? "hover:ring-2 hover:ring-accent/30 cursor-pointer"
                                : "cursor-default"
                            } ${isDayToday ? "ring-1 ring-accent/25" : ""} ${
                              status
                                ? `${STATUS_STYLES[status]} ${!editable ? "opacity-40" : ""}`
                                : scheduled
                                  ? future
                                    ? "border border-dashed border-line/30 bg-transparent"
                                    : "bg-empty"
                                  : "bg-transparent"
                            }`}
                            title={cellFrozen ? "Protected by streak freeze" : status ? `Marked ${status}` : "Tap to mark"}
                          >
                            {status && STATUS_ICONS[status]}
                            {!status && scheduled && !future && <span className="text-[8px] text-faint">&middot;</span>}
                            {cellFrozen && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-sky-400 ring-1 ring-surface" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────── */

export default function TrackerPage() {
  const data = useAppData();
  const today = useToday();
  const grace = data.settings.graceHours ?? DEFAULT_GRACE_HOURS;
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<Category | "All">("All");
  const [range, setRange] = useState<"7" | "14" | "30">("14");
  const daysShown = Number(range);

  const headerRowRef = useRef<HTMLTableRowElement>(null);
  const [headerRowH, setHeaderRowH] = useState(HEADER_ROW_H_FALLBACK);
  useEffect(() => {
    const el = headerRowRef.current;
    if (!el) return;
    const measure = () => setHeaderRowH(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const handleCellMark = useCallback((key: string, habitId: string, category: string) => {
    cycleMark(key, habitId, category);
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
    () => CATEGORIES.filter((c) => data.habits.some((h) => !h.archived && h.category === c)),
    [data.habits],
  );

  const filterOptions = useMemo(
    () => [
      { value: "All" as const, label: "All" },
      ...usedCategories.map((c) => ({ value: c, label: c })),
    ],
    [usedCategories],
  );

  if (!hydrated) return <PageSkeleton />;

  return (
    <AppPageShell>
      <PageHeader title="Tracker" subtitle="Tap to mark · past days lock automatically" />

      {habits.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="Nothing to track yet" hint="Add habits and they'll show up here." illustration="tracker" />
      ) : (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented options={filterOptions} value={filter} onChange={setFilter} />
            <Segmented options={RANGES} value={range} onChange={setRange} />
          </div>

          {/* Mobile view */}
          <MobileCardView
            groupedHabits={groupedHabits}
            columns={columns}
            marks={data.marks}
            today={today}
            grace={grace}
            frozen={frozen}
            onMark={handleCellMark}
          />

          {/* Desktop view */}
          <div className="hidden md:block">
            <div className="h-[calc(100dvh-16rem)] min-h-[360px] md:h-[calc(100dvh-13rem)]">
              <Card className="h-full overflow-hidden">
                <div className="h-full w-full overflow-auto">
                  <table className="w-full border-collapse text-center font-mono text-xs">
                    <thead>
                      <tr ref={headerRowRef}>
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
                                {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                              </div>
                              <div className="text-[11px]">{d.getDate()}</div>
                            </th>
                          );
                        })}
                        <th className="sticky top-0 z-30 w-12 bg-surface px-2 py-2 shadow-sm">
                          <Flame className="mx-auto size-3.5 text-amber-500/80" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedHabits.map((group) => (
                        <Fragment key={group.category}>
                          {/* Category header */}
                          <tr className="select-none border-t border-line/60">
                            <td
                              className="sticky left-0 z-20 min-w-36 border-r border-line/30 bg-surface2/95 px-3 py-1.5 text-left"
                              style={{ top: headerRowH - 1 }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{group.category}</span>
                                <span className="font-mono text-[10px] text-faint">{group.habits.length}</span>
                              </div>
                            </td>
                            <td colSpan={columns.length + 1} className="sticky z-[15] bg-surface2/95" style={{ top: headerRowH - 1 }} />
                          </tr>

                          {/* Habit rows */}
                          {group.habits.map((habit) => {
                            const { current } = habitStreaks(habit, data.marks, today, frozen);
                            return (
                              <tr key={habit.id} className="border-t border-line transition-colors hover:bg-surface2/30">
                                <td className="sticky left-0 z-10 min-w-36 border-r border-line bg-surface px-3 py-2 text-left">
                                  <span className="flex items-center gap-2 pl-4">
                                    <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[habit.category] }} />
                                    <span className="truncate font-sans text-[13px]">{habit.name}</span>
                                  </span>
                                </td>
                                {columns.map((d) => {
                                  const key = dateKey(d);
                                  const status = data.marks[key]?.[habit.id];
                                  const scheduled = isScheduled(habit, d);
                                  const editable = canEditMark(key, today, grace);
                                  const future = isFutureDay(key, today);
                                  const cellFrozen = status === "missed" && isFrozen(frozen, habit.id, key);
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
                                    <StreakFlame streak={current} size={14} className="justify-center" />
                                  ) : (
                                    <span className="font-mono text-[11px] text-faint">&mdash;</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-done" />
                done
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-missed" />
                missed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-skipped" />
                skipped
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-3" />
                locked
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Snowflake className="size-3 text-sky-400" />
                freeze
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Flame className="size-3 text-amber-500" />
                streak
              </span>
            </div>
          </div>
        </>
      )}
    </AppPageShell>
  );
}
