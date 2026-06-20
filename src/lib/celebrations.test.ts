import { describe, it, expect } from "vitest";
import type { AppData, Habit, Marks } from "./types";
import { emptyData, addDays, dateKey } from "./storage";
import { summarizeProgress } from "./progress";
import {
  achievementEvents,
  baselineProgressSeen,
  buildCelebrationQueue,
  progressEvents,
  streakTier,
} from "./celebrations";

const D = (s: string) => new Date(`${s}T12:00:00`);

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Test",
    category: "Health",
    repeatDays: [],
    createdAt: "2026-06-08T08:00:00.000Z",
    ...over,
  };
}

function appData(over: Partial<AppData> = {}): AppData {
  return { ...emptyData, ...over };
}

// N consecutive "done" days ending at (and including) `today`.
function doneRun(id: string, today: Date, n: number): Marks {
  const m: Marks = {};
  for (let i = 0; i < n; i++) m[dateKey(addDays(today, -i))] = { [id]: "done" };
  return m;
}

// --- streakTier -------------------------------------------------------------

describe("streakTier", () => {
  it("returns the highest milestone reached", () => {
    expect(streakTier(6)).toBe(0);
    expect(streakTier(7)).toBe(7);
    expect(streakTier(13)).toBe(7);
    expect(streakTier(14)).toBe(14);
    expect(streakTier(29)).toBe(14);
    expect(streakTier(30)).toBe(30);
    expect(streakTier(49)).toBe(30);
    expect(streakTier(50)).toBe(50);
    expect(streakTier(100)).toBe(100);
    expect(streakTier(400)).toBe(365);
  });
});

// --- level up / title -------------------------------------------------------

describe("progressEvents — level & title", () => {
  const today = D("2026-06-10");
  const h = habit({ id: "h1", startDate: "2026-06-08" });
  const marks = doneRun("h1", today, 3); // → level 2, title "Getting Started"

  it("fixture reaches level 2 / Getting Started", () => {
    const s = summarizeProgress(appData({ habits: [h], marks }), today);
    expect(s.level.level).toBe(2);
    expect(s.title.current.name).toBe("Getting Started");
  });

  it("emits a level-up for the current level when unseen", () => {
    const data = appData({ habits: [h], marks }); // seen.level defaults to 1
    expect(
      progressEvents(data, today).find((e) => e.kind === "levelup")?.level,
    ).toBe(2);
  });

  it("suppresses the level-up once seen covers it", () => {
    const data = appData({
      habits: [h],
      marks,
      progressSeen: { ...emptyData.progressSeen, level: 2 },
    });
    expect(progressEvents(data, today).some((e) => e.kind === "levelup")).toBe(
      false,
    );
  });

  it("emits a new-title event, suppressed once seen", () => {
    const data = appData({ habits: [h], marks });
    expect(
      progressEvents(data, today).find((e) => e.kind === "title")?.titleName,
    ).toBe("Getting Started");
    const seen = appData({
      habits: [h],
      marks,
      progressSeen: { ...emptyData.progressSeen, title: "Getting Started" },
    });
    expect(progressEvents(seen, today).some((e) => e.kind === "title")).toBe(
      false,
    );
  });
});

// --- streak milestones ------------------------------------------------------

describe("progressEvents — streaks", () => {
  const today = D("2026-06-30");
  const h = habit({ id: "h1", startDate: dateKey(addDays(today, -6)) });
  const marks = doneRun("h1", today, 7); // current streak = 7

  it("fires a streak event at a milestone tier", () => {
    const ev = progressEvents(appData({ habits: [h], marks }), today).find(
      (e) => e.kind === "streak",
    );
    expect(ev?.tier).toBe(7);
    expect(ev?.habitId).toBe("h1");
  });

  it("suppresses a streak already celebrated at that tier", () => {
    const data = appData({
      habits: [h],
      marks,
      progressSeen: { ...emptyData.progressSeen, streaks: { h1: 7 } },
    });
    expect(progressEvents(data, today).some((e) => e.kind === "streak")).toBe(
      false,
    );
  });
});

// --- shop unlocks (level-gated) + baseline ----------------------------------

describe("progressEvents — shop unlocks & baseline", () => {
  const today = D("2026-06-30");
  const DAYS = 250;
  const start = dateKey(addDays(today, -(DAYS - 1)));
  const h = habit({
    id: "h1",
    startDate: start,
    createdAt: new Date(addDays(today, -(DAYS - 1))).toISOString(),
  });
  const marks = doneRun("h1", today, DAYS); // deep perfect history → high level
  const data = appData({ habits: [h], marks });

  it("reaches at least level 10 (unlocks every gated item)", () => {
    expect(summarizeProgress(data, today).level.level).toBeGreaterThanOrEqual(
      10,
    );
  });

  it("emits a shop event per newly-unlocked level-gated item", () => {
    const ids = progressEvents(data, today)
      .filter((e) => e.kind === "shop")
      .map((e) => e.shopId);
    expect(ids).toContain("confetti-fire"); // minLevel 5
    expect(ids).toContain("accent-amber"); // minLevel 8
    expect(ids).toContain("flame-gold"); // minLevel 10
  });

  it("baselineProgressSeen yields a queue with no progress events", () => {
    const based = appData({
      habits: [h],
      marks,
      progressSeen: baselineProgressSeen(data, today),
    });
    expect(progressEvents(based, today)).toEqual([]);
  });
});

// --- achievements + queue order ---------------------------------------------

describe("achievementEvents & buildCelebrationQueue", () => {
  it("only emits unseen unlocks", () => {
    const data = appData({
      unlocks: {
        "streak-7": { at: "x", seen: false },
        "done-1": { at: "y", seen: true },
      },
    });
    const evs = achievementEvents(data);
    expect(evs).toHaveLength(1);
    expect(evs[0].achievementId).toBe("streak-7");
    expect(evs[0].kind).toBe("achievement");
  });

  it("orders achievements ahead of progression events", () => {
    const today = D("2026-06-10");
    const h = habit({ id: "h1", startDate: "2026-06-08" });
    const data = appData({
      habits: [h],
      marks: doneRun("h1", today, 3),
      unlocks: { "streak-3": { at: "x", seen: false } },
    });
    expect(buildCelebrationQueue(data, today)[0].kind).toBe("achievement");
  });
});
