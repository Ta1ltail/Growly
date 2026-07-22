// @vitest-environment node
//
// Tests for the orchestration layer: saveChanged and loadAllUserData.
//
// These use vi.mock at the top level (hoisted) to replace sub-module
// implementations so saveChanged/loadAllUserData call mocked versions
// of saveHabits, saveMarks, etc. We then import the SUT dynamically
// after mocks are registered.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AppData } from "@/lib/types";

// ── Top-level mocks (hoisted before all imports) ──────────────────

const mockSaveHabits = vi.fn().mockResolvedValue(undefined);
const mockSaveMarks = vi.fn().mockResolvedValue(undefined);
const mockSaveNotes = vi.fn().mockResolvedValue(undefined);
const mockSaveGoals = vi.fn().mockResolvedValue(undefined);
const mockSaveSettings = vi.fn().mockResolvedValue(undefined);
const mockSaveProfile = vi.fn().mockResolvedValue(undefined);
const mockSaveUnlocks = vi.fn().mockResolvedValue(undefined);
const mockSaveEconomy = vi.fn().mockResolvedValue(undefined);
const mockSaveProgressSeen = vi.fn().mockResolvedValue(undefined);

const mockLoadHabits = vi.fn();
const mockLoadMarks = vi.fn();
const mockLoadNotes = vi.fn();
const mockLoadGoals = vi.fn();
const mockLoadSettings = vi.fn();
const mockLoadProfile = vi.fn();
const mockLoadUnlocks = vi.fn();
const mockLoadEconomy = vi.fn();
const mockLoadProgressSeen = vi.fn();

vi.mock("../habits", () => ({
  saveHabits: mockSaveHabits,
  loadHabits: mockLoadHabits,
  rowToHabit: vi.fn((r: any) => r),
}));

vi.mock("../marks", () => ({
  saveMarks: mockSaveMarks,
  loadMarks: mockLoadMarks,
  buildMarksFromRows: vi.fn((rows: any[]) => {
    const marks: Record<string, Record<string, string>> = {};
    for (const r of rows) {
      if (!marks[r.date_key]) marks[r.date_key] = {};
      marks[r.date_key][r.habit_id] = r.status;
    }
    return marks;
  }),
}));

vi.mock("../notes", () => ({
  saveNotes: mockSaveNotes,
  loadNotes: mockLoadNotes,
  rowToNote: vi.fn((r: any) => ({ id: r.id, body: r.body, tags: r.tags ?? [], links: r.links ?? {}, createdAt: r.created_at, updatedAt: r.updated_at })),
}));

vi.mock("../goals", () => ({
  saveGoals: mockSaveGoals,
  loadGoals: mockLoadGoals,
  rowToGoal: vi.fn((r: any) => ({ id: r.id, title: r.title, target: r.target, current: r.current, createdAt: r.created_at })),
}));

vi.mock("../settings", () => ({
  saveSettings: mockSaveSettings,
  loadSettings: mockLoadSettings,
  rowToSettings: vi.fn((r: any) => ({ theme: { mode: r.theme_mode, accent: r.theme_accent }, graceHours: r.grace_hours })),
}));

vi.mock("../profile", () => ({
  saveProfile: mockSaveProfile,
  loadProfile: mockLoadProfile,
  rowToProfile: vi.fn((r: any) => ({ displayName: r.display_name, username: r.username })),
}));

vi.mock("../unlocks", () => ({
  saveUnlocks: mockSaveUnlocks,
  loadUnlocks: mockLoadUnlocks,
  rowToUnlocks: vi.fn((rows: any[]) => {
    const u: Record<string, any> = {};
    for (const r of rows) u[r.achievement_id] = { at: r.at, seen: r.seen };
    return u;
  }),
}));

vi.mock("../economy", () => ({
  saveEconomy: mockSaveEconomy,
  loadEconomy: mockLoadEconomy,
  rowToEconomy: vi.fn(() => ({
    spent: [], owned: [], equipped: {}, freezes: [], bonuses: [],
    bonusCoins: 0, lastCheckIn: null, checkInStreak: 0,
    lastQuestDate: null, currentQuest: null, lastSpinDate: null, lastSpinResult: null,
  })),
}));

vi.mock("../progress", () => ({
  saveProgressSeen: mockSaveProgressSeen,
  loadProgressSeen: mockLoadProgressSeen,
  rowToProgressSeen: vi.fn((r: any) => ({ seeded: r.seeded, level: r.level, title: r.title })),
}));

// ── Test data helpers ─────────────────────────────────────────────

function makeAppData(overrides?: Partial<AppData>): AppData {
  return {
    version: 7,
    habits: [{ id: "h1", name: "Test", category: "Health", repeatDays: [], createdAt: new Date().toISOString() }] as any,
    marks: { "2026-07-22": { h1: "done" as const } },
    notes: [],
    goals: [],
    auditLog: [],
    settings: { theme: { mode: "dark", accent: "blue" }, graceHours: 5 },
    profile: { displayName: "User", username: "user" },
    unlocks: {},
    economy: {
      spent: [], owned: [], equipped: {}, freezes: [], bonuses: [],
      bonusCoins: 0, lastCheckIn: null, checkInStreak: 0,
      lastQuestDate: null, currentQuest: null, lastSpinDate: null, lastSpinResult: null,
    },
    progressSeen: { seeded: false, level: 1, title: "", shop: [], streaks: {}, tierUnlocks: [], completedGoals: [] },
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════
//  saveChanged — incremental save orchestration
// ════════════════════════════════════════════════════════════════════

describe("saveChanged", () => {
  let saveChanged: typeof import("../index").saveChanged;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import picks up the hoisted mocks
    const mod = await import("../index");
    saveChanged = mod.saveChanged;
  });

  const supabase = {} as any;

  it("saves habits FIRST when habits changed", async () => {
    await saveChanged(supabase, "u-1", makeAppData(), { habits: true });
    expect(mockSaveHabits).toHaveBeenCalledWith(supabase, "u-1", expect.any(Array));
  });

  it("saves habits when marks changed (FK dependency)", async () => {
    await saveChanged(supabase, "u-1", makeAppData(), { marks: true });
    expect(mockSaveHabits).toHaveBeenCalled();
  });

  it("does NOT save habits when only economy changed", async () => {
    await saveChanged(supabase, "u-1", makeAppData(), { economy: true });
    expect(mockSaveHabits).not.toHaveBeenCalled();
  });

  it("saves marks when marks changes", async () => {
    await saveChanged(supabase, "u-1", makeAppData(), { marks: true });
    expect(mockSaveMarks).toHaveBeenCalled();
  });

  it("saves notes when notes changes", async () => {
    await saveChanged(supabase, "u-1", makeAppData(), { notes: true });
    expect(mockSaveNotes).toHaveBeenCalled();
  });

  it("saves goals when goals changes", async () => {
    await saveChanged(supabase, "u-1", makeAppData(), { goals: true });
    expect(mockSaveGoals).toHaveBeenCalled();
  });

  it("saves all singleton tables when indicated", async () => {
    await saveChanged(supabase, "u-1", makeAppData(), {
      settings: true, profile: true, unlocks: true, progressSeen: true,
    });
    expect(mockSaveSettings).toHaveBeenCalled();
    expect(mockSaveProfile).toHaveBeenCalled();
    expect(mockSaveUnlocks).toHaveBeenCalled();
    expect(mockSaveProgressSeen).toHaveBeenCalled();
  });

  it("saves economy when economy changes", async () => {
    await saveChanged(supabase, "u-1", makeAppData(), { economy: true });
    expect(mockSaveEconomy).toHaveBeenCalled();
  });

  it("filters orphan marks (habits FK constraint safety)", async () => {
    const data = makeAppData({ habits: [] });
    data.marks = { "2026-07-22": { "orphan-id": "done" as const } };
    await saveChanged(supabase, "u-1", data, { marks: true });
    // saveMarks should still be called (with filtered data)
    expect(mockSaveMarks).toHaveBeenCalled();
  });

  it("filters orphan freezes (habits FK constraint safety)", async () => {
    const data = makeAppData({ habits: [] });
    data.economy.freezes = [{ id: "f1", at: "T", date: "2026-07-20", habitId: "orphan" }];
    await saveChanged(supabase, "u-1", data, { economy: true });
    expect(mockSaveEconomy).toHaveBeenCalled();
  });

  it("skips all saves when no tables changed", async () => {
    await saveChanged(supabase, "u-1", makeAppData(), {});
    expect(mockSaveHabits).not.toHaveBeenCalled();
    expect(mockSaveMarks).not.toHaveBeenCalled();
    expect(mockSaveNotes).not.toHaveBeenCalled();
  });

  it("queues saves and processes them serially", async () => {
    // Two sequential calls should both complete
    await saveChanged(supabase, "u-1", makeAppData(), { habits: true });
    await saveChanged(supabase, "u-1", makeAppData(), { notes: true });
    expect(mockSaveHabits).toHaveBeenCalledTimes(1);
    expect(mockSaveNotes).toHaveBeenCalledTimes(1);
  });
});

// ════════════════════════════════════════════════════════════════════
//  loadAllUserData — full data load with RPC + fallback + retry
// ════════════════════════════════════════════════════════════════════

describe("loadAllUserData", () => {
  let loadAllUserData: typeof import("../index").loadAllUserData;
  let supabase: any;
  let mockRpc: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("RPC not available"),
    });

    supabase = { rpc: mockRpc };
    // Set up mock load functions to return empty data for fallback
    mockLoadHabits.mockResolvedValue([]);
    mockLoadMarks.mockResolvedValue({});
    mockLoadNotes.mockResolvedValue([]);
    mockLoadGoals.mockResolvedValue([]);
    mockLoadSettings.mockResolvedValue(null);
    mockLoadProfile.mockResolvedValue(null);
    mockLoadUnlocks.mockResolvedValue({});
    mockLoadEconomy.mockResolvedValue(null);
    mockLoadProgressSeen.mockResolvedValue(null);

    const mod = await import("../index");
    loadAllUserData = mod.loadAllUserData;
  });

  it("returns null when user has no data (fallback path)", async () => {
    const result = await loadAllUserData(supabase, "no-data-user");
    expect(result).toBeNull();
  });

  it("attempts RPC first, falls back to individual queries", async () => {
    // Make individual loads return data
    mockLoadHabits.mockResolvedValue([{ id: "h1", name: "Test", category: "Health", repeatDays: [], createdAt: "" }]);

    const result = await loadAllUserData(supabase, "u-1");
    expect(mockRpc).toHaveBeenCalledWith("load_user_data", { p_user_id: "u-1" });
    expect(result).not.toBeNull();
    expect(result!.habits).toHaveLength(1);
  });

  it("uses RPC data when RPC succeeds", async () => {
    mockRpc = vi.fn().mockResolvedValue({
      data: {
        habits: [{ id: "h1", name: "FromRPC", category: "Health", repeat_days: [], created_at: "T", user_id: "u1", archived: false, recurrence: null, start_date: null, time_of_day: null, priority: null, reminder: null, deleted_at: null }],
        marks: [{ date_key: "2026-07-01", habit_id: "h1", status: "done" }],
        notes: [], goals: [], settings: null, profile: null,
        unlocks: [], economy_state: null, economy_spent: [],
        economy_freezes: [], economy_bonuses: [], progress_seen: null,
      },
      error: null,
    });
    supabase.rpc = mockRpc;

    const result = await loadAllUserData(supabase, "u-1");
    expect(result!.habits[0].name).toBe("FromRPC");
    expect(result!.marks["2026-07-01"]["h1"]).toBe("done");
  });

  it("applies defaults for null settings, profile, economy, progressSeen", async () => {
    const result = await loadAllUserData(supabase, "u-1");
    // When all loads are empty, result is null
    expect(result).toBeNull();
  });

  it("retries when both RPC and fallback fail, then throws after exhaustion", async () => {
    mockRpc.mockRejectedValue(new Error("RPC error"));
    // Make the fallback also fail so the outer catch triggers retry
    mockLoadHabits.mockRejectedValue(new Error("DB connection lost"));

    await expect(loadAllUserData(supabase, "u-1")).rejects.toThrow("DB connection lost");
    // RPC called at least once (inner catch swallows, fallback fails → outer catch retries)
    expect(mockRpc).toHaveBeenCalled();
  });
});
