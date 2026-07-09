import { describe, it, expect } from "vitest";
import { formatTime, habitScheduleText, WEEKDAY_SHORT, PRIORITY_LABEL, PRIORITY_COLOR } from "./format";
import type { Habit } from "./types";

// We test the recurrence logic through habitScheduleText since recurrenceText
// is private. We construct habits with different recurrence patterns.

function habit(over: Partial<Habit>): Habit {
  return {
    id: "h1",
    name: "Test",
    category: "Health",
    repeatDays: [],
    createdAt: "2026-06-01T08:00:00.000Z",
    ...over,
  };
}

// --- formatTime ------------------------------------------------------------

describe("formatTime", () => {
  it("converts 00:00 to 12:00 AM", () => {
    expect(formatTime("00:00")).toBe("12:00 AM");
  });

  it("converts 07:30 to 7:30 AM", () => {
    expect(formatTime("07:30")).toBe("7:30 AM");
  });

  it("converts 12:00 to 12:00 PM", () => {
    expect(formatTime("12:00")).toBe("12:00 PM");
  });

  it("converts 13:15 to 1:15 PM", () => {
    expect(formatTime("13:15")).toBe("1:15 PM");
  });

  it("converts 23:59 to 11:59 PM", () => {
    expect(formatTime("23:59")).toBe("11:59 PM");
  });

  it("handles missing minutes by padding with 00", () => {
    expect(formatTime("08")).toBe("8:00 AM");
  });

  it("returns the raw string if it can't be parsed", () => {
    expect(formatTime("invalid")).toBe("invalid");
  });

  it("handles 0 minutes as 12:00 AM", () => {
    expect(formatTime("0:00")).toBe("12:00 AM");
  });
});

// --- habitScheduleText (recurrence display) ---------------------------------

describe("habitScheduleText", () => {
  it('shows "Every day" for daily recurrence', () => {
    const h = habit({ recurrence: { kind: "daily" }, repeatDays: [] });
    expect(habitScheduleText(h)).toBe("Every day");
  });

  it('shows "Every day" for weekly with 7 days', () => {
    const h = habit({
      recurrence: { kind: "weekly", weekdays: [0, 1, 2, 3, 4, 5, 6] },
      repeatDays: [0, 1, 2, 3, 4, 5, 6],
    });
    expect(habitScheduleText(h)).toBe("Every day");
  });

  it('shows "Weekdays" for Mon-Fri', () => {
    const h = habit({
      recurrence: { kind: "weekly", weekdays: [1, 2, 3, 4, 5] },
      repeatDays: [1, 2, 3, 4, 5],
    });
    expect(habitScheduleText(h)).toBe("Weekdays");
  });

  it('shows "Weekends" for Sat-Sun', () => {
    const h = habit({
      recurrence: { kind: "weekly", weekdays: [0, 6] },
      repeatDays: [0, 6],
    });
    expect(habitScheduleText(h)).toBe("Weekends");
  });

  it('shows "Mon, Wed, Fri" for specific days', () => {
    const h = habit({
      recurrence: { kind: "weekly", weekdays: [1, 3, 5] },
      repeatDays: [1, 3, 5],
    });
    expect(habitScheduleText(h)).toBe("Mon, Wed, Fri");
  });

  it('shows "Monthly" for monthly with no specific days', () => {
    const h = habit({
      recurrence: { kind: "monthly", monthDays: [] },
      repeatDays: [],
    });
    expect(habitScheduleText(h)).toBe("Monthly");
  });

  it('shows "Monthly on the 1st, 15th" for specific days', () => {
    const h = habit({
      recurrence: { kind: "monthly", monthDays: [1, 15] },
      repeatDays: [],
    });
    expect(habitScheduleText(h)).toBe("Monthly on the 1st, 15th");
  });

  it('shows "Monthly on the 3rd, 21st" for 3rd and 21st', () => {
    const h = habit({
      recurrence: { kind: "monthly", monthDays: [3, 21] },
      repeatDays: [],
    });
    expect(habitScheduleText(h)).toBe("Monthly on the 3rd, 21st");
  });

  it('appends time when timeOfDay is set', () => {
    const h = habit({
      recurrence: { kind: "daily" },
      repeatDays: [],
      timeOfDay: "07:30",
    });
    expect(habitScheduleText(h)).toBe("Every day · 7:30 AM");
  });

  it('shows "Tue, Thu" for Tuesday/Thursday', () => {
    const h = habit({
      recurrence: { kind: "weekly", weekdays: [2, 4] },
      repeatDays: [2, 4],
    });
    expect(habitScheduleText(h)).toBe("Tue, Thu");
  });

  it("uses repeatDays as fallback when no recurrence is set (legacy data)", () => {
    const h = habit({ repeatDays: [1, 3], recurrence: undefined });
    expect(habitScheduleText(h)).toBe("Mon, Wed");
  });
});

// --- WEEKDAY_SHORT ---------------------------------------------------------

describe("WEEKDAY_SHORT", () => {
  it("maps all 7 days", () => {
    expect(WEEKDAY_SHORT[0]).toBe("Sun");
    expect(WEEKDAY_SHORT[1]).toBe("Mon");
    expect(WEEKDAY_SHORT[2]).toBe("Tue");
    expect(WEEKDAY_SHORT[3]).toBe("Wed");
    expect(WEEKDAY_SHORT[4]).toBe("Thu");
    expect(WEEKDAY_SHORT[5]).toBe("Fri");
    expect(WEEKDAY_SHORT[6]).toBe("Sat");
  });
});

// --- PRIORITY_LABEL / PRIORITY_COLOR ---------------------------------------

describe("priority constants", () => {
  it("PRIORITY_LABEL has correct labels", () => {
    expect(PRIORITY_LABEL.low).toBe("Low");
    expect(PRIORITY_LABEL.med).toBe("Medium");
    expect(PRIORITY_LABEL.high).toBe("High");
  });

  it("PRIORITY_COLOR has hex colors", () => {
    expect(PRIORITY_COLOR.low).toMatch(/^#[0-9a-f]{6}$/i);
    expect(PRIORITY_COLOR.med).toMatch(/^#[0-9a-f]{6}$/i);
    expect(PRIORITY_COLOR.high).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
