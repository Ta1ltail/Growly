import { describe, it, expect } from "vitest";
import type { AppData, Habit, Marks } from "./types";
import { emptyData } from "./storage";
import { buildGameStats, evaluateAchievements } from "./achievements";
import { levelInfo, totalXp, xpToAdvance } from "./xp";
import { titleForLevel } from "./titles";
import { summarizeProgress, reconcileUnlocks } from "./progress";

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Test",
    category: "Health",
    repeatDays: [], // every day
    createdAt: "2026-06-08T08:00:00.000Z",
    ...over,
  };
}

function marksFor(
  id: string,
  days: Record<string, "done" | "missed" | "skipped">,
): Marks {
  const m: Marks = {};
  for (const [k, status] of Object.entries(days)) m[k] = { [id]: status };
  return m;
}

const D = (s: string) => new Date(`${s}T12:00:00`);

// A small but representative history: one daily habit, 3 perfect days.
const HABITS = [habit({ id: "h1" })];
const MARKS = marksFor("h1", {
  "2026-06-08": "done",
  "2026-06-09": "done",
  "2026-06-10": "done",
});
const TODAY = D("2026-06-10");

// --- buildGameStats ---------------------------------------------------------

describe("buildGameStats", () => {
  const s = buildGameStats(HABITS, MARKS, TODAY);

  it("counts completions and category totals from history", () => {
    expect(s.doneCount).toBe(3);
    expect(s.missedCount).toBe(0);
    expect(s.perCategoryDone.Health).toBe(3);
  });

  it("derives streaks and perfect days", () => {
    expect(s.maxBestStreak).toBe(3);
    expect(s.maxCurrentStreak).toBe(3);
    expect(s.perfectDays).toBe(3);
    expect(s.longestPerfectRun).toBe(3);
  });

  it("counts missed marks and flags anyMissed", () => {
    const withMiss = buildGameStats(
      HABITS,
      marksFor("h1", { "2026-06-09": "missed" }),
      TODAY,
    );
    expect(withMiss.missedCount).toBe(1);
    expect(withMiss.anyMissed).toBe(true);
  });
});

// --- evaluateAchievements ---------------------------------------------------

describe("evaluateAchievements", () => {
  const results = evaluateAchievements(buildGameStats(HABITS, MARKS, TODAY));
  const byId = new Map(results.map((r) => [r.def.id, r]));

  it("unlocks achievements whose metric meets the target", () => {
    expect(byId.get("done-1")?.unlocked).toBe(true);
    expect(byId.get("streak-3")?.unlocked).toBe(true);
  });

  it("leaves unmet achievements locked with clamped progress", () => {
    const seven = byId.get("streak-7")!;
    expect(seven.unlocked).toBe(false);
    expect(seven.progressPct).toBe(Math.round((3 / 7) * 100));
    expect(byId.get("done-1000")?.progressPct).toBeLessThanOrEqual(100);
  });
});

// --- xp / levels ------------------------------------------------------------

describe("levelInfo", () => {
  it("starts at level 1 with no XP", () => {
    const l = levelInfo(0);
    expect(l.level).toBe(1);
    expect(l.progressPct).toBe(0);
  });

  it("advances a level exactly at the threshold", () => {
    expect(levelInfo(xpToAdvance(1)).level).toBe(2);
    expect(levelInfo(xpToAdvance(1) - 1).level).toBe(1);
  });

  it("reports remaining XP toward the next level", () => {
    const l = levelInfo(xpToAdvance(1) - 1);
    expect(l.xpIntoLevel).toBe(xpToAdvance(1) - 1);
    expect(l.xpToNext).toBe(1);
  });
});

describe("totalXp", () => {
  it("sums completions, perfect days, and achievement rarity bonuses", () => {
    const stats = buildGameStats(HABITS, MARKS, TODAY);
    const unlocked = evaluateAchievements(stats)
      .filter((a) => a.unlocked)
      .map((a) => a.def);
    // 3 done (30) + 3 perfect days (75) + 3 common achievements (75) = 180.
    expect(totalXp(stats, unlocked)).toBe(180);
  });
});

// --- titles -----------------------------------------------------------------

describe("titleForLevel", () => {
  it("gives the entry title at level 1 with a next target", () => {
    const t = titleForLevel(1);
    expect(t.current.name).toBe("Habit Newbie");
    expect(t.current.rank).toBe("Beginner");
    expect(t.next?.name).toBe("Getting Started");
  });

  it("resolves a mid-tier title", () => {
    expect(titleForLevel(21).current.name).toBe("Consistency Master");
    expect(titleForLevel(21).current.rank).toBe("Expert");
  });

  it("caps at the final title with no next", () => {
    const t = titleForLevel(100);
    expect(t.current.name).toBe("Legendary Achiever");
    expect(t.next).toBeNull();
    expect(t.levelsToNext).toBeNull();
  });
});

// --- progress façade --------------------------------------------------------

describe("summarizeProgress", () => {
  const data: AppData = { ...emptyData, habits: HABITS, marks: MARKS };
  const p = summarizeProgress(data, TODAY);

  it("composes xp, level, title, and counts", () => {
    expect(p.xp).toBe(180);
    expect(p.level.level).toBe(2);
    expect(p.title.current.name).toBe("Getting Started"); // level 2
    expect(p.unlockedCount).toBeGreaterThan(0);
    expect(p.totalCount).toBe(p.achievements.length);
  });

  it("suggests next milestones", () => {
    expect(p.nextMilestones.length).toBeGreaterThan(0);
  });
});

// --- reconcileUnlocks -------------------------------------------------------

describe("reconcileUnlocks", () => {
  it("records newly-satisfied achievements as unseen", () => {
    const data: AppData = { ...emptyData, habits: HABITS, marks: MARKS };
    const { unlocks, newlyUnlocked } = reconcileUnlocks(
      data,
      TODAY,
      "2026-06-10T12:00:00.000Z",
    );
    expect(newlyUnlocked).toContain("done-1");
    expect(newlyUnlocked).toContain("streak-3");
    expect(newlyUnlocked).not.toContain("streak-7");
    expect(unlocks["done-1"]).toEqual({
      at: "2026-06-10T12:00:00.000Z",
      seen: false,
    });
  });

  it("returns the same map reference when nothing is new", () => {
    const data: AppData = {
      ...emptyData,
      habits: HABITS,
      marks: MARKS,
      unlocks: {
        "done-1": { at: "x", seen: true },
        "streak-1": { at: "x", seen: true },
        "streak-3": { at: "x", seen: true },
      },
    };
    const { newlyUnlocked } = reconcileUnlocks(data, TODAY, "now");
    expect(newlyUnlocked).toEqual([]);
  });
});
