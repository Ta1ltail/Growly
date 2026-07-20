import type { Habit, Priority, Recurrence } from "./types";
import { effectiveRecurrence } from "./stats";

// Mon-first weekday ordering (internal uses 0=Sun..6=Sat).
export const WEEKDAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAY_SHORT: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export const WEEKDAY_LONG: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

// Single-letter labels for compact grids.
export const WEEKDAY_LETTER: Record<number, string> = {
  0: "S",
  1: "M",
  2: "T",
  3: "W",
  4: "T",
  5: "F",
  6: "S",
};

const ORDINAL = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// "Every day", "Mon, Wed, Fri", "Monthly on the 1st, 15th".
function recurrenceText(rec: Recurrence): string {
  switch (rec.kind) {
    case "daily":
      return "Every day";
    case "weekly": {
      if (rec.weekdays.length === 0 || rec.weekdays.length === 7)
        return "Every day";
      const ordered = WEEKDAYS_MON_FIRST.filter((d) =>
        rec.weekdays.includes(d),
      );
      // Weekdays / weekends shortcuts.
      if (
        rec.weekdays.length === 5 &&
        [1, 2, 3, 4, 5].every((d) => rec.weekdays.includes(d))
      )
        return "Weekdays";
      if (
        rec.weekdays.length === 2 &&
        [0, 6].every((d) => rec.weekdays.includes(d))
      )
        return "Weekends";
      return ordered.map((d) => WEEKDAY_SHORT[d]).join(", ");
    }
    case "monthly":
      if (rec.monthDays.length === 0) return "Monthly";
      return `Monthly on the ${rec.monthDays
        .slice()
        .sort((a, b) => a - b)
        .map(ORDINAL)
        .join(", ")}`;
  }
}

export function habitScheduleText(habit: Habit): string {
  const base = recurrenceText(effectiveRecurrence(habit));
  return habit.timeOfDay ? `${base} · ${formatTime(habit.timeOfDay)}` : base;
}

// "07:30" -> "7:30 AM"
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  med: "Medium",
  high: "High",
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  low: "#64748b",
  med: "#3b82f6",
  high: "#f43f5e",
};
