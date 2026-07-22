/* @vitest-environment happy-dom */
//
// Tests for the sync orchestration layer — module-level state management,
// pushMutation retry/incremental-save path, fullResync pull-merge-push cycle,
// and the retry queue persistence/processing lifecycle.
//
// The pure merge functions (mergeProfile, mergeSettings, mergeById, etc.)
// are tested in sync.test.ts.
//
// Since sync.ts maintains module-level mutable state (_status, _listeners,
// _syncReady, _retryQueue, _retryTimer, _marksChangedSinceStatsPush), each
// test suite must reset the module between runs via resetSyncState(),
// setSyncReady(false), and clearing the marks-changed flag.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Helper — builds a full AppData-like shape for mock data ──────
// Every table is populated so merge functions don't crash on undefined access.

const makeData = (overrides?: Record<string, any>) => ({
  version: Date.now(),
  habits: [] as any[],
  marks: {} as Record<string, any>,
  notes: [] as any[],
  goals: [] as any[],
  settings: {
    theme: { mode: "dark" as const, accent: "blue" as const },
    graceHours: 5,
    usedTemplateIds: [],
    customCategories: [],
  },
  profile: {
    displayName: "",
    username: "",
    bio: undefined as string | undefined,
    motto: undefined as string | undefined,
    avatar: undefined as string | undefined,
    banner: undefined as string | undefined,
    showcaseBadgeId: undefined as string | undefined,
  },
  unlocks: {},
  economy: {
    owned: [] as string[],
    spent: [] as any[],
    freezes: [] as any[],
    bonuses: [] as any[],
    bonusCoins: 0,
    checkInStreak: 0,
    lastCheckIn: null,
    lastQuestDate: null,
    currentQuest: null,
    lastSpinDate: null,
    lastSpinResult: null,
    equipped: {},
  },
  progressSeen: {
    seeded: false,
    level: 1,
    title: "",
    shop: [] as string[],
    streaks: {} as Record<string, any>,
    tierUnlocks: [] as any[],
    completedGoals: [] as any[],
  },
  auditLog: [],
  ...overrides,
});

// ── Sub-module mocks ──────────────────────────────────────────────
// Hoisted before any real imports.

const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
  },
  rpc: vi.fn(),
  from: vi.fn(),
};

vi.mock("../client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("../db", () => ({
  loadAllUserData: vi.fn(),
  saveChanged: vi.fn(),
  loadUserStatsSnapshot: vi.fn(),
  saveUserStatsSnapshot: vi.fn(),
}));

vi.mock("../../storage", () => ({
  loadData: vi.fn(),
  saveData: vi.fn(),
  saveStatsSnapshot: vi.fn(),
  DEFAULT_GRACE_HOURS: 5,
}));

vi.mock("../../progress", () => ({
  summarizeProgress: vi.fn(() => ({
    level: { level: 5 },
    stats: { maxCurrentStreak: 3, maxBestStreak: 10, doneCount: 50 },
    unlockedCount: 4,
  })),
}));

vi.mock("../../titles", () => ({
  titleForLevel: vi.fn(() => ({
    current: { rank: "bronze", name: "Habit Apprentice" },
  })),
}));

vi.mock("../../ranks", () => ({
  RANK_STYLE: {
    bronze: { icon: "🥉" },
  },
}));

vi.mock("../../stats", () => ({
  consistencyScore: vi.fn(() => 85),
}));

// ── Module under test ────────────────────────────────────────────

let sync: typeof import("../sync");

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers();

  sync = await import("../sync");

  sync.resetSyncState();
  sync.setSyncReady(false);
  sync.consumeMarksChangedFlag();

  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: "user-1" } } },
    error: null,
  });
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  });
  mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
});

afterEach(() => {
  vi.useRealTimers();
});

/* ──────────────────────────────────────────────
   Sync State Management
   ────────────────────────────────────────────── */

describe("sync state (getSyncStatus / subscribeToSyncStatus / resetSyncState)", () => {
  it("starts in idle status", () => {
    expect(sync.getSyncStatus()).toBe("idle");
  });

  it("subscribeToSyncStatus registers a listener and returns unsubscribe", () => {
    const listener = vi.fn();
    const unsub = sync.subscribeToSyncStatus(listener);
    expect(listener).not.toHaveBeenCalled();

    sync.resetSyncState();
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    sync.resetSyncState();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("multiple listeners are all notified on resetSyncState", () => {
    const a = vi.fn();
    const b = vi.fn();
    sync.subscribeToSyncStatus(a);
    sync.subscribeToSyncStatus(b);
    sync.resetSyncState();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("resetSyncState clears all listeners for subsequent calls", () => {
    const listener = vi.fn();
    sync.subscribeToSyncStatus(listener);
    sync.resetSyncState();
    listener.mockClear();
    sync.resetSyncState();
    expect(listener).not.toHaveBeenCalled();
  });
});

/* ──────────────────────────────────────────────
   Marks-changed flag
   ────────────────────────────────────────────── */

describe("marks-changed flag (markMarksChanged / consumeMarksChangedFlag)", () => {
  it("returns false after explicit clear in beforeEach", () => {
    expect(sync.consumeMarksChangedFlag()).toBe(false);
  });

  it("returns true after markMarksChanged", () => {
    sync.markMarksChanged();
    expect(sync.consumeMarksChangedFlag()).toBe(true);
  });

  it("returns false on second consume (atomic read-and-reset)", () => {
    sync.markMarksChanged();
    sync.consumeMarksChangedFlag();
    expect(sync.consumeMarksChangedFlag()).toBe(false);
  });

  it("tracks after pushMutation with marks: true", async () => {
    sync.setSyncReady(true);
    await sync.pushMutation(
      "user-1",
      makeData(),
      { marks: true },
    );
    expect(sync.consumeMarksChangedFlag()).toBe(true);
  });

  it("does NOT set flag when pushMutation changes other tables", async () => {
    sync.setSyncReady(true);
    await sync.pushMutation(
      "user-1",
      makeData(),
      { habits: true },
    );
    expect(sync.consumeMarksChangedFlag()).toBe(false);
  });
});

/* ──────────────────────────────────────────────
   Sync-ready gate
   ────────────────────────────────────────────── */

describe("sync-ready gate (getSyncReady / setSyncReady / bumpDataGeneration)", () => {
  it("starts closed (false)", () => {
    expect(sync.getSyncReady()).toBe(false);
  });

  it("setSyncReady(true) opens the gate", () => {
    sync.setSyncReady(true);
    expect(sync.getSyncReady()).toBe(true);
  });

  it("setSyncReady(false) closes the gate", () => {
    sync.setSyncReady(true);
    sync.setSyncReady(false);
    expect(sync.getSyncReady()).toBe(false);
  });

  it("bumpDataGeneration does not throw", () => {
    expect(() => sync.bumpDataGeneration()).not.toThrow();
  });
});

/* ──────────────────────────────────────────────
   pushMutation
   ────────────────────────────────────────────── */

describe("pushMutation", () => {
  it("silently returns when gate is closed", async () => {
    await sync.pushMutation(
      "user-1",
      makeData(),
      { habits: true },
    );

    const { saveChanged } = await import("../db");
    expect(saveChanged).not.toHaveBeenCalled();
    expect(sync.getSyncStatus()).toBe("idle");
  });

  it("calls saveChanged on success and transitions to idle", async () => {
    sync.setSyncReady(true);

    const data = makeData({ habits: [{ id: "h1", name: "Test", category: "Health" as const, repeatDays: [1, 2, 3], createdAt: "2024-01-01T00:00:00Z" }] });
    const changed = { habits: true } as const;

    await sync.pushMutation("user-1", data, changed);

    const { saveChanged } = await import("../db");
    expect(saveChanged).toHaveBeenCalledTimes(1);
    expect(saveChanged).toHaveBeenCalledWith(expect.any(Object), "user-1", data, changed);

    vi.advanceTimersByTime(400);
    expect(sync.getSyncStatus()).toBe("idle");
  });

  it("enqueues retry and sets error status when saveChanged throws", async () => {
    sync.setSyncReady(true);

    const { saveChanged } = await import("../db");
    (saveChanged as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("DB timeout"));

    await expect(
      sync.pushMutation(
        "user-1",
        makeData(),
        { habits: true },
      ),
    ).resolves.toBeUndefined();

    // Retry should be persisted to localStorage
    const retryRaw = window.localStorage.getItem("growly.sync_retry_queue");
    expect(retryRaw).not.toBeNull();
    if (retryRaw) {
      const retryQueue = JSON.parse(retryRaw);
      expect(retryQueue).toHaveLength(1);
      expect(retryQueue[0].userId).toBe("user-1");
      expect(retryQueue[0].attempts).toBe(1);
    }

    vi.advanceTimersByTime(400);
    expect(sync.getSyncStatus()).toBe("error");
  });

  it("sets offline when no cached session exists", async () => {
    sync.setSyncReady(true);

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await sync.pushMutation(
      "user-1",
      makeData(),
      { habits: true },
    );

    const { saveChanged } = await import("../db");
    expect(saveChanged).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(sync.getSyncStatus()).toBe("offline");
  });

  it("tracks marks changed flag on successful push with marks: true", async () => {
    sync.setSyncReady(true);
    sync.consumeMarksChangedFlag();

    await sync.pushMutation(
      "user-1",
      makeData(),
      { marks: true },
    );

    expect(sync.consumeMarksChangedFlag()).toBe(true);
  });

  it("calls saveChanged even with all-false ChangedTables", async () => {
    sync.setSyncReady(true);

    await sync.pushMutation(
      "user-1",
      makeData(),
      {},
    );

    const { saveChanged } = await import("../db");
    expect(saveChanged).toHaveBeenCalledTimes(1);
  });
});

/* ──────────────────────────────────────────────
   fullResync
   ────────────────────────────────────────────── */

describe("fullResync", () => {
  it("returns local data when remote is null, pushes local for new user (quiet mode)", async () => {
    const { loadAllUserData, saveChanged } = await import("../db");
    const { loadData } = await import("../../storage");

    const localData = makeData({
      habits: [{ id: "h1", name: "Local", category: "Health" as const, repeatDays: [1], createdAt: "2024-01-01T00:00:00Z" }],
    });
    (loadData as ReturnType<typeof vi.fn>).mockReturnValue(localData);
    (loadAllUserData as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await sync.fullResync("user-1", true);
    expect(result).toEqual(localData);

    // Even in quiet mode, the new-user path (remote is null + has local data)
    // pushes local data. The quiet guard only suppresses logging/status.
    expect(saveChanged).toHaveBeenCalled();
  });

  it("pulls, merges, and pushes merged data (non-quiet)", async () => {
    const { loadAllUserData, saveChanged } = await import("../db");
    const { loadData, saveData } = await import("../../storage");

    const localData = makeData({
      habits: [{ id: "h1", name: "Local habit", category: "Health" as const, repeatDays: [1], createdAt: "2024-01-01T00:00:00Z" }],
      // Local has a note that remote doesn't — this creates a delta so
      // hasChanges(merged, remote) returns true and saveChanged is called.
      notes: [{ id: "n1", body: "Local note", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", tags: [], links: {} }],
    });
    (loadData as ReturnType<typeof vi.fn>).mockReturnValue(localData);

    const remoteData = makeData({
      habits: [
        { id: "h1", name: "Remote habit", category: "Health" as const, repeatDays: [1], createdAt: "2024-06-01T00:00:00Z" },
        { id: "h2", name: "New remote", category: "Fitness" as const, repeatDays: [2], createdAt: "2024-06-01T00:00:00Z" },
      ],
    });
    (loadAllUserData as ReturnType<typeof vi.fn>).mockResolvedValue(remoteData);

    const result = await sync.fullResync("user-1", false);

    expect(result).not.toBeNull();
    expect(result!.habits).toHaveLength(2);

    const h1 = result!.habits.find((h: any) => h.id === "h1");
    expect(h1!.name).toBe("Remote habit");

    expect(saveData).toHaveBeenCalledWith(
      expect.objectContaining({
        habits: expect.arrayContaining([
          expect.objectContaining({ id: "h1", name: "Remote habit" }),
          expect.objectContaining({ id: "h2" }),
        ]),
      }),
    );

    expect(saveChanged).toHaveBeenCalled();
    const callArgs = (saveChanged as ReturnType<typeof vi.fn>).mock.calls[0];
    const savedHabits = callArgs[2].habits;
    expect(savedHabits).toHaveLength(2);
    expect(savedHabits.find((h: any) => h.id === "h1").name).toBe("Remote habit");
  });

  it("returns local data on pull failure in quiet mode", async () => {
    const { loadData } = await import("../../storage");
    const localData = makeData();
    (loadData as ReturnType<typeof vi.fn>).mockReturnValue(localData);

    const { loadAllUserData } = await import("../db");
    (loadAllUserData as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    const result = await sync.fullResync("user-1", true);
    expect(result).toEqual(localData);
  });

  it("handles new user path (no remote data, no local data)", async () => {
    const { loadAllUserData, saveChanged } = await import("../db");
    const { loadData } = await import("../../storage");

    (loadData as ReturnType<typeof vi.fn>).mockReturnValue(makeData());
    (loadAllUserData as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await sync.fullResync("user-1", false);
    expect(result).toEqual(expect.objectContaining({ habits: [], marks: {} }));
    expect(saveChanged).not.toHaveBeenCalled();
  });

  it("handles new user with local data (pushes initial data)", async () => {
    const { loadAllUserData, saveChanged } = await import("../db");
    const { loadData } = await import("../../storage");

    (loadData as ReturnType<typeof vi.fn>).mockReturnValue(makeData({
      habits: [{ id: "h1", name: "Offline habit", category: "Health" as const, repeatDays: [1], createdAt: "2024-01-01T00:00:00Z" }],
    }));
    (loadAllUserData as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await sync.fullResync("user-1", false);
    expect(result).toEqual(expect.objectContaining({
      habits: [expect.objectContaining({ name: "Offline habit" })],
    }));
    expect(saveChanged).toHaveBeenCalled();
    expect(sync.getSyncReady()).toBe(true);

    vi.advanceTimersByTime(400);
    expect(sync.getSyncStatus()).toBe("idle");
  });

  it("aborts save when data generation changes during fetch", async () => {
    const { loadAllUserData, saveChanged } = await import("../db");
    const { loadData } = await import("../../storage");

    const localData = makeData({
      habits: [{ id: "h1", name: "Local", category: "Health" as const, repeatDays: [1], createdAt: "2024-01-01T00:00:00Z" }],
    });
    (loadData as ReturnType<typeof vi.fn>).mockReturnValue(localData);

    (loadAllUserData as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      sync.bumpDataGeneration();
      return makeData({
        habits: [{ id: "h1", name: "Remote", category: "Health" as const, repeatDays: [1], createdAt: "2024-06-01T00:00:00Z" }],
      });
    });

    await sync.fullResync("user-1", true);
    expect(saveChanged).not.toHaveBeenCalled();
  });

  it("quiet mode does not open the gate or change status", async () => {
    const { loadAllUserData } = await import("../db");
    const { loadData } = await import("../../storage");

    (loadData as ReturnType<typeof vi.fn>).mockReturnValue(makeData());
    (loadAllUserData as ReturnType<typeof vi.fn>).mockResolvedValue(makeData());

    await sync.fullResync("user-1", true);
    expect(sync.getSyncReady()).toBe(false);
    expect(sync.getSyncStatus()).toBe("idle");
  });

  it("quiet mode does NOT push merged data to Supabase", async () => {
    const { loadAllUserData, saveChanged } = await import("../db");
    const { loadData } = await import("../../storage");

    (loadData as ReturnType<typeof vi.fn>).mockReturnValue(makeData({
      habits: [{ id: "h1", name: "Local", category: "Health" as const, repeatDays: [1], createdAt: "2024-01-01T00:00:00Z" }],
    }));
    (loadAllUserData as ReturnType<typeof vi.fn>).mockResolvedValue(makeData({
      habits: [{ id: "h1", name: "Remote", category: "Health" as const, repeatDays: [1], createdAt: "2024-06-01T00:00:00Z" }],
    }));

    await sync.fullResync("user-1", true);
    expect(saveChanged).not.toHaveBeenCalled();
  });

  it("non-quiet mode opens the gate and sets idle on success", async () => {
    const { loadAllUserData } = await import("../db");
    const { loadData } = await import("../../storage");

    (loadData as ReturnType<typeof vi.fn>).mockReturnValue(makeData());
    (loadAllUserData as ReturnType<typeof vi.fn>).mockResolvedValue(makeData());

    await sync.fullResync("user-1", false);
    expect(sync.getSyncReady()).toBe(true);

    vi.advanceTimersByTime(400);
    expect(sync.getSyncStatus()).toBe("idle");
  });

  it("returns null when an unexpected exception escapes outer catch", async () => {
    const { loadData } = await import("../../storage");
    (loadData as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("localStorage corrupt");
    });

    const result = await sync.fullResync("user-1", true);
    expect(result).toBeNull();
  });
});

/* ──────────────────────────────────────────────
   resetSyncState (edge cases)
   ────────────────────────────────────────────── */

describe("resetSyncState (edge cases)", () => {
  it("clears status and notifies listeners", () => {
    const listener = vi.fn();
    sync.subscribeToSyncStatus(listener);
    sync.resetSyncState();
    expect(sync.getSyncStatus()).toBe("idle");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("can be called multiple times without error", () => {
    expect(() => {
      sync.resetSyncState();
      sync.resetSyncState();
      sync.resetSyncState();
    }).not.toThrow();
  });

  it("works when called between pushMutation calls", async () => {
    sync.setSyncReady(true);
    await sync.pushMutation(
      "user-1",
      makeData(),
      { habits: true },
    );
    sync.resetSyncState();
    expect(sync.getSyncStatus()).toBe("idle");
  });
});

/* ──────────────────────────────────────────────
   Retry queue persistence
   ────────────────────────────────────────────── */

describe("retry queue persistence", () => {
  it("persists retry queue to localStorage after push failure", async () => {
    sync.setSyncReady(true);

    const { saveChanged } = await import("../db");
    (saveChanged as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Timeout"));

    await sync.pushMutation(
      "user-1",
      makeData(),
      { habits: true },
    );

    const raw = window.localStorage.getItem("growly.sync_retry_queue");
    expect(raw).not.toBeNull();
  });

  it("clears retry queue from localStorage after resetSyncState", () => {
    window.localStorage.setItem(
      "growly.sync_retry_queue",
      JSON.stringify([{ userId: "user-1", data: {}, changed: { habits: true }, attempts: 1 }]),
    );

    sync.resetSyncState();

    const raw = window.localStorage.getItem("growly.sync_retry_queue");
    expect(raw).toBeNull();
  });
});
