"use client";

// Calendar — plan and review by date. Month/Week views shaded by completion,
// a clear "today" indicator, and a day detail panel with the day's scheduled
// habits (time-ordered, with a live "now" marker), notes, and goal deadlines.
// Each date shows a circular fill progress indicator with dynamic color progression
// instead of numeric-only indicators.

import { useMemo, useState, memo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Minus,
  Flag,
  NotebookPen,
  Snowflake,
} from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { addDays, dateKey, prettyDate } from "@/lib/date";
import { DEFAULT_GRACE_HOURS } from "@/lib/storage";
import { cycleMark, useAppDataSelector } from "@/lib/store";
import { dayCompletion, isScheduled } from "@/lib/stats";
import { frozenSet, isFrozen } from "@/lib/economy";
import { canEditMark } from "@/lib/policy";
import { formatTime } from "@/lib/format";
import { useToday } from "@/hooks/useToday";
import { MarkButton } from "@/components/habits/MarkButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useHydrated } from "@/hooks/useHydrated";
import { AppPageShell } from "@/components/layout/AppPageShell";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const VIEWS = [
  { value: "month" as const, label: "Month" },
  { value: "week" as const, label: "Week" },
];

// Dynamic color progression for circular progress
// 0-25%: low progress color, 26-50%: medium-low, 51-75%: medium-high, 76-100%: completed/high
function progressColor(rate: number): string {
  if (rate === 0) return "var(--c-empty)";
  if (rate <= 25) return "#f43f5e"; // low - rose/missed
  if (rate <= 50) return "#f59e0b"; // medium-low - amber
  if (rate <= 75) return "#22c55e"; // medium-high - green/done
  return "#22c55e"; // completed/high - done green
}

const CircularProgress = memo(function CircularProgress({
  rate,
  size = 32,
}: {
  rate: number;
  size?: number;
}) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, rate));
  const offset = c - (pct / 100) * c;
  const color = progressColor(rate);

  if (rate === 0) {
    return (
      <div
        className="grid place-items-center"
        style={{ width: size, height: size }}
      >
        <span className="text-[9px] font-semibold opacity-60">—</span>
      </div>
    );
  }

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--c-empty)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition:
              "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1), stroke 0.4s ease",
          }}
        />
      </svg>
      <span className="text-[9px] font-bold leading-none" style={{ color }}>
        {rate}%
      </span>
    </div>
  );
});

function shade(rate: number): string {
  if (rate === 0) return "";
  if (rate <= 25) return "bg-rose-500/15 border-rose-500/30";
  if (rate <= 50) return "bg-amber-500/15 border-amber-500/30";
  if (rate <= 75) return "bg-emerald-500/15 border-emerald-500/30";
  return "bg-accent/20 border-accent/40";
}

export default function CalendarPage() {
  const habits = useAppDataSelector((d) => d.habits);
  const marks = useAppDataSelector((d) => d.marks);
  const notes = useAppDataSelector((d) => d.notes);
  const goals = useAppDataSelector((d) => d.goals);
  const graceSetting = useAppDataSelector((d) => d.settings.graceHours);
  const economy = useAppDataSelector((d) => d.economy);
  const today = useToday();
  const grace = graceSetting ?? DEFAULT_GRACE_HOURS;
  const active = useMemo(
    () => habits.filter((h) => !h.archived && !h.deletedAt),
    [habits],
  );
  const frozen = useMemo(() => frozenSet(economy), [economy]);
  const [view, setView] = useState<"month" | "week">("month");
  const [anchor, setAnchor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [weekStart, setWeekStart] = useState(() =>
    addDays(today, -today.getDay()),
  );
  const [selected, setSelected] = useState<Date>(today);

  const monthCells = useMemo(() => {
    const year = anchor.getFullYear();
    const m = anchor.getMonth();
    const firstWeekday = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let day = 1; day <= daysInMonth; day++)
      out.push(new Date(year, m, day));
    return out;
  }, [anchor]);

  const weekCells = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const selectedKey = dateKey(selected);
  const selectedHabits = useMemo(
    () =>
      active
        .filter((h) => isScheduled(h, selected))
        .sort((a, b) =>
          (a.timeOfDay ?? "99") < (b.timeOfDay ?? "99") ? -1 : 1,
        ),
    [active, selected],
  );
  const hydrated = useHydrated();
  const dayNotes = notes.filter((n) => n.links.date === selectedKey);
  const deadlines = goals.filter((g) => g.deadline === selectedKey);
  const editable = canEditMark(selectedKey, today, grace);
  const nowHHMM = `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`;
  const selectedIsToday = selectedKey === dateKey(today);

  function shift(delta: number) {
    if (view === "month")
      setAnchor((p) => new Date(p.getFullYear(), p.getMonth() + delta, 1));
    else setWeekStart((p) => addDays(p, delta * 7));
  }

  const headerLabel =
    view === "month"
      ? anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : `${weekCells[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekCells[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  if (!hydrated) return <PageSkeleton />;

  return (
    <AppPageShell>
      <PageHeader
        title="Calendar"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented options={VIEWS} value={view} onChange={setView} />
            <div className="flex items-center gap-1">
              <button
                onClick={() => shift(-1)}
                aria-label={
                  view === "month" ? "Previous month" : "Previous week"
                }
                className="flex size-9 items-center justify-center rounded-xl border border-line text-muted transition-colors hover:bg-surface2 hover:text-ink"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-28 text-center text-sm font-semibold">
                {headerLabel}
              </span>
              <button
                onClick={() => shift(1)}
                aria-label={view === "month" ? "Next month" : "Next week"}
                className="flex size-9 items-center justify-center rounded-xl border border-line text-muted transition-colors hover:bg-surface2 hover:text-ink"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        }
      />

      {/* Calendar + detail panel — responsive stack */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
        {/* Calendar grid */}
        <div className="lg:col-span-7">
          <Card className="p-4">
            <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[11px] text-faint mb-2">
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} className="py-1">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {(view === "month" ? monthCells : weekCells).map((d, i) => {
                if (!d) return <div key={`b-${i}`} className="min-h-[56px]" />;
                const rate = dayCompletion(active, marks, d);
                const isToday = dateKey(d) === dateKey(today);
                const isSelected = dateKey(d) === selectedKey;
                const hasNote = notes.some(
                  (n) => n.links.date === dateKey(d),
                );
                const hasDeadline = goals.some(
                  (g) => g.deadline === dateKey(d),
                );
                return (
                  <button
                    key={dateKey(d)}
                    onClick={() => setSelected(d)}
                    aria-label={`${d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} — ${Math.round(rate * 100)}% complete`}
                    className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl border py-2 transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${shade(rate)} ${
                      isSelected
                        ? "border-accent ring-2 ring-accent/40"
                        : isToday
                          ? "border-accent/50"
                          : "border-transparent"
                    } ${rate === 0 && !isToday ? "bg-surface2/40 text-muted" : ""}`}
                  >
                    <span className={`text-sm font-semibold ${isToday ? "text-accent" : ""}`}>
                      {d.getDate()}
                    </span>
                    <CircularProgress rate={rate} size={24} />
                    {(hasNote || hasDeadline) && (
                      <span className="flex gap-0.5" aria-label={hasNote && hasDeadline ? "Has notes and goal deadlines" : hasNote ? "Has notes" : "Has goal deadlines"}>
                        {hasNote && <span className="size-1 rounded-full bg-current opacity-60" title="Has notes" />}
                        {hasDeadline && <span className="size-1 rounded-full bg-amber-500" title="Has goal deadlines" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Day detail panel */}
        <div className="lg:col-span-5">
          <h2 className="mb-3 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-muted">
            <span>{prettyDate(selected)}</span>
            {selectedIsToday && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">
                Today
              </span>
            )}
          </h2>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {deadlines.length > 0 && (
              <Card className="p-3">
                {deadlines.map((g) => (
                  <div key={g.id} className="flex items-center gap-2 text-sm">
                    <Flag className="size-4 text-amber-500" />
                    <span className="flex-1">Goal due: {g.title}</span>
                    <span className="font-mono text-xs text-muted">
                      {g.current}/{g.target}
                    </span>
                  </div>
                ))}
              </Card>
            )}

            {selectedHabits.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted">
                No habits scheduled this day.
              </Card>
            ) : (
              <Card className="divide-y divide-line overflow-hidden">
                {selectedHabits.map((h) => {
                  const status = marks[selectedKey]?.[h.id];
                  const dayFrozen =
                    status === "missed" && isFrozen(frozen, h.id, selectedKey);
                  const showNowBefore =
                    selectedIsToday && h.timeOfDay && h.timeOfDay >= nowHHMM;
                  return (
                    <div key={h.id}>
                      {showNowBefore && <NowLine time={nowHHMM} />}
                      <div className="flex items-center gap-2.5 px-4 py-2.5 text-sm">
                        {editable ? (
                          <MarkButton
                            status={status}
                            onClick={() => cycleMark(selectedKey, h.id)}
                            size={22}
                            frozen={dayFrozen}
                          />
                        ) : (
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: CATEGORY_COLORS[h.category],
                            }}
                          />
                        )}
                        <span className="flex-1">{h.name}</span>
                        {h.timeOfDay && (
                          <span className="font-mono text-[11px] text-faint">
                            {formatTime(h.timeOfDay)}
                          </span>
                        )}
                        {!editable &&
                          (status === "done" ? (
                            <Check className="size-4 text-done" strokeWidth={2.5} />
                          ) : status === "missed" ? (
                            dayFrozen ? (
                              <span className="flex items-center gap-1" title="Protected by a streak freeze">
                                <X className="size-4 text-missed opacity-50" strokeWidth={2.5} />
                                <Snowflake className="size-3.5 text-sky-400" strokeWidth={2.5} />
                              </span>
                            ) : (
                              <X className="size-4 text-missed" strokeWidth={2.5} />
                            )
                          ) : status === "skipped" ? (
                            <Minus className="size-4 text-skipped" strokeWidth={2.5} />
                          ) : (
                            <span className="text-faint">—</span>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </Card>
            )}

            {dayNotes.length > 0 && (
              <Card className="p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <NotebookPen className="size-3.5 icon-accent" /> Notes
                </p>
                {dayNotes.map((n) => (
                  <p key={n.id} className="text-sm italic text-muted">&quot;{n.body}&quot;</p>
                ))}
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppPageShell>
  );
}

function NowLine({ time }: { time: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <span className="size-1.5 rounded-full bg-accent" />
      <span className="h-px flex-1 bg-accent/40" />
      <span className="font-mono text-[10px] font-semibold text-accent">
        now {formatTime(time)}
      </span>
    </div>
  );
}
