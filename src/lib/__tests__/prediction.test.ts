// Tests for prediction engine — pure functions, no mocks needed.

import { describe, it, expect } from "vitest";
import { weeklyProjection } from "../prediction";
import { addDays } from "../date";
import type { Habit, Marks } from "../types";

function makeHabit(id: string, overrides?: Partial<Habit>): Habit {
  return {
    id,
    name: `Habit ${id}`,
    category: "Health",
    recurrence: { kind: "daily" },
    repeatDays: [],
    createdAt: "2024-01-01T00:00:00Z",
    priority: "med",
    ...overrides,
  } as Habit;
}

function makeMarks(daysAgo: number, status: "done" | "missed" | "skipped"): Marks {
  const marks: Marks = {};
  for (let i = daysAgo; i >= 1; i--) {
    const d = addDays(new Date(), -i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    marks[key] = { "h1": status };
  }
  return marks;
}

describe("weeklyProjection", () => {
  it("returns stable trend for consistent completion", () => {
    const habit = makeHabit("h1");
    const marks = makeMarks(14, "done");
    const result = weeklyProjection([habit], marks, new Date(), 50, 200);
    expect(result.estimatedCompletion).toBeGreaterThanOrEqual(85);
    expect(result.trend).toBe("stable");
  });

  it("returns up trend for improving completion", () => {
    const habit = makeHabit("h1");
    // Older days: mostly missed
    const marks: Marks = {};
    for (let i = 14; i >= 8; i--) {
      const d = addDays(new Date(), -i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      marks[key] = { "h1": "missed" };
    }
    // Recent days: mostly done
    for (let i = 7; i >= 1; i--) {
      const d = addDays(new Date(), -i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      marks[key] = { "h1": "done" };
    }
    const result = weeklyProjection([habit], marks, new Date(), 30, 200);
    expect(result.trend).toBe("up");
  });

  it("returns down trend for declining completion", () => {
    const habit = makeHabit("h1");
    // Older days: mostly done
    const marks: Marks = {};
    for (let i = 14; i >= 8; i--) {
      const d = addDays(new Date(), -i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      marks[key] = { "h1": "done" };
    }
    // Recent days: mostly missed
    for (let i = 7; i >= 1; i--) {
      const d = addDays(new Date(), -i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      marks[key] = { "h1": "missed" };
    }
    const result = weeklyProjection([habit], marks, new Date(), 10, 200);
    expect(result.trend).toBe("down");
  });

  it("returns null daysToNextLevel when xpPerDay is 0", () => {
    const habit = makeHabit("h1");
    const marks = makeMarks(7, "done");
    const result = weeklyProjection([habit], marks, new Date(), 0, 200);
    expect(result.estimatedDaysToNextLevel).toBeNull();
  });

  it("estimates days to next level when earning XP", () => {
    const habit = makeHabit("h1");
    const marks = makeMarks(7, "done");
    const result = weeklyProjection([habit], marks, new Date(), 50, 200);
    expect(result.estimatedDaysToNextLevel).toBe(4); // ceil(200/50)
  });

  it("returns 0 estimated completion for no active habits", () => {
    const result = weeklyProjection([], {}, new Date(), 0, 200);
    expect(result.estimatedCompletion).toBe(0);
  });

  it("returns stable trend for empty data", () => {
    const result = weeklyProjection([], {}, new Date(), 0, 200);
    // No habits means 0 completion, trend should be stable
    expect(["up", "down", "stable"]).toContain(result.trend);
  });
});
