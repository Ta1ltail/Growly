// Basic smoke test for the shared library.
// Ensures the core utility functions work correctly.

import { describe, it, expect } from "vitest";
import { dateKey, parseDateKey, addDays, startOfDay, dayDiff } from "./date";
import { uid, cn } from "./util";
import { nextStatus } from "./marks";
import { canEditMark, isFutureDay } from "./policy";
import { CATEGORIES } from "./categories";
import { formatTime } from "./format";
import { ACCENTS, resolveMode } from "./theme";
import { makeHabit, applyHabitForm } from "./habits";
import { levelInfo, xpToAdvance } from "./xp";
import { evaluateAchievements, RARITY_ORDER } from "./achievements";
import { SHOP_ITEMS, FREEZE_PRICE } from "./economy";
import { TITLES, titleForLevel } from "./titles";
import { RANK_STYLE, RANK_ORDER } from "./ranks";
import { RARITY_STYLE } from "./rarity";
import { TEMPLATES } from "./templates";

describe("date utilities", () => {
  it("dateKey produces YYYY-MM-DD format", () => {
    const d = new Date(2024, 0, 15); // Jan 15, 2024
    expect(dateKey(d)).toBe("2024-01-15");
  });

  it("parseDateKey round-trips correctly", () => {
    const d = parseDateKey("2024-06-15");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(5); // 0-indexed
    expect(d.getDate()).toBe(15);
  });

  it("addDays works forward and backward", () => {
    const d = new Date(2024, 0, 15);
    expect(dateKey(addDays(d, 3))).toBe("2024-01-18");
    expect(dateKey(addDays(d, -5))).toBe("2024-01-10");
  });

  it("startOfDay sets time to 00:00:00", () => {
    const d = new Date(2024, 0, 15, 14, 30, 45);
    const sod = startOfDay(d);
    expect(sod.getHours()).toBe(0);
    expect(sod.getMinutes()).toBe(0);
    expect(sod.getSeconds()).toBe(0);
  });

  it("dayDiff calculates correct differences", () => {
    const a = new Date(2024, 0, 20);
    const b = new Date(2024, 0, 15);
    expect(dayDiff(a, b)).toBe(5);
    expect(dayDiff(b, a)).toBe(-5);
  });
});

describe("utility functions", () => {
  it("uid generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });

  it("cn merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
    expect(cn(false && "a", "b")).toBe("b");
    expect(cn("a", undefined, "b")).toBe("a b");
  });
});

describe("marks (tap cycle)", () => {
  it("cycles through states in order", () => {
    expect(nextStatus(undefined)).toBe("done");
    expect(nextStatus("done")).toBe("missed");
    expect(nextStatus("missed")).toBe("skipped");
    expect(nextStatus("skipped")).toBe(undefined);
  });
});

describe("honest tracking policy", () => {
  it("today is always editable", () => {
    const now = new Date(2024, 0, 15, 10, 0);
    expect(canEditMark("2024-01-15", now, 5)).toBe(true);
  });

  it("future days are locked", () => {
    const now = new Date(2024, 0, 15, 10, 0);
    expect(canEditMark("2024-01-16", now, 5)).toBe(false);
  });

  it("yesterday is editable within grace window", () => {
    const now = new Date(2024, 0, 15, 3, 0); // 3 AM
    expect(canEditMark("2024-01-14", now, 5)).toBe(true);
  });

  it("yesterday is locked outside grace window", () => {
    const now = new Date(2024, 0, 15, 10, 0); // 10 AM, grace=5
    expect(canEditMark("2024-01-14", now, 5)).toBe(false);
  });

  it("isFutureDay detects future dates", () => {
    const now = new Date(2024, 0, 15, 10, 0);
    expect(isFutureDay("2024-01-16", now)).toBe(true);
    expect(isFutureDay("2024-01-15", now)).toBe(false);
    expect(isFutureDay("2024-01-14", now)).toBe(false);
  });
});

describe("categories", () => {
  it("has all expected categories", () => {
    expect(CATEGORIES).toContain("Workout");
    expect(CATEGORIES).toContain("Health");
    expect(CATEGORIES).toContain("Studies");
    expect(CATEGORIES).toContain("Work");
    expect(CATEGORIES).toContain("Lifestyle");
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(7);
  });
});

describe("format helpers", () => {
  it("formatTime converts HH:MM to 12-hour", () => {
    expect(formatTime("07:30")).toBe("7:30 AM");
    expect(formatTime("13:00")).toBe("1:00 PM");
    expect(formatTime("00:00")).toBe("12:00 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
  });
});

describe("theme config", () => {
  it("has all expected accents", () => {
    const ids = ACCENTS.map((a) => a.id);
    expect(ids).toContain("blue");
    expect(ids).toContain("violet");
    expect(ids).toContain("cyan");
  });

  it("resolveMode handles system preference", () => {
    expect(resolveMode("light")).toBe("light");
    expect(resolveMode("dark")).toBe("dark");
  });
});

describe("habits", () => {
  it("makeHabit creates a valid habit from form values", () => {
    const h = makeHabit({
      name: "Test habit",
      category: "Health",
      recurrence: { kind: "daily" },
      repeatDays: [],
      priority: "med",
    });
    expect(h.name).toBe("Test habit");
    expect(h.category).toBe("Health");
    expect(h.id).toBeTruthy();
    expect(h.createdAt).toBeTruthy();
  });

  it("applyHabitForm preserves id and createdAt", () => {
    const base = makeHabit({
      name: "Original",
      category: "Workout",
      recurrence: { kind: "daily" },
      repeatDays: [],
      priority: "low",
    });
    const updated = applyHabitForm(base, {
      name: "Updated",
      category: "Health",
      recurrence: { kind: "weekly", weekdays: [1, 3, 5] },
      repeatDays: [1, 3, 5],
      priority: "high",
    });
    expect(updated.id).toBe(base.id);
    expect(updated.createdAt).toBe(base.createdAt);
    expect(updated.name).toBe("Updated");
    expect(updated.category).toBe("Health");
  });
});

describe("XP & leveling", () => {
  it("xpToAdvance produces increasing values", () => {
    const v1 = xpToAdvance(1);
    const v2 = xpToAdvance(2);
    const v10 = xpToAdvance(10);
    expect(v1).toBeGreaterThan(0);
    expect(v2).toBeGreaterThan(v1);
    expect(v10).toBeGreaterThan(v2);
  });

  it("levelInfo returns level 1 for 0 XP", () => {
    const info = levelInfo(0);
    expect(info.level).toBe(1);
  });

  it("levelInfo gives correct level for known XP", () => {
    // At level 1, xpToAdvance(1) ≈ 100. So 150 XP = level 2.
    const info = levelInfo(150);
    expect(info.level).toBeGreaterThanOrEqual(2);
    expect(info.progressPct).toBeGreaterThanOrEqual(0);
  });
});

describe("achievement engine", () => {
  it("RARITY_ORDER is defined for all rarities", () => {
    expect(RARITY_ORDER.common).toBe(0);
    expect(RARITY_ORDER.legendary).toBe(3);
  });

  it("evaluateAchievements returns all achievements", () => {
    const results = evaluateAchievements({
      doneCount: 0,
      missedCount: 0,
      perCategoryDone: Object.fromEntries(CATEGORIES.map((c) => [c, 0])),
      earlyDone: 0,
      nightDone: 0,
      maxBestStreak: 0,
      maxCurrentStreak: 0,
      perfectDays: 0,
      longestPerfectRun: 0,
      weekendPerfectDays: 0,
      habitsCreated: 0,
      comebackAchieved: false,
    });
    expect(results.length).toBeGreaterThan(20);
  });
});

describe("economy", () => {
  it("SHOP_ITEMS has entries", () => {
    expect(SHOP_ITEMS.length).toBeGreaterThan(10);
  });

  it("FREEZE_PRICE is positive", () => {
    expect(FREEZE_PRICE).toBeGreaterThan(0);
  });
});

describe("titles and ranks", () => {
  it("TITLES is ordered by minLevel ascending", () => {
    for (let i = 1; i < TITLES.length; i++) {
      expect(TITLES[i].minLevel).toBeGreaterThanOrEqual(TITLES[i - 1].minLevel);
    }
  });

  it("titleForLevel returns the correct title", () => {
    const info = titleForLevel(1);
    expect(info.current.name).toBe("Habit Newbie");
    expect(info.current.rank).toBe("Beginner");
  });

  it("RANK_STYLE has all ranks", () => {
    expect(RANK_STYLE.Beginner).toBeTruthy();
    expect(RANK_STYLE.Legendary).toBeTruthy();
  });

  it("RANK_ORDER is ascending", () => {
    expect(RANK_ORDER.Beginner).toBeLessThan(RANK_ORDER.Legendary);
  });
});

describe("rarity styles", () => {
  it("RARITY_STYLE has all rarities", () => {
    expect(RARITY_STYLE.common).toBeTruthy();
    expect(RARITY_STYLE.legendary).toBeTruthy();
  });
});

describe("templates", () => {
  it("TEMPLATES has pre-built routines", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(5);
    const names = TEMPLATES.map((t) => t.name);
    expect(names).toContain("Gym Routine");
    expect(names).toContain("Morning Routine");
  });
});
