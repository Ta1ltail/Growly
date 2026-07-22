import { describe, it, expect } from "vitest";
import { xpToAdvance, levelInfo, totalXp, RARITY_XP } from "./xp";
import type { GameStats } from "./achievements";
import type { AchievementDef } from "./types";

// --- xpToAdvance -----------------------------------------------------------

describe("xpToAdvance", () => {
  it("returns ~100 for level 1", () => {
    expect(xpToAdvance(1)).toBe(100);
  });

  it("grows super-linearly", () => {
    const l1 = xpToAdvance(1);
    const l5 = xpToAdvance(5);
    const l10 = xpToAdvance(10);
    expect(l5).toBeGreaterThan(l1);
    expect(l10).toBeGreaterThan(l5);
  });

  it("returns a rounded integer", () => {
    expect(Number.isInteger(xpToAdvance(7))).toBe(true);
  });
});

// --- totalXp ---------------------------------------------------------------

describe("totalXp", () => {
  function stats(over: Partial<GameStats> = {}): GameStats {
    return {
      doneCount: 0,
      missedCount: 0,
      perCategoryDone: {} as GameStats["perCategoryDone"],
      earlyDone: 0,
      nightDone: 0,
      maxBestStreak: 0,
      maxCurrentStreak: 0,
      perfectDays: 0,
      longestPerfectRun: 0,
      weekendPerfectDays: 0,
      habitsCreated: 0,
      comebackCount: 0,
      activeHabitsAllStreak7: false,
      ...over,
    };
  }

  it("is 0 for an empty history with no achievements", () => {
    expect(totalXp(stats(), [])).toBe(0);
  });

  it("awards 10 XP per completion", () => {
    expect(totalXp(stats({ doneCount: 5 }), [])).toBe(50);
  });

  it("awards 25 XP per perfect day", () => {
    expect(totalXp(stats({ doneCount: 0, perfectDays: 2 }), [])).toBe(50);
  });

  it("sums completions and perfect days", () => {
    expect(totalXp(stats({ doneCount: 10, perfectDays: 3 }), [])).toBe(
      10 * 10 + 3 * 25,
    );
  });

  it("adds rarity XP for unlocked achievements", () => {
    const unlocked: AchievementDef[] = [
      { id: "a", rarity: "common", name: "", description: "", category: "streak", icon: "", target: 1 },
      { id: "b", rarity: "legendary", name: "", description: "", category: "streak", icon: "", target: 1 },
    ];
    expect(totalXp(stats({ doneCount: 1 }), unlocked)).toBe(
      10 + RARITY_XP.common + RARITY_XP.legendary,
    );
  });
});

// --- levelInfo -------------------------------------------------------------

describe("levelInfo", () => {
  it("starts at level 1 with 0 XP", () => {
    const l = levelInfo(0);
    expect(l.level).toBe(1);
    expect(l.totalXp).toBe(0);
    expect(l.progressPct).toBe(0);
    expect(l.isMax).toBe(false);
  });

  it("stays at level 1 when XP is below the first threshold", () => {
    const l = levelInfo(50);
    expect(l.level).toBe(1);
    expect(l.xpIntoLevel).toBe(50);
    expect(l.xpForNext).toBe(100);
    expect(l.xpToNext).toBe(50);
  });

  it("hits exactly level 2 at the threshold", () => {
    const l = levelInfo(100);
    expect(l.level).toBe(2);
    expect(l.xpIntoLevel).toBe(0);
    expect(l.xpForNext).toBe(xpToAdvance(2));
  });

  it("reports partial progress into level 3", () => {
    const l = levelInfo(100 + 255 + 50); // level 2 (100) + level 3 (255) + 50 into Lv4
    expect(l.level).toBe(3);
    expect(l.xpIntoLevel).toBe(50);
    expect(l.xpForNext).toBe(xpToAdvance(3));
    expect(l.progressPct).toBeGreaterThan(0);
    expect(l.progressPct).toBeLessThan(100);
  });

  it("caps at MAX_LEVEL (99) and shows isMax", () => {
    // A huge XP number should max out
    const l = levelInfo(9_999_999);
    expect(l.level).toBe(99);
    expect(l.isMax).toBe(true);
    expect(l.progressPct).toBe(100);
    expect(l.xpForNext).toBe(0);
    expect(l.xpToNext).toBe(0);
  });

  it("clamps negative XP to 0", () => {
    const l = levelInfo(-100);
    expect(l.level).toBe(1);
    expect(l.totalXp).toBe(0);
  });

  it("floors fractional XP", () => {
    const l = levelInfo(99.9);
    expect(l.totalXp).toBe(99);
    expect(l.level).toBe(1);
  });

  it("computes progress percentage correctly", () => {
    // 50 XP into level 2 (which needs 255 XP to pass)
    const l = levelInfo(100 + 50); // 100 to reach level 2, then 50 into it
    expect(l.level).toBe(2);
    expect(l.xpIntoLevel).toBe(50);
    expect(l.progressPct).toBe(Math.round((50 / xpToAdvance(2)) * 100));
  });

  it("shows 100% progress at max level", () => {
    const l = levelInfo(9_999_999);
    expect(l.progressPct).toBe(100);
  });
});
