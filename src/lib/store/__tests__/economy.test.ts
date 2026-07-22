// @vitest-environment happy-dom
//
// Tests for store economy mutations — buyCosmetic, equipCosmetic,
// redeemFreeze, claimDailyCheckIn, refreshDailyQuest, claimDailyQuest.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { emptyData, saveData, loadData } from "../../storage";
import {
  reloadCache,
  setSyncCallback,
  buyCosmetic,
  equipCosmetic,
  claimDailyCheckIn,
  refreshDailyQuest,
  claimDailyQuest,
  doDailySpin,
  addHabit,
} from "../../store";
import { getSnapshot } from "../core";
import { makeHabit } from "../../habits";

function installStorage() {
  let store: Record<string, string> = {};
  const ls = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
  // @ts-expect-error
  globalThis.window = { localStorage: ls, ...globalThis.window };
}

beforeEach(() => {
  vi.clearAllMocks();
  installStorage();
  saveData(emptyData);
  reloadCache();
  setSyncCallback(null);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("claimDailyCheckIn", () => {
  it("returns reward and streak for first check-in", () => {
    const result = claimDailyCheckIn();
    expect(result.reward).toBeGreaterThan(0);
    expect(result.streak).toBe(1);
  });

  it("does not claim twice in the same day", () => {
    claimDailyCheckIn();
    const second = claimDailyCheckIn();
    expect(second.reward).toBe(0);
    expect(second.streak).toBe(0);
  });
});

describe("refreshDailyQuest", () => {
  it("generates a quest when none exists (with habits)", () => {
    // Need at least 2 non-archived habits for generateDailyQuest
    addHabit(makeHabit({ name: "A", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" }));
    addHabit(makeHabit({ name: "B", category: "Workout", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" }));

    refreshDailyQuest();
    const data = getSnapshot();
    expect(data.economy.currentQuest).toBeTruthy();
  });

  it("is idempotent — does not regenerate same-day quest", () => {
    addHabit(makeHabit({ name: "A", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" }));
    addHabit(makeHabit({ name: "B", category: "Workout", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" }));

    refreshDailyQuest();
    const quest1 = getSnapshot().economy.currentQuest;
    refreshDailyQuest();
    const quest2 = getSnapshot().economy.currentQuest;
    expect(quest2).toBe(quest1); // Same reference
  });
});

describe("claimDailyQuest", () => {
  it("is a no-op when no quest exists", () => {
    // Should not throw
    expect(() => claimDailyQuest()).not.toThrow();
  });

  it("returns early when quest current < target", () => {
    refreshDailyQuest();
    const before = getSnapshot().economy;
    claimDailyQuest();
    const after = getSnapshot().economy;
    // If the quest wasn't completed, claim is a no-op
    expect(after.currentQuest?.claimed).toBeFalsy();
  });
});

describe("doDailySpin", () => {
  it("returns a reward on first spin", () => {
    const result = doDailySpin();
    expect(result).not.toBeNull();
    expect(result!.amount).toBeGreaterThan(0);
  });

  it("returns null on second spin same day", () => {
    doDailySpin();
    const second = doDailySpin();
    expect(second).toBeNull();
  });
});

describe("buyCosmetic", () => {
  it("is a no-op for invalid itemId", () => {
    buyCosmetic("nonexistent-item");
    const data = getSnapshot();
    expect(data.economy.owned).toHaveLength(0);
  });

  it("is a no-op when already owned", () => {
    // First buy
    buyCosmetic("badge-bootcamp");
    const afterFirst = getSnapshot();
    const ownedCount = afterFirst.economy.owned.length;

    // Second buy of same item should be a no-op
    buyCosmetic("badge-bootcamp");
    const afterSecond = getSnapshot();
    expect(afterSecond.economy.owned).toHaveLength(ownedCount);
  });
});

describe("equipCosmetic", () => {
  it("is a no-op for unowned items", () => {
    equipCosmetic("badge" as any, "badge-nonexistent");
    const data = getSnapshot();
    expect((data.economy.equipped as any).badge).toBeUndefined();
  });
});
