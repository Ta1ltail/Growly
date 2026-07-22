/* @vitest-environment happy-dom */
//
// Store → Sync → DB integration test. Wires the store's mutation callback to
// pushMutation, then verifies that store operations (addHabit, cycleMark,
// clearAllData, importRawData) correctly propagate through the sync layer and
// ultimately call saveChanged with the expected data and ChangedTables.
//
// This tests the full pipeline: store.update() → computeChanged →
// _onMutation → pushMutation → saveChanged.
//
// The actual DB row conversion and merge functions are tested separately in
// rowConverters.test.ts and orchestration.test.ts.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Hoisted mocks ────────────────────────────────────────────────
// These must be defined BEFORE vi.mock calls so they can be referenced
// in both the factory functions and test assertions.

const mockGetSession = vi.hoisted(() => vi.fn());
const mockSaveChanged = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockMarkMarksChanged = vi.hoisted(() => vi.fn());

// ── Mock dependencies ────────────────────────────────────────────
// vi.mock is hoisted above static imports by vitest.

vi.mock("../supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: { getSession: mockGetSession },
  })),
}));

vi.mock("../supabase/db", () => ({
  saveChanged: mockSaveChanged,
  loadAllUserData: vi.fn(),
  loadUserStatsSnapshot: vi.fn(),
  saveUserStatsSnapshot: vi.fn(),
}));

// ── Real imports (after mocks are registered) ───────────────────

import type { ChangedTables } from "../supabase/db";
import { emptyData, saveData } from "../storage";
import { makeHabit } from "../habits";
import { dateKey } from "../date";
import type { Habit } from "../types";

// Store layer
import {
  addHabit,
  cycleMark,
  clearAllData,
  importRawData,
  reloadCache,
  setSyncCallback,
} from "../store";

// Sync layer
import {
  pushMutation,
  setSyncReady,
  consumeMarksChangedFlag,
} from "../supabase/sync";

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
  // @ts-expect-error - mocking window for happy-dom
  globalThis.window = { localStorage: ls, ...globalThis.window };
}

// ── Helpers ──────────────────────────────────────────────────────

function makeTestHabit(overrides?: Partial<Habit>): Habit {
  return makeHabit({
    name: "Test habit",
    category: "Health",
    recurrence: { kind: "daily" },
    repeatDays: [],
    priority: "med",
    ...overrides,
  });
}

function wirePipeline(userId = "user-1") {
  setSyncCallback((data, changed) => {
    pushMutation(userId, data, changed).catch(() => {});
  }, userId);
  setSyncReady(true);
}

/**
 * Wait for a pending pushMutation to resolve (calls mockSaveChanged).
 * Use this after each synchronous store mutation to let the async
 * pushMutation settle before issuing the next mutation or assertion.
 */
async function flushPipeline() {
  await vi.waitFor(() => {
    expect(mockSaveChanged.mock.calls.length).toBeGreaterThan(0);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  installStorage();
  saveData(emptyData);
  reloadCache();
  setSyncCallback(null);
  consumeMarksChangedFlag();
  setSyncReady(false);

  // Default: session is valid for user-1
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: "user-1" } } },
    error: null,
  });

  // Re-apply default resolved value — clearAllMocks() clears call data
  // but NOT the implementation, so a mockRejectedValue from a previous
  // test (e.g. the error-handling test) would leak and break subsequent
  // tests that expect saveChanged to succeed.
  mockSaveChanged.mockResolvedValue(undefined);
});

afterEach(() => {
  setSyncCallback(null);
});

/* ──────────────────────────────────────────────
   Pipeline wiring: setSyncCallback → pushMutation → saveChanged
   ────────────────────────────────────────────── */

describe("store → sync → db pipeline", () => {
  it("addHabit calls saveChanged with correct data and ChangedTables", async () => {
    wirePipeline();

    addHabit(makeTestHabit({ name: "Read" }));
    await flushPipeline();

    const savedData = mockSaveChanged.mock.calls[0][2];
    const changed: ChangedTables = mockSaveChanged.mock.calls[0][3];

    expect(savedData.habits).toHaveLength(1);
    expect(savedData.habits[0].name).toBe("Read");
    expect(changed.habits).toBe(true);
  });

  it("only changed tables appear in ChangedTables", async () => {
    wirePipeline();

    addHabit(makeTestHabit({ name: "Read" }));
    await flushPipeline();

    const changed: ChangedTables = mockSaveChanged.mock.calls[0][3];

    expect(changed.habits).toBe(true);
    expect(changed.marks).toBeUndefined();
    expect(changed.notes).toBeUndefined();
    expect(changed.goals).toBeUndefined();
    expect(changed.settings).toBeUndefined();
    expect(changed.profile).toBeUndefined();
  });

  it("cycleMark passes marks in the saved data", async () => {
    wirePipeline();

    const h = makeTestHabit();
    addHabit(h);
    await flushPipeline();
    mockSaveChanged.mockClear();

    const today = dateKey(new Date());
    cycleMark(today, h.id);
    await flushPipeline();

    const savedData = mockSaveChanged.mock.calls[0][2];
    expect(savedData.marks[today]).toBeDefined();
    expect(savedData.marks[today][h.id]).toBe("done");
  });

  it("clearAllData clears habits but preserves settings/profile", async () => {
    addHabit(makeTestHabit({ name: "To clear" }));
    addHabit(makeTestHabit({ name: "Also clear" }));

    wirePipeline();
    mockSaveChanged.mockClear();

    clearAllData();
    await flushPipeline();

    const savedData = mockSaveChanged.mock.calls[0][2];
    expect(savedData.habits).toHaveLength(0);
    expect(savedData.notes).toHaveLength(0);
    expect(savedData.settings.theme).toBeDefined();
    expect(savedData.profile).toBeDefined();
  });

  it("importRawData triggers saveChanged with imported data", async () => {
    wirePipeline();
    mockSaveChanged.mockClear();

    const importedData = {
      ...emptyData,
      habits: [
        {
          id: "h_imported",
          name: "Imported",
          category: "Health" as const,
          repeatDays: [1, 3, 5],
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
    };
    importRawData(JSON.stringify(importedData));
    await flushPipeline();

    const savedData = mockSaveChanged.mock.calls[0][2];
    expect(savedData.habits).toHaveLength(1);
    expect(savedData.habits[0].name).toBe("Imported");
  });

  it("does not call saveChanged when sync-ready gate is closed", async () => {
    setSyncCallback((data, changed) => {
      pushMutation("user-1", data, changed).catch(() => {});
    }, "user-1");

    addHabit(makeTestHabit({ name: "Should not sync" }));

    expect(mockSaveChanged).not.toHaveBeenCalled();
  });

  it("resumes calling saveChanged after gate opens", async () => {
    setSyncCallback((data, changed) => {
      pushMutation("user-1", data, changed).catch(() => {});
    }, "user-1");

    addHabit(makeTestHabit({ name: "Before gate" }));
    expect(mockSaveChanged).not.toHaveBeenCalled();

    setSyncReady(true);
    mockSaveChanged.mockClear();

    addHabit(makeTestHabit({ name: "After gate" }));
    await flushPipeline();

    const habits = mockSaveChanged.mock.calls[0][2].habits;
    expect(habits.some((h: any) => h.name === "After gate")).toBe(true);
  });
});

/* ──────────────────────────────────────────────
   Data correctness through pipeline
   ────────────────────────────────────────────── */

describe("data correctness through pipeline", () => {
  it("passes the complete AppData snapshot to saveChanged", async () => {
    wirePipeline();

    addHabit(makeTestHabit({ name: "Single" }));
    await flushPipeline();

    const savedData = mockSaveChanged.mock.calls[0][2];

    expect(savedData.habits.some((h: any) => h.name === "Single")).toBe(true);
    expect(savedData).toHaveProperty("settings");
    expect(savedData).toHaveProperty("profile");
    expect(savedData).toHaveProperty("economy");
    expect(savedData).toHaveProperty("unlocks");
    expect(savedData).toHaveProperty("progressSeen");
    expect(savedData).toHaveProperty("marks");
    expect(savedData).toHaveProperty("notes");
    expect(savedData).toHaveProperty("goals");
  });

  it("preserves auditLog through the sync callback", async () => {
    wirePipeline();
    mockSaveChanged.mockClear();

    addHabit(makeTestHabit({ name: "Audited" }));
    await flushPipeline();

    const savedData = mockSaveChanged.mock.calls[0][2];
    expect(savedData.auditLog.length).toBeGreaterThanOrEqual(1);
    expect(savedData.auditLog[0].action).toBe("habit.create");
  });

  it("passes correct userId through the pipeline", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-abc" } } },
      error: null,
    });
    wirePipeline("user-abc");

    addHabit(makeTestHabit({ name: "User check" }));
    await flushPipeline();

    const userId = mockSaveChanged.mock.calls[0][1];
    expect(userId).toBe("user-abc");
  });
});

/* ──────────────────────────────────────────────
   Error handling through pipeline
   ────────────────────────────────────────────── */

describe("error handling through pipeline", () => {
  it("pushMutation errors are caught internally — does not crash the store", async () => {
    wirePipeline();
    mockSaveChanged.mockRejectedValueOnce(new Error("DB timeout"));

    const h = makeTestHabit({ name: "Should not crash" });
    expect(() => addHabit(h)).not.toThrow();

    await vi.waitFor(() => {
      expect(mockSaveChanged).toHaveBeenCalled();
    });
  });

  it("pushMutation with no session does not call saveChanged", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    wirePipeline();

    addHabit(makeTestHabit({ name: "Offline test" }));

    expect(mockSaveChanged).not.toHaveBeenCalled();
  });
});

/* ──────────────────────────────────────────────
   Multiple mutations coalescing
   ────────────────────────────────────────────── */

describe("multiple mutations", () => {
  it("multiple rapid addHabit calls include all data in final call", async () => {
    wirePipeline();
    mockSaveChanged.mockClear();

    addHabit(makeTestHabit({ name: "First" }));
    addHabit(makeTestHabit({ name: "Second" }));
    addHabit(makeTestHabit({ name: "Third" }));

    await vi.waitFor(() => {
      expect(mockSaveChanged.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    const lastCallArgs =
      mockSaveChanged.mock.calls[mockSaveChanged.mock.calls.length - 1];
    const habits = lastCallArgs[2].habits;
    expect(habits).toHaveLength(3);
  });
});

/* ──────────────────────────────────────────────
   Marks-changed flag — separate diagnostic tests
   ────────────────────────────────────────────── */

describe("marks-changed flag primitives", () => {
  it("pushMutation with marks=true calls markMarksChanged", async () => {
    setSyncReady(true);
    consumeMarksChangedFlag();

    const data = { ...emptyData };
    const changed: ChangedTables = { marks: true };
    await pushMutation("user-1", data, changed);

    expect(consumeMarksChangedFlag()).toBe(true);
  });

  it("pushMutation without marks does not call markMarksChanged", async () => {
    setSyncReady(true);
    consumeMarksChangedFlag();

    const data = { ...emptyData };
    const changed: ChangedTables = { habits: true };
    await pushMutation("user-1", data, changed);

    expect(consumeMarksChangedFlag()).toBe(false);
  });
});

describe("marks-changed flag through pipeline", () => {
  it("flag is set after cycleMark via the pipeline", async () => {
    wirePipeline();
    consumeMarksChangedFlag();

    const h = makeTestHabit();
    addHabit(h);
    await flushPipeline();
    mockSaveChanged.mockClear();

    const today = dateKey(new Date());
    cycleMark(today, h.id);
    await flushPipeline();

    // Verify data was saved correctly
    const savedData = mockSaveChanged.mock.calls[0][2];
    expect(savedData.marks[today]?.[h.id]).toBe("done");

    // Verify the flag was set by pushMutation
    expect(consumeMarksChangedFlag()).toBe(true);
  });

  it("flag stays false when only habits change", async () => {
    wirePipeline();
    consumeMarksChangedFlag();

    addHabit(makeTestHabit({ name: "No marks change" }));
    await flushPipeline();

    expect(consumeMarksChangedFlag()).toBe(false);
  });
});
