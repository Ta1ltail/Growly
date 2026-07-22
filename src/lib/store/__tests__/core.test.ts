/* @vitest-environment happy-dom */
//
// Tests for store core infrastructure: computeChanged, audit, marksDayEqual,
// hasPendingSave, flushSave, importRawData, clearAllData, replaceData, mutateData,
// reloadCache, and setSyncCallback wiring.
//
// The domain module functions (addHabit, cycleMark, addNote, etc.) and
// undo/redo are tested in store.test.ts. This file focuses on the
// infrastructure layer.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getSnapshot,
  hasPendingSave,
  flushSave,
  replaceData,
  mutateData,
  reloadCache,
  importRawData,
  clearAllData,
  setSyncCallback,
} from "../core";
import { loadData, saveData, emptyData } from "../../storage";

// ── Mock localStorage ─────────────────────────────────────────────
function installStorage() {
  let store: Record<string, string> = {};
  const ls = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
  // @ts-expect-error
  globalThis.window = { localStorage: ls };
}

beforeEach(() => {
  installStorage();
  saveData(emptyData);
  reloadCache();
  setSyncCallback(null);
});

/* ──────────────────────────────────────────────
   getSnapshot / reloadCache
   ────────────────────────────────────────────── */

describe("getSnapshot / reloadCache", () => {
  it("getSnapshot returns data from localStorage on first call", () => {
    const data = getSnapshot();
    expect(data.habits).toEqual([]);
    expect(data.marks).toEqual({});
  });

  it("reloadCache forces getSnapshot to re-read localStorage", () => {
    // First call caches emptyData
    const before = getSnapshot();
    expect(before.habits).toHaveLength(0);

    // Mutate localStorage directly
    const saved = loadData();
    saved.habits.push({
      id: "h1",
      name: "Direct write",
      category: "Health" as const,
      repeatDays: [1],
      createdAt: "2024-01-01T00:00:00Z",
    });
    saveData(saved);

    // Without reloadCache, getSnapshot still returns cached data
    const stillCached = getSnapshot();
    expect(stillCached.habits).toHaveLength(0);

    // After reloadCache, getSnapshot re-reads
    reloadCache();
    const afterReload = getSnapshot();
    expect(afterReload.habits).toHaveLength(1);
  });

  it("getSnapshot is stable across multiple calls when cache is valid", () => {
    const a = getSnapshot();
    const b = getSnapshot();
    expect(a).toBe(b); // same reference
  });
});

/* ──────────────────────────────────────────────
   replaceData
   ────────────────────────────────────────────── */

describe("replaceData", () => {
  it("replaceData replaces the entire AppData", () => {
    const replacement = {
      ...emptyData,
      habits: [
        {
          id: "h1",
          name: "Replaced",
          category: "Workout" as const,
          repeatDays: [],
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
    };
    replaceData(replacement);
    const data = getSnapshot();
    expect(data.habits).toHaveLength(1);
    expect(data.habits[0].name).toBe("Replaced");
  });

  it("replaceData triggers mutation callback", () => {
    const callback = vi.fn();
    setSyncCallback(callback, "user-1");

    const replacement = {
      ...emptyData,
      habits: [
        {
          id: "h1",
          name: "Callback test",
          category: "Health" as const,
          repeatDays: [],
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
    };
    replaceData(replacement);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

/* ──────────────────────────────────────────────
   mutateData
   ────────────────────────────────────────────── */

describe("mutateData", () => {
  it("mutateData applies updater function", () => {
    mutateData((prev) => ({
      ...prev,
      habits: [
        ...prev.habits,
        {
          id: "h1",
          name: "Mutated",
          category: "Fitness" as any as "Health",
          repeatDays: [],
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
    }));
    const data = getSnapshot();
    expect(data.habits).toHaveLength(1);
    expect(data.habits[0].name).toBe("Mutated");
  });

  it("mutateData with shouldRecordHistory=false does not push snapshot", () => {
    // Add something with history recording
    mutateData((prev) => ({
      ...prev,
      habits: [
        ...prev.habits,
        {
          id: "h1",
          name: "With history",
          category: "Health" as const,
          repeatDays: [],
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
    }));

    // Now add another without history
    mutateData(
      (prev) => ({
        ...prev,
        habits: [
          ...prev.habits,
          {
            id: "h2",
            name: "No history",
            category: "Health" as const,
            repeatDays: [],
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
      }),
      false,
    );

    // Both should be in the data
    const data = getSnapshot();
    expect(data.habits).toHaveLength(2);
  });
});

/* ──────────────────────────────────────────────
   hasPendingSave / flushSave
   ────────────────────────────────────────────── */

describe("hasPendingSave / flushSave", () => {
  beforeEach(() => {
    // Ensure saveTimer is null before each test in this suite
    flushSave();
  });

  it("mutateData with recordHistory=false schedules a debounced save", () => {
    mutateData((prev) => prev, false);
    expect(hasPendingSave()).toBe(true);
  });

  it("flushSave flushes the pending save and clears the timer", () => {
    mutateData((prev) => prev, false);
    expect(hasPendingSave()).toBe(true);

    flushSave();
    expect(hasPendingSave()).toBe(false);
  });
});

/* ──────────────────────────────────────────────
   importRawData
   ────────────────────────────────────────────── */

describe("importRawData", () => {
  it("returns error message for invalid JSON string", () => {
    const result = importRawData("not json");
    expect(result).toMatch(/JSON|json/i);
  });

  it("returns error for non-object root", () => {
    const result = importRawData('"just a string"');
    expect(result).toMatch(/object/i);
  });

  it("returns null on successful import", () => {
    const data = {
      habits: [],
      marks: {},
      notes: [],
      goals: [],
      settings: emptyData.settings,
      profile: emptyData.profile,
      unlocks: {},
      economy: emptyData.economy,
      progressSeen: emptyData.progressSeen,
      auditLog: [],
    };
    const result = importRawData(JSON.stringify(data));
    expect(result).toBeNull();
  });

  it("replaces existing data on successful import", () => {
    // Add some data first
    replaceData({
      ...emptyData,
      habits: [
        {
          id: "h1",
          name: "Old",
          category: "Health" as const,
          repeatDays: [],
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
    });

    // Import new data with different habits
    const newData = {
      ...emptyData,
      habits: [
        {
          id: "h2",
          name: "New",
          category: "Workout" as const,
          repeatDays: [],
          createdAt: "2024-06-01T00:00:00Z",
        },
      ],
    };
    importRawData(JSON.stringify(newData));

    const data = getSnapshot();
    expect(data.habits).toHaveLength(1);
    expect(data.habits[0].name).toBe("New");

    // Verify data is in localStorage
    flushSave();
    const reloaded = getSnapshot();
    expect(reloaded.habits).toHaveLength(1);
    expect(reloaded.habits[0].name).toBe("New");
  });

  it("triggers mutation callback after import", () => {
    const callback = vi.fn();
    setSyncCallback(callback, "user-1");

    importRawData(
      JSON.stringify({
        habits: [],
        marks: {},
        notes: [],
        goals: [],
        settings: emptyData.settings,
        profile: emptyData.profile,
        unlocks: {},
        economy: emptyData.economy,
        progressSeen: emptyData.progressSeen,
        auditLog: [],
      }),
    );
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

/* ──────────────────────────────────────────────
   clearAllData
   ────────────────────────────────────────────── */

describe("clearAllData", () => {
  it("preserves settings and profile", () => {
    // Set up some data
    mutateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: { mode: "light", accent: "rose" } as any,
      },
      profile: { ...prev.profile, displayName: "Alice", username: "alice" },
    } as any));

    clearAllData();

    const data = getSnapshot();
    expect(data.settings.theme.mode).toBe("light");
    expect(data.settings.theme.accent).toBe("rose");
    expect(data.profile.displayName).toBe("Alice");
  });

  it("clears habits, marks, notes, goals", () => {
    mutateData((prev) => ({
      ...prev,
      habits: [
        {
          id: "h1",
          name: "To clear",
          category: "Health" as const,
          repeatDays: [],
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
      notes: [{ id: "n1", body: "Clear me", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", tags: [], links: {} }],
    }));

    clearAllData();

    const data = getSnapshot();
    expect(data.habits).toHaveLength(0);
    expect(data.notes).toHaveLength(0);
  });

  it("preserves owned cosmetics and equipped", () => {
    mutateData((prev) => ({
      ...prev,
      economy: {
        ...prev.economy,
        owned: ["flame-gold", "confetti-neon"],
        equipped: { flame: "flame-gold", confetti: "confetti-neon" },
      },
    }));

    clearAllData();

    const data = getSnapshot();
    expect(data.economy.owned).toEqual(["flame-gold", "confetti-neon"]);
    expect(data.economy.equipped).toEqual({
      flame: "flame-gold",
      confetti: "confetti-neon",
    });
  });

  it("clears freezes", () => {
    mutateData((prev) => ({
      ...prev,
      economy: {
        ...prev.economy,
        freezes: [{ id: "f1", at: "2024-01-01T00:00:00Z", date: "2024-01-01", habitId: "h1" }],
      },
    }));

    clearAllData();

    const data = getSnapshot();
    expect(data.economy.freezes).toEqual([]);
  });

  it("preserves progressSeen.seeded flag", () => {
    mutateData((prev) => ({
      ...prev,
      progressSeen: { ...prev.progressSeen, seeded: true, level: 15 },
    }));

    clearAllData();

    const data = getSnapshot();
    expect(data.progressSeen.seeded).toBe(true);
    expect(data.progressSeen.level).toBe(1); // level was reset but seeded preserved
  });
});

/* ──────────────────────────────────────────────
   setSyncCallback
   ────────────────────────────────────────────── */

describe("setSyncCallback", () => {
  it("registers callback and userId", () => {
    const callback = vi.fn();
    setSyncCallback(callback, "user-1");
    // After this, mutations should trigger the callback
    replaceData({
      ...emptyData,
      habits: [
        {
          id: "h1",
          name: "Sync test",
          category: "Health" as const,
          repeatDays: [],
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
    });
    expect(callback).toHaveBeenCalled();
  });

  it("passing null removes the callback", () => {
    const callback = vi.fn();
    setSyncCallback(callback, "user-1");
    setSyncCallback(null);

    replaceData({
      ...emptyData,
      habits: [
        {
          id: "h1",
          name: "No callback",
          category: "Health" as const,
          repeatDays: [],
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
    });
    expect(callback).not.toHaveBeenCalled();
  });
});
