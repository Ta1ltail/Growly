"use client";

// Tracker — habits as rows, recent days as columns. Tap a cell to cycle.
// Desktop: elegant table with glass sticky headers, grouped categories with
//   colored accent bars, and refined mark cells.
// Mobile: compact card view with inline day circles for quick marking.

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
  Sparkles,
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

/* ── Status cell colors ───────────────────────────────────── */

const STATUS_BG: Record<string, string> = {
  done: "bg-done/90",
  missed: "bg-missed/80",
  skipped: "bg-skipped/70",
};

const STATUS_SHADOW: Record<string, string> = {
  done: "shadow-done/25",
  missed: "shadow-missed/20",
  skipped: "shadow-skipped/15",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  done: (
    <Check
      className="size-3.5 animate-pop text-white"
      strokeWidth={3}
      aria-hidden
    />
  ),
  missed: (
    <X
      className="size-3.5 animate-pop text-white"
      strokeWidth={3}
      aria-hidden
    />
  ),
  skipped: (
    <Minus
      className="size-3.5 animate-pop text-white/80"
      strokeWidth={3}
      aria-hidden
    />
  ),
};

/* ── Single mark cell ─────────────────────────────────────── */

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

  // Decide cell shape & size
  const cellSize = 30;

  return (
    <td className="p-0.5">
      <button
        type="button"
        onClick={() => editable && onMark(dk, habitId, category)}
        disabled={!interactive}
        title={
          cellFrozen
            ? `Protected by a streak freeze — marked ${status}`
            : locked && hasStatus
              ? `${status} — locked (past)`
              : locked
                ? "Locked — past days can't be changed"
                : hasStatus
                  ? `Marked ${status}`
                  : future
                    ? "Future — scheduled"
                    : "Tap to mark"
        }
        style={{ width: cellSize, height: cellSize }}
        className={`relative flex items-center justify-center rounded-lg transition-all duration-150 ${
          interactive && !hasStatus
            ? "hover:scale-110 hover:ring-2 hover:ring-accent/40 active:scale-90 cursor-pointer"
            : "cursor-default"
        } ${
          hasStatus
            ? `${STATUS_BG[status!]} ${STATUS_SHADOW[status!]} shadow-sm ${locked ? "opacity-40" : ""}`
            : scheduled
              ? future
                ? "border border-dashed border-line/30 bg-transparent"
                : locked
                  ? "bg-transparent"
                  : "bg-empty hover:bg-line/50"
              : "bg-transparent"
        }`}
      >
        {hasStatus && STATUS_ICONS[status!]}

        {/* Show day number on scheduled-but-empty past cells */}
        {!hasStatus && scheduled && !future && !locked && (
          <span className="text-[9px] font-medium text-faint">
            {dk.endsWith("-01") || dk.endsWith("-15") ? parseInt(dk.slice(-2)) : ""}
          </span>
        )}

        {/* Streak freeze badge */}
        {cellFrozen && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 grid size-3.5 place-items-center rounded-full bg-sky-500 text-white ring-[2px] ring-surface"
          >
            <Snowflake className="size-2" strokeWidth={3} />
          </span>
        )}
      </button>
    </td>
  );
});

/* ── Mobile Card View ───────────────────────────────────────── */

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
    <div className="space-y-5 md:hidden">
      {groupedHabits.map((group) => (
        <div key={group.category} className="animate-rise">
          {/* Category header */}
          <div className="mb-2.5 flex items-center gap-2.5 px-0.5">
            <div
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: group.color }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {group.category}
            </span>
            <span className="font-mono text-[10px] text-faint/70">
              {group.habits.length} habit{group.habits.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Habit cards */}
          <div className="space-y-2.5">
            {group.habits.map((habit, hi) => {
              const { current } = habitStreaks(habit, marks, today, frozen);
              return (
                <div
                  className="animate-rise"
                  style={{ animationDelay: `${hi * 0.04}s` }}
                >
                <Card
                  key={habit.id}
                  className="relative overflow-hidden p-3"
                >
                  {/* Category color accent bar */}
                  <div
                    className="absolute left-0 top-0 h-full w-[3px]"
                    style={{ backgroundColor: group.color }}
                  />

                  {/* Habit name row */}
                  <div className="mb-3 flex items-center gap-2.5 pl-1.5">
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="flex-1 truncate text-sm font-medium leading-tight">
                      {habit.name}
                    </span>
                    {current > 0 && (
                      <StreakFlame
                        streak={current}
                        size={15}
                        className="shrink-0"
                      />
                    )}
                  </div>

                  {/* Day circles grid */}
                  <div className="flex items-center justify-between gap-0.5 pl-1.5">
                    {columns.map((d) => {
                      const dk = dateKey(d);
                      const status = marks[dk]?.[habit.id];
                      const scheduled = isScheduled(habit, d);
                      const editable = canEditMark(dk, today, grace);
                      const future = isFutureDay(dk, today);
                      const cellFrozen = status === "missed" && isFrozen(frozen, habit.id, dk);
                      const isDayToday = dk === todayKey;
                      const hasStatus = !!status;
                      const show = scheduled || hasStatus;

                      return (
                        <div
                          key={dk}
                          className="flex flex-col items-center gap-0.5"
                          style={{
                            opacity: show ? 1 : 0.2,
                            flex: "1 1 0%",
                            minWidth: 0,
                          }}
                        >
                          {/* Day label */}
                          <span
                            className={`text-[7px] font-medium uppercase leading-tight ${
                              isDayToday ? "text-accent" : "text-faint/60"
                            }`}
                          >
                            {d.toLocaleDateString(undefined, {
                              weekday: "narrow",
                            })}
                          </span>

                          {/* Mark circle */}
                          <button
                            onClick={() =>
                              editable && onMark(dk, habit.id, habit.category)
                            }
                            disabled={!editable || (!scheduled && !status)}
                            className={`relative flex size-[26px] shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-90 ${
                              editable && !status && scheduled
                                ? "hover:scale-110 hover:ring-2 hover:ring-accent/30 cursor-pointer"
                                : "cursor-default"
                            } ${
                              isDayToday
                                ? "ring-1 ring-accent/30"
                                : ""
                            } ${
                              status
                                ? `${STATUS_BG[status]} shadow-sm ${STATUS_SHADOW[status]} ${!editable ? "opacity-40" : ""}`
                                : scheduled
                                  ? future
                                    ? "border border-dashed border-line/25 bg-transparent"
                                    : "bg-empty"
                                  : "bg-transparent"
                            }`}
                            title={
                              cellFrozen
                                ? "Protected by streak freeze"
                                : status
                                  ? `Marked ${status}`
                                  : "Tap to mark"
                            }
                          >
                            {status && STATUS_ICONS[status]}
                            {!status && scheduled && !future && (
                              <span className="text-[8px] font-medium text-faint">
                                &middot;
                              </span>
                            )}
                            {cellFrozen && (
                              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-sky-400 ring-1 ring-surface" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Legend ──────────────────────────────────────────────────── */

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
      <span className={`inline-block size-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */

export default function TrackerPage() {
  const data = useAppData();
  const today = useToday();
  const grace = data.settings.graceHours ?? DEFAULT_GRACE_HOURS;
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<Category | "All">("All");
  const [range, setRange] = useState<"7" | "14" | "30">("14");
  const daysShown = Number(range);

  // Desktop table header measurement
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

  if (!hydrated) return <PageSkeleton />;

  return (
    <AppPageShell>
      <PageHeader
        title="Tracker"
        subtitle="Tap to mark · past days lock automatically"
      />

      {habits.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Nothing to track yet"
          hint="Add habits and they'll show up here."
          illustration="tracker"
        />
      ) : (
        <>
          {/* ── Filters ── */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              options={filterOptions}
              value={filter}
              onChange={setFilter}
            />
            <Segmented options={RANGES} value={range} onChange={setRange} />
          </div>

          {/* ══ Mobile View (hidden on md+) ══ */}
          <MobileCardView
            groupedHabits={groupedHabits}
            columns={columns}
            marks={data.marks}
            today={today}
            grace={grace}
            frozen={frozen}
            onMark={handleCellMark}
          />

          {/* ══ Desktop View (hidden on md-) ══ */}
          <div className="hidden md:block">
            <div className="h-[calc(100dvh-16rem)] min-h-[360px] md:h-[calc(100dvh-13rem)]">
              <Card className="h-full overflow-hidden border border-line/50 shadow-md">
                <div className="h-full w-full overflow-auto">
                  <table className="w-full border-collapse text-center font-mono text-xs">
                    <thead>
                      <tr ref={headerRowRef}>
                        <th className="sticky left-0 top-0 z-40 min-w-40 border-r border-line/50 bg-surface/90 px-4 py-3 text-left text-sm font-semibold text-ink backdrop-blur-md shadow-[2px_0_8px_-4px_hsl(var(--c-shadow)/0.12)]">
                          <div className="flex items-center gap-2.5">
                            <LayoutGrid className="size-3.5 text-accent" />
                            <span>Habit</span>
                          </div>
                        </th>
                        {columns.map((d) => {
                          const isToday = dateKey(d) === dateKey(today);
                          return (
                            <th
                              key={dateKey(d)}
                              className={`sticky top-0 z-30 px-1.5 py-2.5 font-medium backdrop-blur-md shadow-sm ${
                                isToday
                                  ? "bg-accent/8 text-accent"
                                  : "bg-surface/90 text-faint"
                              }`}
                            >
                              <div className="text-[10px] uppercase tracking-wider">
                                {d.toLocaleDateString(undefined, {
                                  weekday: "narrow",
                                })}
                              </div>
                              <div className="mt-0.5 text-[12px] font-semibold tabular-nums">
                                {d.getDate()}
                              </div>
                              {isToday && (
                                <div className="mx-auto mt-1 h-1 w-5 rounded-full bg-accent" />
                              )}
                            </th>
                          );
                        })}
                        <th className="sticky top-0 z-30 w-14 bg-surface/90 px-2 py-2.5 backdrop-blur-md shadow-sm">
                          <Flame className="mx-auto size-4 text-amber-500/80" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedHabits.map((group) => (
                        <Fragment key={group.category}>
                          {/* Category group header */}
                          <tr className="select-none">
                            <td
                              className="sticky left-0 z-20 min-w-40 border-r border-line/30 px-4 py-2 text-left backdrop-blur-sm"
                              style={{
                                top: headerRowH - 1,
                                background: `color-mix(in srgb, ${group.color} 6%, var(--c-surface2))`,
                              }}
                            >
                              <div className="flex items-center gap-2.5">
                                {/* Colored accent bar */}
                                <div
                                  className="h-3.5 w-1 rounded-full"
                                  style={{ backgroundColor: group.color }}
                                />
                                <span
                                  className="text-[11px] font-semibold uppercase tracking-wider"
                                  style={{ color: group.color }}
                                >
                                  {group.category}
                                </span>
                                <span className="font-mono text-[10px] text-faint">
                                  {group.habits.length}
                                </span>
                              </div>
                            </td>
                            <td
                              colSpan={columns.length + 1}
                              className="sticky z-[15] backdrop-blur-sm"
                              style={{
                                top: headerRowH - 1,
                                background: `color-mix(in srgb, ${group.color} 4%, var(--c-surface2))`,
                              }}
                            />
                          </tr>

                          {/* Habit rows */}
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
                                className="border-t border-line/30 transition-colors duration-150 hover:bg-surface2/40"
                              >
                                {/* Habit name (sticky column) */}
                                <td
                                  className="sticky left-0 z-10 min-w-40 border-r border-line/30 bg-surface px-4 py-2.5 text-left shadow-[2px_0_8px_-4px_hsl(var(--c-shadow)/0.08)]"
                                >
                                  <span className="flex items-center gap-2.5 pl-0.5">
                                    <span
                                      className="size-2 shrink-0 rounded-full"
                                      style={{
                                        backgroundColor:
                                          CATEGORY_COLORS[habit.category],
                                      }}
                                    />
                                    <span className="truncate font-sans text-[13px] font-medium leading-tight text-ink">
                                      {habit.name}
                                    </span>
                                  </span>
                                </td>

                                {/* Day cells */}
                                {columns.map((d) => {
                                  const key = dateKey(d);
                                  const status = data.marks[key]?.[habit.id];
                                  const scheduled = isScheduled(habit, d);
                                  const editable = canEditMark(key, today, grace);
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

                                {/* Streak flame column */}
                                <td className="px-2 font-semibold">
                                  {current > 0 ? (
                                    <StreakFlame
                                      streak={current}
                                      size={15}
                                      showCount
                                      className="justify-center"
                                    />
                                  ) : (
                                    <span className="font-mono text-[11px] text-faint">
                                      &mdash;
                                    </span>
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

            {/* ── Legend ── */}
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-line/30 bg-surface/60 px-4 py-3 text-xs text-muted backdrop-blur-sm">
              <div className="flex items-center gap-1.5 font-medium text-faint/80">
                <Sparkles className="size-3" />
                <span>Legend</span>
              </div>
              <Legend className="bg-done shadow-sm shadow-done/20" label="done" />
              <Legend className="bg-missed shadow-sm shadow-missed/15" label="missed" />
              <Legend className="bg-skipped shadow-sm shadow-skipped/10" label="skipped" />
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
                <Lock className="size-3" />
                <span>locked (past)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
                <Snowflake className="size-3 text-sky-400" />
                <span>streak freeze</span>
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
                <Flame className="size-3 text-amber-500" />
                <span>current streak</span>
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
                <span className="inline-block size-2.5 rounded-full border border-dashed border-line/50" />
                <span>future</span>
              </span>
            </div>
          </div>
        </>
      )}
    </AppPageShell>
  );
}
