"use client";

// Clear weekday selector: Mon-first, full-name tooltips + aria labels, with
// quick "Every day / Weekdays / Weekends" shortcuts. Replaces the old cramped
// "TWTFSS" text indicators.

import { WEEKDAYS_MON_FIRST, WEEKDAY_LETTER, WEEKDAY_LONG } from "@/lib/format";

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];

export function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  function toggle(day: number) {
    onChange(
      value.includes(day) ? value.filter((d) => d !== day) : [...value, day],
    );
  }

  const isEveryDay = value.length === 7 || value.length === 0;
  const isWeekdays =
    value.length === 5 && WEEKDAYS.every((d) => value.includes(d));
  const isWeekends =
    value.length === 2 && WEEKENDS.every((d) => value.includes(d));

  return (
    <div>
      <div className="flex gap-1.5">
        {WEEKDAYS_MON_FIRST.map((day) => {
          const active = value.length === 0 || value.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              title={WEEKDAY_LONG[day]}
              aria-label={WEEKDAY_LONG[day]}
              aria-pressed={active}
              className={`flex size-9 items-center justify-center rounded-xl text-xs font-semibold transition-all active:scale-90 ${
                active
                  ? "bg-accent text-white shadow-sm"
                  : "bg-surface2 text-muted hover:text-ink"
              }`}
            >
              {WEEKDAY_LETTER[day]}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Shortcut
          label="Every day"
          active={isEveryDay}
          onClick={() => onChange([0, 1, 2, 3, 4, 5, 6])}
        />
        <Shortcut
          label="Weekdays"
          active={isWeekdays}
          onClick={() => onChange([1, 2, 3, 4, 5])}
        />
        <Shortcut
          label="Weekends"
          active={isWeekends}
          onClick={() => onChange([0, 6])}
        />
      </div>
    </div>
  );
}

function Shortcut({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-line text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
