import { describe, it, expect } from "vitest";
import type { Habit, Marks } from "./types";
import {
  isScheduled,
  habitStreaks,
  rangeCompletion,
  dayCompletion,
  categoryCompletion,
  lastNDaysCompletion,
} from "./stats";

// --- helpers ---------------------------------------------------------------

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Test",
    category: "Health",
    repeatDays: [], // every day
    createdAt: "2026-06-01T08:00:00.000Z",
    ...over,
  };
}

// Build a marks map for a single habit from a {dateKey: status} object.
function marksFor(
  id: string,
  days: Record<string, "done" | "missed" | "skipped">,
): Marks {
  const m: Marks = {};
  for (const [k, status] of Object.entries(days)) m[k] = { [id]: status };
  return m;
}

const D = (s: string) => new Date(`${s}T12:00:00`);

// --- isScheduled -----------------------------------------------------------

describe("isScheduled", () => {
  it("empty repeatDays means every day", () => {
    const h = habit({ repeatDays: [] });
    expect(isScheduled(h, D("2026-06-10"))).toBe(true); // a Wednesday
    expect(isScheduled(h, D("2026-06-14"))).toBe(true); // a Sunday
  });

  it("respects specific weekdays (0=Sun..6=Sat)", () => {
    // 2026-06-15 is a Monday (getDay() === 1)
    const monOnly = habit({ repeatDays: [1] });
    expect(isScheduled(monOnly, D("2026-06-15"))).toBe(true);
    expect(isScheduled(monOnly, D("2026-06-16"))).toBe(false); // Tuesday
  });
});

// --- habitStreaks ----------------------------------------------------------

describe("habitStreaks", () => {
  const id = "h1";
  const h = habit({
    id,
    repeatDays: [],
    createdAt: "2026-06-01T08:00:00.000Z",
  });
  const today = D("2026-06-10");

  it("counts a simple unbroken current streak", () => {
    const marks = marksFor(id, {
      "2026-06-08": "done",
      "2026-06-09": "done",
      "2026-06-10": "done",
    });
    expect(habitStreaks(h, marks, today).current).toBe(3);
  });

  it("an unmarked day breaks the current streak", () => {
    const marks = marksFor(id, {
      "2026-06-08": "done",
      // 06-09 unmarked
      "2026-06-10": "done",
    });
    expect(habitStreaks(h, marks, today).current).toBe(1);
  });

  it("a missed day breaks the streak; skipped is neutral", () => {
    const marks = marksFor(id, {
      "2026-06-01": "done",
      "2026-06-02": "done",
      "2026-06-03": "done",
      "2026-06-04": "done",
      "2026-06-05": "done", // best run = 5
      "2026-06-06": "missed", // breaks
      "2026-06-07": "skipped", // neutral — must NOT bridge the break
      "2026-06-08": "done",
      "2026-06-09": "done",
      "2026-06-10": "done", // current run = 3
    });
    const { current, best } = habitStreaks(h, marks, today);
    expect(best).toBe(5);
    expect(current).toBe(3);
  });

  it("skipped days are ignored, not counted, in the current streak", () => {
    const marks = marksFor(id, {
      "2026-06-08": "done",
      "2026-06-09": "skipped",
      "2026-06-10": "done",
    });
    // done(10) -> skipped(9) neutral -> done(8): current = 2
    expect(habitStreaks(h, marks, today).current).toBe(2);
  });

  it("only counts scheduled weekdays", () => {
    // Mondays only. June 2026 Mondays: 1, 8.
    const monOnly = habit({
      id,
      repeatDays: [1],
      createdAt: "2026-06-01T08:00:00.000Z",
    });
    const marks = marksFor(id, {
      "2026-06-01": "done",
      "2026-06-08": "done",
    });
    const { current, best } = habitStreaks(monOnly, marks, today);
    expect(best).toBe(2);
    expect(current).toBe(2);
  });

  it("returns zero when nothing is marked", () => {
    expect(habitStreaks(h, {}, today)).toEqual({ current: 0, best: 0 });
  });

  it("an unmarked today does NOT break the current streak (day in progress)", () => {
    const marks = marksFor(id, {
      "2026-06-08": "done",
      "2026-06-09": "done",
      // 06-10 (today) unmarked — streak is still alive at 2
    });
    expect(habitStreaks(h, marks, today).current).toBe(2);
  });

  it("a missed today still breaks the current streak", () => {
    const marks = marksFor(id, {
      "2026-06-08": "done",
      "2026-06-09": "done",
      "2026-06-10": "missed",
    });
    expect(habitStreaks(h, marks, today).current).toBe(0);
  });

  it("a frozen miss is neutral, bridging the current streak", () => {
    const marks = marksFor(id, {
      "2026-06-08": "done",
      "2026-06-09": "missed", // would break the run...
      "2026-06-10": "done",
    });
    // Unfrozen: the miss breaks it → current = 1.
    expect(habitStreaks(h, marks, today).current).toBe(1);
    // Frozen: 06-09 is treated as neutral → done(10) + done(8) = 2.
    const frozen = new Set([`${id}@2026-06-09`]);
    expect(habitStreaks(h, marks, today, frozen).current).toBe(2);
  });

  it("only freezes the exact habit+day key", () => {
    const marks = marksFor(id, {
      "2026-06-08": "done",
      "2026-06-09": "missed",
      "2026-06-10": "done",
    });
    // A freeze keyed to a different habit must not protect h1's miss.
    const frozen = new Set([`other@2026-06-09`]);
    expect(habitStreaks(h, marks, today, frozen).current).toBe(1);
  });
});

// --- rangeCompletion -------------------------------------------------------

describe("rangeCompletion", () => {
  const id = "h1";
  const h = habit({
    id,
    repeatDays: [],
    createdAt: "2026-06-08T08:00:00.000Z",
  });

  it("computes scheduled/done/rate and ignores days before creation", () => {
    const marks = marksFor(id, {
      "2026-06-08": "done",
      "2026-06-09": "missed",
      "2026-06-10": "done",
    });
    // Range 06-06..06-10 but habit created 06-08 -> only 3 scheduled days.
    const r = rangeCompletion([h], marks, D("2026-06-06"), D("2026-06-10"));
    expect(r.scheduled).toBe(3);
    expect(r.done).toBe(2);
    expect(r.rate).toBe(67); // round(2/3*100)
  });

  it("returns rate 0 with no scheduled habits", () => {
    expect(rangeCompletion([], {}, D("2026-06-01"), D("2026-06-10")).rate).toBe(
      0,
    );
  });
});

// --- dayCompletion ---------------------------------------------------------

describe("dayCompletion", () => {
  it("is the share of scheduled habits marked done that day", () => {
    const a = habit({ id: "a", repeatDays: [] });
    const b = habit({ id: "b", repeatDays: [] });
    const marks: Marks = { "2026-06-10": { a: "done" } }; // b unmarked
    expect(dayCompletion([a, b], marks, D("2026-06-10"))).toBe(50);
  });
});

// --- categoryCompletion ----------------------------------------------------

describe("categoryCompletion", () => {
  it("groups by category and sorts by rate descending", () => {
    const work = habit({ id: "w", category: "Work", repeatDays: [] });
    const health = habit({ id: "h", category: "Health", repeatDays: [] });
    const marks = marksFor("w", { "2026-06-10": "done" });
    const out = categoryCompletion(
      [work, health],
      { ...marks, "2026-06-10": { w: "done" } },
      D("2026-06-10"),
      D("2026-06-10"),
    );
    expect(out[0].category).toBe("Work"); // 100% sorts first
    expect(out[0].rate).toBe(100);
    expect(out.find((c) => c.category === "Health")?.rate).toBe(0);
  });
});

// --- lastNDaysCompletion ---------------------------------------------------

describe("lastNDaysCompletion", () => {
  it("returns n entries, oldest first, ending today", () => {
    const out = lastNDaysCompletion([habit()], {}, D("2026-06-10"), 7);
    expect(out).toHaveLength(7);
    expect(out[0].date.getDate()).toBe(4); // 06-04
    expect(out[6].date.getDate()).toBe(10); // 06-10 (today)
  });
});
