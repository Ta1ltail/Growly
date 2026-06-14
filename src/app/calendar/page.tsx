"use client";

// Calendar — month grid shaded by completion %, tap a day for its detail.

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, X, Minus } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { dateKey, prettyDate } from "@/lib/storage";
import { useAppData } from "@/lib/store";
import { dayCompletion, isScheduled } from "@/lib/stats";
import { useToday } from "@/hooks/useToday";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function shade(rate: number): string {
  if (rate === 0) return "";
  if (rate < 34) return "bg-accent/20";
  if (rate < 67) return "bg-accent/45";
  if (rate < 100) return "bg-accent/70 text-white";
  return "bg-accent text-white";
}

export default function CalendarPage() {
  const data = useAppData();
  const today = useToday();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstWeekday = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let day = 1; day <= daysInMonth; day++) out.push(new Date(year, m, day));
    return out;
  }, [month]);

  const selectedHabits = useMemo(
    () => data.habits.filter((h) => isScheduled(h, selected)),
    [data.habits, selected],
  );

  function changeMonth(delta: number) {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Calendar"
        action={
          <div className="flex items-center gap-1">
            <button
              onClick={() => changeMonth(-1)}
              className="flex size-9 items-center justify-center rounded-xl border border-line text-muted transition-colors hover:bg-surface2 hover:text-ink"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="w-32 text-center text-sm font-semibold">
              {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="flex size-9 items-center justify-center rounded-xl border border-line text-muted transition-colors hover:bg-surface2 hover:text-ink"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card className="p-4">
            <div className="mb-2 grid grid-cols-7 gap-1.5 text-center font-mono text-[11px] text-faint">
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} className="py-1">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((d, i) => {
                if (!d) return <div key={`b-${i}`} />;
                const rate = dayCompletion(data.habits, data.marks, d);
                const isToday = dateKey(d) === dateKey(today);
                const isSelected = dateKey(d) === dateKey(selected);
                return (
                  <button
                    key={dateKey(d)}
                    onClick={() => setSelected(d)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl border font-mono text-xs transition-all hover:scale-105 ${shade(
                      rate,
                    )} ${
                      isSelected
                        ? "border-accent ring-accent-soft"
                        : isToday
                          ? "border-accent/50"
                          : "border-transparent"
                    } ${rate === 0 ? "bg-surface2/40 text-muted" : ""}`}
                  >
                    <span className="font-semibold">{d.getDate()}</span>
                    {rate > 0 && <span className="text-[9px] opacity-80">{rate}%</span>}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Selected day */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {prettyDate(selected)}
          </h2>
          {selectedHabits.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted">
              No habits scheduled this day.
            </Card>
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {selectedHabits.map((h) => {
                const status = data.marks[dateKey(selected)]?.[h.id];
                return (
                  <div key={h.id} className="flex items-center gap-2.5 px-4 py-2.5 text-sm">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[h.category] }}
                    />
                    <span className="flex-1">{h.name}</span>
                    {status === "done" ? (
                      <Check className="size-4 text-done" strokeWidth={2.5} />
                    ) : status === "missed" ? (
                      <X className="size-4 text-missed" strokeWidth={2.5} />
                    ) : status === "skipped" ? (
                      <Minus className="size-4 text-skipped" strokeWidth={2.5} />
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </div>
                );
              })}
            </Card>
          )}
          {data.notes[dateKey(selected)] && (
            <Card className="mt-3 p-4 text-sm italic text-muted">
              “{data.notes[dateKey(selected)]}”
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
