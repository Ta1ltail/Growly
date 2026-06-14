"use client";

// Calendar — a month grid where each day is shaded by its completion %.
// Tap a day to see which habits were done / missed / skipped that day.

import { useMemo, useState } from "react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { dateKey, prettyDate } from "@/lib/storage";
import { useAppData } from "@/lib/store";
import { dayCompletion, isScheduled } from "@/lib/stats";
import { MARK_LABEL } from "@/lib/marks";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function shade(rate: number): string {
  if (rate === 0) return "bg-empty text-muted";
  if (rate < 34) return "bg-done/30";
  if (rate < 67) return "bg-done/60 text-white";
  return "bg-done text-white";
}

export default function CalendarPage() {
  const data = useAppData();
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date | null>(today);

  // Build the cells: leading blanks for the first weekday + each day of month.
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

  const selectedHabits = useMemo(() => {
    if (!selected) return [];
    return data.habits.filter((h) => isScheduled(h, selected));
  }, [data.habits, selected]);

  function changeMonth(delta: number) {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <>
      <header className="flex items-center justify-between pt-6 pb-4">
        <h1 className="font-mono text-lg font-semibold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => changeMonth(-1)}
            className="rounded px-2 py-1 text-muted hover:text-ink"
          >
            ‹
          </button>
          <span className="w-32 text-center font-medium">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="rounded px-2 py-1 text-muted hover:text-ink"
          >
            ›
          </button>
        </div>
      </header>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-1 text-center font-mono text-xs text-muted">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`blank-${i}`} />;
          const rate = dayCompletion(data.habits, data.marks, d);
          const isToday = dateKey(d) === dateKey(today);
          const isSelected = selected && dateKey(d) === dateKey(selected);
          return (
            <button
              key={dateKey(d)}
              onClick={() => setSelected(d)}
              className={`flex aspect-square flex-col items-center justify-center rounded-md font-mono text-xs transition-colors ${shade(
                rate,
              )} ${isSelected ? "ring-2 ring-accent" : isToday ? "ring-1 ring-accent" : ""}`}
            >
              <span>{d.getDate()}</span>
              {rate > 0 && <span className="text-[10px] opacity-80">{rate}%</span>}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selected && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {prettyDate(selected)}
          </h2>
          {selectedHabits.length === 0 ? (
            <p className="rounded-md border border-dashed border-line bg-surface p-4 text-center text-sm text-muted">
              No habits scheduled this day.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface text-sm">
              {selectedHabits.map((h) => {
                const status = data.marks[dateKey(selected)]?.[h.id];
                return (
                  <li key={h.id} className="flex items-center gap-2 px-3 py-2">
                    <span
                      className="size-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: CATEGORY_COLORS[h.category] }}
                    />
                    <span className="flex-1">{h.name}</span>
                    <span
                      className={`font-mono text-xs ${
                        status === "done"
                          ? "text-done"
                          : status === "missed"
                            ? "text-missed"
                            : "text-muted"
                      }`}
                    >
                      {status ? MARK_LABEL[status] : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {data.notes[dateKey(selected)] && (
            <p className="mt-2 rounded-md border border-line bg-surface p-3 text-sm text-muted italic">
              “{data.notes[dateKey(selected)]}”
            </p>
          )}
        </section>
      )}
    </>
  );
}
