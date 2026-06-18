import { describe, it, expect } from "vitest";
import type { Economy, Marks, Rarity } from "./types";
import type { GameStats } from "./achievements";
import {
  COINS_PER_COMPLETION,
  COINS_PER_PERFECT_DAY,
  RARITY_COINS,
  coinsEarned,
  coinsSpent,
  coinBalance,
  coinBreakdown,
  equippedOrDefault,
  freezesUsedInWindow,
  canUseFreeze,
  canFreezeDay,
  freezableDays,
  frozenSet,
  isFrozen,
  FREEZE_MAX_PER_WINDOW,
} from "./economy";

// --- helpers ---------------------------------------------------------------

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
    anyMissed: false,
    comebackAchieved: false,
    ...over,
  };
}

function economy(over: Partial<Economy> = {}): Economy {
  return {
    spent: [], owned: [], equipped: {}, freezes: [],
    bonusCoins: 0, lastCheckIn: null, checkInStreak: 0, lastQuestDate: null, currentQuest: null, lastSpinDate: null,
    ...over,
  };
}

const D = (s: string) => new Date(`${s}T12:00:00`);

// --- earning ---------------------------------------------------------------

describe("coinsEarned", () => {
  it("pays per completion and per perfect day", () => {
    expect(coinsEarned(stats({ doneCount: 5, perfectDays: 2 }), [])).toBe(
      5 * COINS_PER_COMPLETION + 2 * COINS_PER_PERFECT_DAY,
    );
  });

  it("adds rarity bonuses for unlocked achievements", () => {
    const earned = coinsEarned(stats({ doneCount: 1 }), ["common", "legendary"]);
    expect(earned).toBe(COINS_PER_COMPLETION + RARITY_COINS.common + RARITY_COINS.legendary);
  });

  it("is zero for an empty history", () => {
    expect(coinsEarned(stats(), [])).toBe(0);
  });
});

// --- coinBreakdown ---------------------------------------------------------

describe("coinBreakdown", () => {
  it("itemizes the derivation and reconciles to balance", () => {
    const eco = economy({ spent: [{ id: "a", at: "x", amount: 75, item: "freeze" }] });
    const b = coinBreakdown(stats({ doneCount: 10, perfectDays: 3 }), ["rare"], eco);
    expect(b.fromCompletions).toBe(20); // 10 × 2
    expect(b.fromPerfectDays).toBe(30); // 3 × 10
    expect(b.fromAchievements).toBe(RARITY_COINS.rare); // 30
    expect(b.earned).toBe(20 + 30 + RARITY_COINS.rare);
    expect(b.spent).toBe(75);
    expect(b.balance).toBe(b.earned - 75);
  });

  it("agrees with coinsEarned / coinBalance", () => {
    const eco = economy({ spent: [{ id: "a", at: "x", amount: 40, item: "flame-azure" }] });
    const s = stats({ doneCount: 7, perfectDays: 1 });
    const rarities: Rarity[] = ["common", "epic"];
    const b = coinBreakdown(s, rarities, eco);
    expect(b.earned).toBe(coinsEarned(s, rarities));
    expect(b.balance).toBe(coinBalance(b.earned, eco));
  });

  it("clamps balance at zero when overspent", () => {
    const eco = economy({ spent: [{ id: "a", at: "x", amount: 999, item: "z" }] });
    expect(coinBreakdown(stats({ doneCount: 1 }), [], eco).balance).toBe(0);
  });
});

// --- balance ---------------------------------------------------------------

describe("coinBalance", () => {
  it("is earned minus the spend ledger", () => {
    const eco = economy({
      spent: [
        { id: "a", at: "2026-06-10T00:00:00.000Z", amount: 30, item: "flame-azure" },
        { id: "b", at: "2026-06-11T00:00:00.000Z", amount: 20, item: "freeze" },
      ],
    });
    expect(coinsSpent(eco)).toBe(50);
    expect(coinBalance(200, eco)).toBe(150);
  });

  it("clamps at zero so a corrupted ledger can't go negative", () => {
    const eco = economy({ spent: [{ id: "a", at: "x", amount: 500, item: "z" }] });
    expect(coinBalance(100, eco)).toBe(0);
  });

  it("ignores negative ledger amounts", () => {
    const eco = economy({ spent: [{ id: "a", at: "x", amount: -50, item: "z" }] });
    expect(coinsSpent(eco)).toBe(0);
  });
});

// --- cosmetics -------------------------------------------------------------

describe("equippedOrDefault", () => {
  it("falls back to the free default per slot", () => {
    expect(equippedOrDefault(economy(), "flame")).toBe("flame-default");
    expect(equippedOrDefault(economy(), "confetti")).toBe("confetti-default");
  });

  it("returns the equipped id when one is set", () => {
    const eco = economy({ equipped: { flame: "flame-azure" } });
    expect(equippedOrDefault(eco, "flame")).toBe("flame-azure");
  });
});

// --- freeze: window cap ----------------------------------------------------

describe("freeze window cap", () => {
  const now = D("2026-06-10");

  it("counts only freezes inside the rolling window", () => {
    const eco = economy({
      freezes: [
        { id: "1", at: "2026-06-09T00:00:00.000Z", date: "2026-06-08", habitId: "h1" }, // in window
        { id: "2", at: "2026-06-01T00:00:00.000Z", date: "2026-05-31", habitId: "h1" }, // >7d ago
      ],
    });
    expect(freezesUsedInWindow(eco, now)).toBe(1);
  });

  it("blocks a second freeze within the window", () => {
    const eco = economy({
      freezes: [{ id: "1", at: "2026-06-09T00:00:00.000Z", date: "2026-06-08", habitId: "h1" }],
    });
    expect(FREEZE_MAX_PER_WINDOW).toBe(1);
    expect(canUseFreeze(eco, now)).toBe(false);
  });

  it("allows a freeze once the window has cleared", () => {
    const eco = economy({
      freezes: [{ id: "1", at: "2026-06-01T00:00:00.000Z", date: "2026-05-31", habitId: "h1" }],
    });
    expect(canUseFreeze(eco, now)).toBe(true);
  });
});

// --- freeze: eligibility ---------------------------------------------------

describe("freeze eligibility", () => {
  const marks: Marks = {
    "2026-06-08": { h1: "missed" },
    "2026-06-09": { h1: "done" },
    "2026-06-07": { h1: "skipped" },
  };

  it("only a genuine recorded miss is freezable", () => {
    expect(canFreezeDay(economy(), marks, "h1", "2026-06-08")).toBe(true); // missed
    expect(canFreezeDay(economy(), marks, "h1", "2026-06-09")).toBe(false); // done
    expect(canFreezeDay(economy(), marks, "h1", "2026-06-07")).toBe(false); // skipped
    expect(canFreezeDay(economy(), marks, "h1", "2026-06-06")).toBe(false); // unmarked
  });

  it("a day already frozen can't be frozen again", () => {
    const eco = economy({
      freezes: [{ id: "1", at: "2026-06-08T10:00:00.000Z", date: "2026-06-08", habitId: "h1" }],
    });
    expect(canFreezeDay(eco, marks, "h1", "2026-06-08")).toBe(false);
  });

  it("freezableDays lists genuine misses in the lookback, newest first, excluding frozen", () => {
    const m: Marks = {
      "2026-06-09": { h1: "missed" },
      "2026-06-07": { h1: "missed" },
      "2026-06-05": { h1: "done" },
    };
    const eco = economy({
      freezes: [{ id: "1", at: "x", date: "2026-06-07", habitId: "h1" }],
    });
    // 06-09 missed & not frozen -> eligible; 06-07 frozen -> excluded.
    expect(freezableDays(eco, m, "h1", D("2026-06-10"))).toEqual(["2026-06-09"]);
  });
});

// --- frozenSet -------------------------------------------------------------

describe("frozenSet", () => {
  it("keys by habitId@date for O(1) streak-walk lookup", () => {
    const eco = economy({
      freezes: [{ id: "1", at: "x", date: "2026-06-08", habitId: "h1" }],
    });
    const set = frozenSet(eco);
    expect(isFrozen(set, "h1", "2026-06-08")).toBe(true);
    expect(isFrozen(set, "h2", "2026-06-08")).toBe(false);
  });
});
