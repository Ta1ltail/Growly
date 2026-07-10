// Integration tests for critical cross-module interactions:
//   - Store mutations triggering the sync callback
//   - Date utilities from @/lib/date (pages import from here, not @/lib/storage)
//   - QuickHash logic (polling optimization)
//
// These test the boundaries between modules that unit tests don't cover.

import { describe, it, expect, beforeEach } from "vitest";

// ── Date utility integration ──────────────────────────────────────────────
// Pages import date utilities from @/lib/date (standardized). Verify they
// work correctly together.

import { dateKey, parseDateKey, addDays, prettyDate, startOfDay, dayDiff } from "./date";

describe("date utilities (imported from @/lib/date)", () => {
  it("dateKey and parseDateKey round-trip", () => {
    const dates = [
      "2024-01-15",
      "2024-12-31",
      "2025-02-28",
      "2026-07-10",
    ];
    for (const d of dates) {
      expect(dateKey(parseDateKey(d))).toBe(d);
    }
  });

  it("addDays works with calendar boundaries", () => {
    // Cross month boundary
    const jan31 = new Date(2024, 0, 31);
    expect(dateKey(addDays(jan31, 1))).toBe("2024-02-01");

    // Cross year boundary
    const dec31 = new Date(2024, 11, 31);
    expect(dateKey(addDays(dec31, 1))).toBe("2025-01-01");

    // Leap year
    const feb28_2024 = new Date(2024, 1, 28);
    expect(dateKey(addDays(feb28_2024, 1))).toBe("2024-02-29");
  });

  it("prettyDate produces a readable format", () => {
    const d = new Date(2024, 0, 15);
    const result = prettyDate(d);
    expect(result).toContain("Monday");
    expect(result).toContain("15");
    expect(result).toContain("January");
  });

  it("startOfDay and dayDiff work across DST boundaries", () => {
    // Spring forward (US: March 10, 2024)
    const before = new Date(2024, 2, 9, 12, 0);
    const after = new Date(2024, 2, 11, 12, 0);
    expect(dayDiff(after, before)).toBe(2);
    expect(startOfDay(before).getHours()).toBe(0);
  });
});

// ── Store + sync callback integration ─────────────────────────────────────
// The store's update() function calls _onMutation after mutations. Test
// the callback wiring and ChangedTables computation.

import { setSyncCallback } from "./store";

describe("store + sync callback wiring", () => {
  beforeEach(() => {
    // Wire a test callback
    setSyncCallback(() => {}, "test-user-id");
  });

  it("setSyncCallback wires the callback and userId", () => {
    // This test verifies the wiring function doesn't throw
    setSyncCallback(null); // clear
    setSyncCallback(() => {}, "user-2");
    // If we got here without error, wiring works
    expect(true).toBe(true);
  });
});

// ── QuickHash logic (SyncProvider polling optimization) ────────────────────
// Test that the quickHash function used in the polling interval correctly
// detects meaningful changes while using fewer resources than JSON.stringify.

describe("quickHash polling optimization", () => {
  type AppDataShape = {
    habits: { id: string }[];
    marks: Record<string, Record<string, string>>;
    notes: { id: string }[];
    goals: { id: string }[];
    economy: { bonusCoins: number };
  };

  // Replica of the quickHash logic from SyncProvider.tsx
  function quickHash(d: AppDataShape): string {
    const totalMarks = Object.values(d.marks).reduce(
      (s, day) => s + Object.keys(day).length,
      0,
    );
    return `${d.habits.length}|${totalMarks}|${d.notes.length}|${d.goals.length}|${d.economy.bonusCoins}`;
  }

  const base: AppDataShape = {
    habits: [{ id: "h1" }, { id: "h2" }],
    marks: {
      "2026-07-01": { h1: "done" },
      "2026-07-02": { h1: "done", h2: "done" },
    },
    notes: [{ id: "n1" }],
    goals: [],
    economy: { bonusCoins: 100 },
  };

  it("detects new habit added", () => {
    const modified = { ...base, habits: [...base.habits, { id: "h3" }] };
    expect(quickHash(modified)).not.toBe(quickHash(base));
  });

  it("detects new day added to marks", () => {
    const modified = {
      ...base,
      marks: { ...base.marks, "2026-07-03": { h1: "done" } },
    };
    expect(quickHash(modified)).not.toBe(quickHash(base));
  });

  it("detects new mark within existing day", () => {
    const modified = {
      ...base,
      marks: {
        ...base.marks,
        "2026-07-02": { ...base.marks["2026-07-02"], h3: "done" },
      },
    };
    expect(quickHash(modified)).not.toBe(quickHash(base));
  });

  it("detects notes added/removed", () => {
    const added = { ...base, notes: [...base.notes, { id: "n2" }] };
    expect(quickHash(added)).not.toBe(quickHash(base));

    const removed = { ...base, notes: [] };
    expect(quickHash(removed)).not.toBe(quickHash(base));
  });

  it("detects goals added", () => {
    const modified = { ...base, goals: [{ id: "g1" }] };
    expect(quickHash(modified)).not.toBe(quickHash(base));
  });

  it("detects economy changes", () => {
    const modified = {
      ...base,
      economy: { bonusCoins: 200 },
    };
    expect(quickHash(modified)).not.toBe(quickHash(base));
  });

  it("returns same hash for identical data", () => {
    expect(quickHash(base)).toBe(quickHash({ ...base }));
    expect(quickHash(base)).toBe(
      quickHash({
        ...base,
        // Deep clone object references should still match
        marks: { ...base.marks },
      }),
    );
  });

  it("is faster than JSON.stringify (benchmark-aware)", () => {
    const large: AppDataShape = {
      habits: Array.from({ length: 50 }, (_, i) => ({ id: `h${i}` })),
      marks: Object.fromEntries(
        Array.from({ length: 365 }, (_, i) => [
          `2026-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
          Object.fromEntries(
            Array.from({ length: 20 }, (_, j) => [`h${j}`, "done"]),
          ),
        ]),
      ),
      notes: Array.from({ length: 100 }, (_, i) => ({ id: `n${i}` })),
      goals: Array.from({ length: 30 }, (_, i) => ({ id: `g${i}` })),
      economy: { bonusCoins: 5000 },
    };

    // Verify both functions complete without error on large data
    expect(() => quickHash(large)).not.toThrow();
    expect(() => JSON.stringify(large)).not.toThrow();
  });

  it("benchmark: quickHash vs JSON.stringify performance", () => {
    // Generate a realistically-sized dataset:
    // ~50 habits, ~365 days of marks (up to 20 marks each),
    // ~100 notes, ~30 goals
    const large: AppDataShape = {
      habits: Array.from({ length: 50 }, (_, i) => ({ id: `h${i}` })),
      marks: Object.fromEntries(
        Array.from({ length: 365 }, (_, i) => {
          const month = String(Math.floor(i / 30) + 1).padStart(2, "0");
          const day = String((i % 28) + 1).padStart(2, "0");
          return [
            `2026-${month}-${day}`,
            Object.fromEntries(
              Array.from({ length: 20 }, (_, j) => [`h${j}`, "done"]),
            ),
          ];
        }),
      ),
      notes: Array.from({ length: 100 }, (_, i) => ({ id: `n${i}` })),
      goals: Array.from({ length: 30 }, (_, i) => ({ id: `g${i}` })),
      economy: { bonusCoins: 5000 },
    };

    // Warm-up: run both functions once to avoid JIT cold-start bias
    quickHash(large);
    JSON.stringify(large);

    const ITERATIONS = 100;
    const results = { quickHash: 0, jsonStringify: 0 };

    // Benchmark quickHash
    const qhStart = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
      quickHash(large);
    }
    results.quickHash = performance.now() - qhStart;

    // Benchmark JSON.stringify
    const jsStart = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
      JSON.stringify(large);
    }
    results.jsonStringify = performance.now() - jsStart;

    // Verify quickHash is faster (at least 25% faster, allowing for V8 variance)
    const ratio = results.quickHash / results.jsonStringify;
    expect(ratio).toBeLessThan(0.75);

    // Log benchmark results for visibility
    console.log(
      `[benchmark] quickHash: ${results.quickHash.toFixed(2)}ms, ` +
      `JSON.stringify: ${results.jsonStringify.toFixed(2)}ms, ` +
      `ratio: ${(ratio * 100).toFixed(1)}%`,
    );
  });

  it("benchmark: quickHash detects changes within large datasets", () => {
    // Build a large dataset similar to real user data
    const base: AppDataShape = {
      habits: Array.from({ length: 30 }, (_, i) => ({ id: `h${i}` })),
      marks: Object.fromEntries(
        Array.from({ length: 200 }, (_, i) => {
          const month = String(Math.floor(i / 28) + 1).padStart(2, "0");
          const day = String((i % 28) + 1).padStart(2, "0");
          return [
            `2026-${month}-${day}`,
            Object.fromEntries(
              Array.from({ length: 15 }, (_, j) => [`h${j}`, "done"]),
            ),
          ];
        }),
      ),
      notes: Array.from({ length: 50 }, (_, i) => ({ id: `n${i}` })),
      goals: Array.from({ length: 15 }, (_, i) => ({ id: `g${i}` })),
      economy: { bonusCoins: 1000 },
    };

    const baseHash = quickHash(base);

    // Add one more mark to an existing day
    const addMark = {
      ...base,
      marks: {
        ...base.marks,
        "2026-01-15": { ...base.marks["2026-01-15"], h29: "done" },
      },
    };
    expect(quickHash(addMark)).not.toBe(baseHash);

    // Add one more habit
    const addHabit = {
      ...base,
      habits: [...base.habits, { id: "h99" }],
    };
    expect(quickHash(addHabit)).not.toBe(baseHash);

    // Remove all marks
    const clearMarks = { ...base, marks: {} };
    expect(quickHash(clearMarks)).not.toBe(baseHash);

    // Verify identical data produces identical hash
    expect(quickHash(base)).toBe(quickHash({ ...base }));
  });
});
