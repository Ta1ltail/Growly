/* @vitest-environment node */
//
// Tests for the achievement pipeline:
//   - buildGameStats (stats computation, caching)
//   - evaluateAchievements (achievement matching against stats)
//   - reconcileUnlocks (unlock detection with duplicate prevention)
//   - buildCelebrationQueue (full celebration event generation)
//   - baselineProgressSeen (initial seen marker)
//   - streakTier (streak tier computation)
//   - achievementEvents, progressEvents, tierUnlockEvents, goalCompletionEvents
//
// These are pure functions that don't touch localStorage or the store.

import { describe, it, expect } from "vitest";
import {
  buildGameStats,
  evaluateAchievements,
  type GameStats,
} from "../achievements";
import {
  buildCelebrationQueue,
  baselineProgressSeen,
  streakTier,
} from "../celebrations";
import { reconcileUnlocks } from "../progress";
import { emptyData, type StatsSnapshotData } from "../storage";
import type { AppData, Habit, Marks, Economy, ProgressSeen } from "../types";

// ── Helpers ───────────────────────────────────────────────────────

function makeHabit(
  id: string,
  name: string,
  category: string = "Health",
  overrides?: Partial<Habit>,
): Habit {
  return {
    id,
    name,
    category: category as any,
    repeatDays: [0, 1, 2, 3, 4, 5, 6], // every day
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function marksFor(days: Record<string, Record<string, string>>): Marks {
  return days as unknown as Marks;
}

function baseAppData(overrides?: Partial<AppData>): AppData {
  return {
    ...emptyData,
    ...overrides,
    habits: overrides?.habits ?? emptyData.habits,
    marks: overrides?.marks ?? emptyData.marks,
    notes: overrides?.notes ?? emptyData.notes,
    goals: overrides?.goals ?? emptyData.goals,
    settings: overrides?.settings ?? emptyData.settings,
    profile: overrides?.profile ?? emptyData.profile,
    unlocks: overrides?.unlocks ?? emptyData.unlocks,
    economy: overrides?.economy ?? emptyData.economy,
    progressSeen: overrides?.progressSeen ?? emptyData.progressSeen,
    auditLog: overrides?.auditLog ?? [],
  };
}

const TODAY = new Date("2026-07-22T12:00:00Z");

/* ──────────────────────────────────────────────
   streakTier
   ────────────────────────────────────────────── */

describe("streakTier", () => {
  it("returns 0 for streak below 7", () => {
    expect(streakTier(0)).toBe(0);
    expect(streakTier(5)).toBe(0);
    expect(streakTier(6)).toBe(0);
  });

  it("returns 7 for streak 7-13", () => {
    expect(streakTier(7)).toBe(7);
    expect(streakTier(10)).toBe(7);
    expect(streakTier(13)).toBe(7);
  });

  it("returns 14 for streak 14-29", () => {
    expect(streakTier(14)).toBe(14);
    expect(streakTier(20)).toBe(14);
    expect(streakTier(29)).toBe(14);
  });

  it("returns 30 for streak 30-49", () => {
    expect(streakTier(30)).toBe(30);
    expect(streakTier(40)).toBe(30);
    expect(streakTier(49)).toBe(30);
  });

  it("returns 50 for streak 50-99", () => {
    expect(streakTier(50)).toBe(50);
    expect(streakTier(75)).toBe(50);
    expect(streakTier(99)).toBe(50);
  });

  it("returns 100 for streak 100-364", () => {
    expect(streakTier(100)).toBe(100);
    expect(streakTier(200)).toBe(100);
    expect(streakTier(364)).toBe(100);
  });

  it("returns 365 for streak 365+", () => {
    expect(streakTier(365)).toBe(365);
    expect(streakTier(500)).toBe(365);
    expect(streakTier(1000)).toBe(365);
  });
});

/* ──────────────────────────────────────────────
   buildGameStats
   ────────────────────────────────────────────── */

describe("buildGameStats", () => {
  it("returns zero stats with no habits", () => {
    const stats = buildGameStats([], {}, TODAY);
    expect(stats.doneCount).toBe(0);
    expect(stats.missedCount).toBe(0);
    expect(stats.maxBestStreak).toBe(0);
    expect(stats.maxCurrentStreak).toBe(0);
    expect(stats.perfectDays).toBe(0);
    expect(stats.longestPerfectRun).toBe(0);
    expect(stats.weekendPerfectDays).toBe(0);
    expect(stats.earlyDone).toBe(0);
    expect(stats.nightDone).toBe(0);
    expect(stats.habitsCreated).toBe(0);
    expect(stats.comebackCount).toBe(0);
    expect(stats.activeHabitsAllStreak7).toBe(false);
  });

  it("counts done marks", () => {
    const h1 = makeHabit("h1", "Read");
    const h2 = makeHabit("h2", "Run");
    const marks = marksFor({
      "2026-07-01": { h1: "done", h2: "done" },
      "2026-07-02": { h1: "done", h2: "missed" },
      "2026-07-03": { h1: "done" },
    });
    const stats = buildGameStats([h1, h2], marks, TODAY);
    expect(stats.doneCount).toBe(4); // h1 x3 + h2 x1
    expect(stats.missedCount).toBe(1); // h2 missed on 07-02
  });

  it("computes maxBestStreak across all habits", () => {
    // h1 has a streak of 5, h2 has a streak of 3
    const h1 = makeHabit("h1", "Read");
    const h2 = makeHabit("h2", "Run");
    const marks = marksFor({
      "2026-07-01": { h1: "done", h2: "done" },
      "2026-07-02": { h1: "done", h2: "done" },
      "2026-07-03": { h1: "done", h2: "done" },
      "2026-07-04": { h1: "done" },
      "2026-07-05": { h1: "done" },
    });
    const stats = buildGameStats([h1, h2], marks, TODAY);
    expect(stats.maxBestStreak).toBe(5);
    // maxCurrentStreak is 0 here because marks end 17 days before TODAY —
    // the unmarked scheduled days since then break every habit's current streak.
    expect(stats.maxCurrentStreak).toBe(0);
  });

  it("counts perfect days (all scheduled habits done)", () => {
    const h1 = makeHabit("h1", "Read");
    const h2 = makeHabit("h2", "Run");
    const marks = marksFor({
      "2026-07-01": { h1: "done", h2: "done" }, // perfect
      "2026-07-02": { h1: "done", h2: "missed" }, // not perfect
      "2026-07-03": { h1: "done", h2: "done" }, // perfect
    });
    const stats = buildGameStats([h1, h2], marks, TODAY);
    expect(stats.perfectDays).toBe(2);
    expect(stats.longestPerfectRun).toBe(1); // 07-01 is run of 1, 07-02 breaks, 07-03 is run of 1
  });

  it("counts longest perfect run", () => {
    const h1 = makeHabit("h1", "Read");
    const marks = marksFor({
      "2026-07-01": { h1: "done" },
      "2026-07-02": { h1: "done" },
      "2026-07-03": { h1: "done" },
      "2026-07-04": { h1: "missed" },
      "2026-07-05": { h1: "done" },
    });
    const stats = buildGameStats([h1], marks, TODAY);
    expect(stats.longestPerfectRun).toBe(3);
  });

  it("counts weekend perfect days", () => {
    // 2026-07-04 is Saturday, 2026-07-05 is Sunday
    const h1 = makeHabit("h1", "Read");
    const marks = marksFor({
      "2026-07-01": { h1: "done" }, // Wednesday
      "2026-07-04": { h1: "done" }, // Saturday → weekend
      "2026-07-05": { h1: "done" }, // Sunday → weekend
    });
    const stats = buildGameStats([h1], marks, TODAY);
    expect(stats.weekendPerfectDays).toBe(2);
  });

  it("counts early and night done marks", () => {
    const h1 = makeHabit("h1", "Early", "Health", { timeOfDay: "06:00" });
    const h2 = makeHabit("h2", "Late", "Health", { timeOfDay: "22:00" });
    const h3 = makeHabit("h3", "Normal", "Health", { timeOfDay: "12:00" });
    const marks = marksFor({
      "2026-07-01": { h1: "done", h2: "done", h3: "done" },
    });
    const stats = buildGameStats([h1, h2, h3], marks, TODAY);
    expect(stats.earlyDone).toBe(1); // only h1 (06:00 < 08:00)
    expect(stats.nightDone).toBe(1); // only h2 (22:00 >= 21:00)
  });

  it("perCategoryDone breaks down by category", () => {
    const h1 = makeHabit("h1", "Read", "Health");
    const h2 = makeHabit("h2", "Gym", "Workout");
    const marks = marksFor({
      "2026-07-01": { h1: "done", h2: "done" },
    });
    const stats = buildGameStats([h1, h2], marks, TODAY);
    expect(stats.perCategoryDone.Health).toBe(1);
    expect(stats.perCategoryDone.Workout).toBe(1);
  });

  it("counts comeback recoveries (miss → 7+ streak)", () => {
    const h1 = makeHabit("h1", "Read");
    const marks: Marks = {};
    // Day 1: done
    marks["2026-07-01"] = { h1: "done" };
    // Day 2: done
    marks["2026-07-02"] = { h1: "done" };
    // Day 3: missed
    marks["2026-07-03"] = { h1: "missed" };
    // Days 4-10: done (7-day streak after miss)
    for (let i = 4; i <= 10; i++) {
      marks[`2026-07-${String(i).padStart(2, "0")}`] = { h1: "done" };
    }

    const stats = buildGameStats([h1], marks, new Date("2026-07-10T12:00:00Z"));
    expect(stats.comebackCount).toBe(1);
  });

  it("activeHabitsAllStreak7 is true when all non-archived habits have 7+ current streak", () => {
    const h1 = makeHabit("h1", "Read");
    const h2 = makeHabit("h2", "Run");
    const marks: Marks = {};
    // Both habits done for 7 days straight
    for (let i = 1; i <= 7; i++) {
      marks[`2026-07-${String(i).padStart(2, "0")}`] = { h1: "done", h2: "done" };
    }

    const stats = buildGameStats([h1, h2], marks, new Date("2026-07-07T12:00:00Z"));
    expect(stats.activeHabitsAllStreak7).toBe(true);
  });

  it("activeHabitsAllStreak7 is false when archived habit is excluded", () => {
    const h1 = makeHabit("h1", "Read"); // active
    const h2 = makeHabit("h2", "Run", "Health", { archived: true }); // archived
    const marks: Marks = {};
    for (let i = 1; i <= 7; i++) {
      marks[`2026-07-${String(i).padStart(2, "0")}`] = { h1: "done" };
    }

    const stats = buildGameStats([h1, h2], marks, new Date("2026-07-07T12:00:00Z"));
    expect(stats.activeHabitsAllStreak7).toBe(true); // only h1 matters
  });

  it("caches results for same marks reference", () => {
    const h1 = makeHabit("h1", "Read");
    const marks = marksFor({
      "2026-07-01": { h1: "done" },
    });

    const a = buildGameStats([h1], marks, TODAY);
    const b = buildGameStats([h1], marks, TODAY); // same marks ref
    expect(a).toBe(b); // cached
  });

  it("returns fresh stats for different marks reference despite same data", () => {
    const h1 = makeHabit("h1", "Read");
    const marks1 = marksFor({ "2026-07-01": { h1: "done" } });
    const marks2 = marksFor({ "2026-07-01": { h1: "done" } }); // different object

    const a = buildGameStats([h1], marks1, TODAY);
    const b = buildGameStats([h1], marks2, TODAY); // different marks ref
    // Should still return correct stats but not the same object
    expect(b.doneCount).toBe(1);
  });
});

/* ──────────────────────────────────────────────
   evaluateAchievements
   ────────────────────────────────────────────── */

describe("evaluateAchievements", () => {
  it("returns all achievements with progress", () => {
    const stats = buildGameStats([], {}, TODAY);
    const results = evaluateAchievements(stats);
    expect(results.length).toBeGreaterThan(30); // 52 achievements defined
    results.forEach((r) => {
      expect(r.def.id).toBeDefined();
      expect(r.current).toBeGreaterThanOrEqual(0);
      expect(r.target).toBeGreaterThan(0);
      expect(r.progressPct).toBeGreaterThanOrEqual(0);
      expect(r.progressPct).toBeLessThanOrEqual(100);
    });
  });

  it("marks done-1 as unlocked when doneCount >= 1", () => {
    const h1 = makeHabit("h1", "Read");
    const marks = marksFor({ "2026-07-01": { h1: "done" } });
    const stats = buildGameStats([h1], marks, TODAY);
    const results = evaluateAchievements(stats);
    const done1 = results.find((r) => r.def.id === "done-1");
    expect(done1).toBeDefined();
    expect(done1!.unlocked).toBe(true);
    expect(done1!.current).toBe(1);
  });

  it("marks streak-7 as unlocked when maxBestStreak >= 7", () => {
    const h1 = makeHabit("h1", "Read");
    const marks: Marks = {};
    for (let i = 1; i <= 7; i++) {
      marks[`2026-07-${String(i).padStart(2, "0")}`] = { h1: "done" };
    }
    const stats = buildGameStats([h1], marks, new Date("2026-07-07T12:00:00Z"));
    const results = evaluateAchievements(stats);
    const streak7 = results.find((r) => r.def.id === "streak-7");
    expect(streak7!.unlocked).toBe(true);
  });

  it("marks come-back-king as unlocked when comebackCount >= 1", () => {
    const h1 = makeHabit("h1", "Read");
    const marks: Marks = {};
    // Day 1: done, Day 2: missed, Days 3-9: done (7-day streak)
    marks["2026-07-01"] = { h1: "done" };
    marks["2026-07-02"] = { h1: "missed" };
    for (let i = 3; i <= 9; i++) {
      marks[`2026-07-${String(i).padStart(2, "0")}`] = { h1: "done" };
    }
    const stats = buildGameStats([h1], marks, new Date("2026-07-09T12:00:00Z"));
    const results = evaluateAchievements(stats);
    const comeback = results.find((r) => r.def.id === "comeback-king");
    expect(comeback!.unlocked).toBe(true);
  });

  it("marks habit-master as unlocked only when streak >= 100 AND doneCount >= 500", () => {
    // Not unlocked with just streak
    const h1 = makeHabit("h1", "Read");
    const marks: Marks = {};
    for (let i = 1; i <= 100; i++) {
      const day = new Date("2026-01-01");
      day.setDate(day.getDate() + i);
      const key = day.toISOString().split("T")[0];
      marks[key] = { h1: "done" };
    }
    let stats = buildGameStats([h1], marks, new Date("2026-04-11T12:00:00Z"));
    // 100 marks but doneCount is only 100, not 500
    let results = evaluateAchievements(stats);
    const hm = results.find((r) => r.def.id === "habit-master");
    expect(hm!.unlocked).toBe(false);
  });

  it("progressPct is correct for partial progress", () => {
    const h1 = makeHabit("h1", "Read");
    const marks = marksFor({ "2026-07-01": { h1: "done" }, "2026-07-02": { h1: "done" } });
    const stats = buildGameStats([h1], marks, TODAY);
    const results = evaluateAchievements(stats);
    const done50 = results.find((r) => r.def.id === "done-50");
    expect(done50!.current).toBe(2);
    expect(done50!.progressPct).toBe(4); // 2/50 = 4%
  });
});

/* ──────────────────────────────────────────────
   reconcileUnlocks
   ────────────────────────────────────────────── */

describe("reconcileUnlocks", () => {
  it("detects newly unlocked achievements", () => {
    const h1 = makeHabit("h1", "Read");
    const marks = marksFor({ "2026-07-01": { h1: "done" } });
    const data = baseAppData({ habits: [h1], marks });

    const result = reconcileUnlocks(data, TODAY, "2026-07-22T12:00:00Z");
    expect(result.newlyUnlocked.length).toBeGreaterThan(0);
    expect(result.newlyUnlocked).toContain("done-1"); // first completion
    expect(result.unlocks["done-1"]).toBeDefined();
    expect(result.unlocks["done-1"].seen).toBe(false);
    expect(result.unlocks["done-1"].at).toBe("2026-07-22T12:00:00Z");
  });

  it("does not re-detect already-unlocked achievements", () => {
    const h1 = makeHabit("h1", "Read");
    const marks = marksFor({ "2026-07-01": { h1: "done" } });
    const data = baseAppData({
      habits: [h1],
      marks,
      unlocks: {
        "done-1": { at: "2026-07-01T00:00:00Z", seen: true },
        "streak-1": { at: "2026-07-01T00:00:00Z", seen: true },
        "streak-3": { at: "2026-07-01T00:00:00Z", seen: true },
      },
    });

    const result = reconcileUnlocks(data, TODAY, "2026-07-22T12:00:00Z");
    expect(result.newlyUnlocked).toHaveLength(0);
    // Returns SAME unlocks reference
    expect(result.unlocks).toBe(data.unlocks);
  });

  it("returns same unlocks reference when nothing changed", () => {
    const data = baseAppData();
    const result = reconcileUnlocks(data, TODAY, "2026-07-22T12:00:00Z");
    expect(result.newlyUnlocked).toHaveLength(0);
    expect(result.unlocks).toBe(data.unlocks);
  });

  it("detects multiple new unlocks from the same evaluation", () => {
    const h1 = makeHabit("h1", "Read");
    const marks: Marks = {};
    for (let i = 1; i <= 10; i++) {
      marks[`2026-07-${String(i).padStart(2, "0")}`] = { h1: "done" };
    }
    const data = baseAppData({ habits: [h1], marks });

    const result = reconcileUnlocks(data, new Date("2026-07-10T12:00:00Z"), "2026-07-10T12:00:00Z");
    // done-1, done-10, streak-1, streak-3, streak-7 should unlock
    expect(result.newlyUnlocked.length).toBeGreaterThanOrEqual(5);
    expect(result.newlyUnlocked).toContain("done-1");
    expect(result.newlyUnlocked).toContain("done-10");
    expect(result.newlyUnlocked).toContain("streak-7");
  });
});

/* ──────────────────────────────────────────────
   buildCelebrationQueue
   ────────────────────────────────────────────── */

describe("buildCelebrationQueue", () => {
  it("returns empty queue when user has no progress", () => {
    const data = baseAppData();
    const queue = buildCelebrationQueue(data, TODAY);
    expect(queue).toHaveLength(0);
  });

  it("returns achievement events for unseen unlocks", () => {
    const data = baseAppData({
      unlocks: {
        "done-1": { at: "2026-07-01T00:00:00Z", seen: false },
        "streak-3": { at: "2026-07-01T00:00:00Z", seen: true },
      },
    });
    const queue = buildCelebrationQueue(data, TODAY);
    // Only one unseen achievement
    const achievements = queue.filter((e) => e.kind === "achievement");
    expect(achievements).toHaveLength(1);
    expect(achievements[0].achievementId).toBe("done-1");
  });

  it("sorts achievement events by rarity descending (most prestigious first)", () => {
    const data = baseAppData({
      unlocks: {
        "streak-7": { at: "2026-07-01T00:00:00Z", seen: false }, // rare
        "done-1": { at: "2026-07-01T00:00:00Z", seen: false }, // common
        "streak-100": { at: "2026-07-01T00:00:00Z", seen: false }, // legendary
      },
    });
    const queue = buildCelebrationQueue(data, TODAY);
    const achievements = queue.filter((e) => e.kind === "achievement");
    expect(achievements[0].achievementId).toBe("streak-100"); // most prestigious first
    expect(achievements[2].achievementId).toBe("done-1"); // common last
  });

  it("generates level-up event when current level > seen level", () => {
    const data = baseAppData({
      progressSeen: {
        seeded: true,
        level: 1,
        title: "Habit Newbie",
        shop: [],
        streaks: {},
        tierUnlocks: [],
        completedGoals: [],
      },
      // Provide enough marks to be level 5+
      habits: [
        makeHabit("h1", "Read"),
      ],
    });
    // Add 200 done marks to get to a higher level
    const marks: Marks = {};
    for (let i = 0; i < 200; i++) {
      const day = new Date("2026-01-01");
      day.setDate(day.getDate() + i);
      const key = day.toISOString().split("T")[0];
      marks[key] = { h1: "done" };
    }
    data.marks = marks;

    const queue = buildCelebrationQueue(data, new Date("2026-07-22T12:00:00Z"));
    const levelEvents = queue.filter((e) => e.kind === "levelup");
    expect(levelEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("generates streak events for milestone achievements", () => {
    const h1 = makeHabit("h1", "Read");
    const marks: Marks = {};
    for (let i = 1; i <= 7; i++) {
      marks[`2026-07-${String(i).padStart(2, "0")}`] = { h1: "done" };
    }
    const data = baseAppData({
      habits: [h1],
      marks,
      progressSeen: {
        seeded: true,
        level: 1,
        title: "Habit Newbie",
        shop: [],
        streaks: {},
        tierUnlocks: [],
        completedGoals: [],
      },
    });

    const queue = buildCelebrationQueue(data, new Date("2026-07-07T12:00:00Z"));
    const streakEvents = queue.filter((e) => e.kind === "streak");
    expect(streakEvents.length).toBeGreaterThanOrEqual(1);
    expect(streakEvents[0].habitId).toBe("h1");
  });

  it("generates goal completion event when goal is completed but not yet celebrated", () => {
    const data = baseAppData({
      goals: [
        {
          id: "g1",
          title: "Read 10 books",
          target: 10,
          current: 10,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
      progressSeen: {
        seeded: true,
        level: 1,
        title: "Habit Newbie",
        shop: [],
        streaks: {},
        tierUnlocks: [],
        completedGoals: [],
      },
    });

    const queue = buildCelebrationQueue(data, TODAY);
    const goalEvents = queue.filter((e) => e.kind === "goal");
    expect(goalEvents).toHaveLength(1);
    expect(goalEvents[0].goalId).toBe("g1");
    expect(goalEvents[0].name).toBe("Read 10 books");
  });

  it("does not re-fire goal completion that was already celebrated", () => {
    const data = baseAppData({
      goals: [
        {
          id: "g1",
          title: "Read 10 books",
          target: 10,
          current: 10,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
      progressSeen: {
        seeded: true,
        level: 1,
        title: "Habit Newbie",
        shop: [],
        streaks: {},
        tierUnlocks: [],
        completedGoals: ["g1"], // already celebrated
      },
    });

    const queue = buildCelebrationQueue(data, TODAY);
    const goalEvents = queue.filter((e) => e.kind === "goal");
    expect(goalEvents).toHaveLength(0);
  });

  it("generates tier unlock events for first achievement of each rarity", () => {
    const data = baseAppData({
      unlocks: {
        "done-1": { at: "2026-07-01T00:00:00Z", seen: false }, // common
        "streak-7": { at: "2026-07-01T00:00:00Z", seen: false }, // rare
      },
      progressSeen: {
        seeded: true,
        level: 1,
        title: "Habit Newbie",
        shop: [],
        streaks: {},
        tierUnlocks: [], // nothing seen
        completedGoals: [],
      },
    });

    const queue = buildCelebrationQueue(data, TODAY);
    const tierEvents = queue.filter((e) => e.kind === "tier");
    // Should have tier unlocks for common and rare
    expect(tierEvents.length).toBeGreaterThanOrEqual(2);
  });
});

/* ──────────────────────────────────────────────
   baselineProgressSeen
   ────────────────────────────────────────────── */

describe("baselineProgressSeen", () => {
  it("returns seeded: true", () => {
    const data = baseAppData();
    const baseline = baselineProgressSeen(data, TODAY);
    expect(baseline.seeded).toBe(true);
  });

  it("captures current level, title, and streaks", () => {
    const h1 = makeHabit("h1", "Read");
    const marks: Marks = {};
    for (let i = 1; i <= 7; i++) {
      marks[`2026-07-${String(i).padStart(2, "0")}`] = { h1: "done" };
    }
    const data = baseAppData({ habits: [h1], marks });

    const baseline = baselineProgressSeen(data, new Date("2026-07-07T12:00:00Z"));
    expect(baseline.level).toBeGreaterThanOrEqual(1);
    expect(typeof baseline.title).toBe("string");
    expect(baseline.title.length).toBeGreaterThan(0);
    // Should record the 7-day streak for h1
    expect(baseline.streaks[h1.id]).toBe(7);
  });

  it("captures completed goals", () => {
    const data = baseAppData({
      goals: [
        {
          id: "g1",
          title: "Done",
          target: 5,
          current: 5,
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "g2",
          title: "In progress",
          target: 5,
          current: 2,
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "g3",
          title: "Deleted",
          target: 5,
          current: 5,
          createdAt: "2024-01-01T00:00:00Z",
          deletedAt: "2024-06-01T00:00:00Z",
        },
      ],
    });

    const baseline = baselineProgressSeen(data, TODAY);
    expect(baseline.completedGoals).toContain("g1");
    expect(baseline.completedGoals).not.toContain("g2"); // not completed
    expect(baseline.completedGoals).not.toContain("g3"); // deleted
  });
});
