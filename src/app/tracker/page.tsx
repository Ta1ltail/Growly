"use client";

// Tracker — single scrollable table for all screen sizes.
// Always shows the last 30 days. Every day has a visible cell
// (empty placeholder if no record). Auto-scrolls to the far
// right (most recent day) on mount.

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
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useHydrated } from "@/hooks/useHydrated";
import type { MarkStatus } from "@/lib/types";
import { AppPageShell } from "@/components/layout/AppPageShell";

const DAYS = 30;

const STATUS_BG: Record<string, string> = {
  done: "bg-done/85 text-white",
  missed: "bg-missed/75 text-white",
  skipped: "bg-skipped/65 text-white/80",
};

const MARK_ICON: Record<string, React.ReactNode> = {
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
                ? "Locked"
                : hasStatus
                  ? `Marked ${status}`
                  : future
                    ? "Scheduled"
                    : scheduled
                      ? "Tap to mark"
                      : ""
        }
        className={`relative flex size-7 items-center justify-center rounded-md transition-all ${
          interactive && !hasStatus
            ? "hover:scale-110 hover:ring-1 hover:ring-accent/40 active:scale-90 cursor-pointer"
            : "cursor-default"
        } ${
          hasStatus
            ? `${STATUS_BG[status!]} ${locked ? "opacity-40" : ""}`
            : scheduled
              ? future
                ? "border border-dashed border-line/30 bg-transparent"
                : "bg-empty hover:bg-line/50"
              : "border border-line/10 bg-transparent"
        }`}
      >
        {hasStatus && MARK_ICON[status!]}
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

/* ── Legend ────────────────────────────────────────────────── */

function LegendDot({ className }: { className: string }) {
  return <span className={`inline-block size-2.5 rounded-full ${className}`} />;
}

/* ── Main Page ────────────────────────────────────────────── */

export default function TrackerPage() {
  const data = useAppData();
  const today = useToday();
  const grace = data.settings.graceHours ?? DEFAULT_GRACE_HOURS;
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<Category | "All">("All");

  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRowRef = useRef<HTMLTableRowElement>(null);
  const [headerRowH, setHeaderRowH] = useState(44);

  // Measure header row height for category sticky positioning
  useEffect(() => {
    const el = headerRowRef.current;
    if (!el) return;
    const measure = () => setHeaderRowH(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Always 30 days
  const columns = useMemo(
    () => Array.from({ length: DAYS }, (_, i) => addDays(today, -(DAYS - 1 - i))),
    [today],
  );

  // Auto-scroll to the far right (most recent day) on mount and when data changes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth;
    });
    return () => cancelAnimationFrame(raf);
  }, [columns, data.marks, data.habits]);

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

      {habits.length > 0 && (
        <div className="mb-4">
          <Segmented options={filterOptions} value={filter} onChange={setFilter} />
        </div>
      )}

      {/* Single scrollable table — always rendered, even with no habits */}
      <div className="h-[calc(100dvh-16rem)] min-h-[360px] md:h-[calc(100dvh-13rem)]">
        <Card className="h-full overflow-hidden">
          <div ref={scrollRef} className="h-full w-full overflow-auto">
            <table className="border-collapse text-center font-mono text-xs">
              <thead>
                <tr ref={headerRowRef}>
                  <th className="sticky left-0 top-0 z-30 min-w-32 border-r border-line bg-surface px-2.5 py-2.5 text-left text-sm font-semibold shadow-sm">
                    <span className="flex items-center gap-2">
                      <LayoutGrid className="size-3.5 text-accent" />
                      <span>Habit</span>
                    </span>
                  </th>
                  {columns.map((d) => {
                    const isToday = dateKey(d) === dateKey(today);
                    return (
                      <th
                        key={dateKey(d)}
                        className={`sticky top-0 z-20 px-0.5 py-2 font-medium shadow-sm ${
                          isToday ? "bg-accent/10 text-accent" : "bg-surface text-faint"
                        } w-9 md:w-auto`}
                      >
                        <div className="text-[10px] uppercase">
                          {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                        </div>
                        <div className="text-[11px]">{d.getDate()}</div>
                      </th>
                    );
                  })}
                  <th className="sticky top-0 z-20 w-10 bg-surface px-1.5 py-2 shadow-sm">
                    <Flame className="mx-auto size-3.5 text-amber-500/80" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupedHabits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={DAYS + 2}
                      className="px-4 py-12 text-center text-sm text-faint"
                    >
                      No habits yet — add one to start tracking
                    </td>
                  </tr>
                ) : (
                  groupedHabits.map((group) => (
                    <Fragment key={group.category}>
                      {/* Category header */}
                      <tr className="select-none border-t border-line/60">
                        <td
                          className="sticky left-0 z-20 border-r border-line/30 bg-surface2/95 px-2.5 py-1.5 text-left"
                          style={{ top: headerRowH - 1 }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{group.category}</span>
                            <span className="font-mono text-[10px] text-faint">{group.habits.length}</span>
                          </div>
                        </td>
                        <td colSpan={DAYS + 1} className="bg-surface2/95" style={{ top: headerRowH - 1 }} />
                      </tr>

                      {/* Habit rows */}
                      {group.habits.map((habit) => {
                        const { current } = habitStreaks(habit, data.marks, today, frozen);
                        return (
                          <tr key={habit.id} className="border-t border-line/40 transition-colors hover:bg-surface2/30">
                            <td className="sticky left-0 z-10 border-r border-line/30 bg-surface px-2.5 py-2 text-left shadow-[2px_0_6px_-4px_hsl(var(--c-shadow)/0.08)]">
                              <span className="flex items-center gap-1.5">
                                <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[habit.category] }} />
                                <span className="truncate text-[13px] font-medium">{habit.name}</span>
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
                            <td className="px-1.5 font-semibold">
                              {current > 0 ? (
                                <StreakFlame streak={current} size={13} showCount={false} className="justify-center" />
                              ) : (
                                <span className="text-[11px] text-faint">&ndash;</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><LegendDot className="bg-done" /> done</span>
        <span className="inline-flex items-center gap-1.5"><LegendDot className="bg-missed" /> missed</span>
        <span className="inline-flex items-center gap-1.5"><LegendDot className="bg-skipped" /> skipped</span>
        <span className="inline-flex items-center gap-1.5"><Lock className="size-3" /> locked</span>
        <span className="inline-flex items-center gap-1.5"><Snowflake className="size-3 text-sky-400" /> freeze</span>
        <span className="inline-flex items-center gap-1.5"><Flame className="size-3 text-amber-500" /> streak</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full border border-line/10" /> no record</span>
      </div>
    </AppPageShell>
  );
}
