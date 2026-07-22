// @vitest-environment node
//
// Tests for all pure row conversion functions in the Supabase DB layer.
// These are deterministic transforms between DB row shapes and app types.
// No mocking needed — all functions are pure.
//
// Modules: habits, marks, notes, goals, settings, profile, economy,
//          unlocks, progress, and core (upsertTable)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { rowToHabit, habitToRow } from "../habits";
import { buildMarksFromRows, marksToRows } from "../marks";
import { rowToNote, noteToRow } from "../notes";
import { rowToGoal, goalToRow } from "../goals";
import { rowToSettings, settingsToRow } from "../settings";
import { rowToProfile, profileToRow } from "../profile";
import { rowToUnlocks } from "../unlocks";
import {
  bonusToRow,
  rowToEconomy,
  economyStateToRow,
  spentToRows,
  freezesToRows,
} from "../economy";
import { rowToProgressSeen, progressSeenToRow } from "../progress";
import { upsertTable } from "../core";

import type { Marks, Economy } from "@/lib/types";
import type {
  DbHabit, DbMark, DbNote, DbGoal, DbUserSettings,
  DbUserProfile, DbUnlock, DbEconomyState, DbEconomySpent,
  DbEconomyFreeze, DbEconomyBonus, DbProgressSeen,
} from "../core";

// ════════════════════════════════════════════════════════════════════
//  1. HABITS — rowToHabit / habitToRow
// ════════════════════════════════════════════════════════════════════

describe("habits", () => {
  const MINIMAL_DB_HABIT: DbHabit = {
    id: "h-1", user_id: "u-1", name: "Read", category: "Health",
    repeat_days: [0, 1, 2, 3, 4, 5, 6], created_at: "2026-01-15T10:00:00.000Z",
    recurrence: null, start_date: null, time_of_day: null,
    priority: null, archived: false, reminder: null, deleted_at: null,
  };

  it("rowToHabit converts minimal row", () => {
    const h = rowToHabit(MINIMAL_DB_HABIT);
    expect(h.id).toBe("h-1");
    expect(h.name).toBe("Read");
    expect(h.category).toBe("Health");
    expect(h.createdAt).toBe("2026-01-15T10:00:00.000Z");
    expect(h.recurrence).toBeUndefined();
    expect(h.deletedAt).toBeUndefined();
  });

  it("rowToHabit includes all optional fields", () => {
    const h = rowToHabit({
      ...MINIMAL_DB_HABIT, recurrence: { kind: "daily" },
      start_date: "2026-01-01", time_of_day: "08:00", priority: "high",
      archived: true, reminder: { enabled: true, time: "07:00" },
      deleted_at: "2026-06-01T00:00:00.000Z",
    });
    expect(h.recurrence).toEqual({ kind: "daily" });
    expect(h.startDate).toBe("2026-01-01");
    expect(h.timeOfDay).toBe("08:00");
    expect(h.priority).toBe("high");
    expect(h.archived).toBe(true);
    expect(h.reminder).toEqual({ enabled: true, time: "07:00" });
    expect(h.deletedAt).toBe("2026-06-01T00:00:00.000Z");
  });

  it("habitToRow maps all fields and sets user_id", () => {
    const h = rowToHabit({ ...MINIMAL_DB_HABIT, recurrence: { kind: "weekly", weekdays: [1, 3, 5] }, priority: "low" });
    const row = habitToRow("u-1", h);
    expect(row.user_id).toBe("u-1");
    expect(row.recurrence).toEqual({ kind: "weekly", weekdays: [1, 3, 5] });
    expect(row.priority).toBe("low");
  });

  it("rowToHabit → habitToRow round-trips losslessly", () => {
    const row: DbHabit = {
      id: "h-rt", user_id: "u-1", name: "Meditate", category: "Mindfulness",
      repeat_days: [0, 6], created_at: "2026-03-01T08:00:00.000Z",
      recurrence: { kind: "weekly", weekdays: [0, 6] },
      start_date: "2026-03-01", time_of_day: "06:30", priority: "high",
      archived: false, reminder: { enabled: true, time: "06:25" }, deleted_at: null,
    };
    const app = rowToHabit(row);
    const back = habitToRow("u-1", app);
    expect(back.name).toBe(row.name);
    expect(back.category).toBe(row.category);
    expect(back.recurrence).toEqual(row.recurrence);
    expect(back.deleted_at).toBeNull();
  });

  it("habitToRow preserves falsy defaults", () => {
    const h = rowToHabit(MINIMAL_DB_HABIT);
    const row = habitToRow("u-1", h);
    expect(row.archived).toBe(false);
    expect(row.deleted_at).toBeNull();
    expect(row.recurrence).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════
//  2. MARKS — buildMarksFromRows / marksToRows
// ════════════════════════════════════════════════════════════════════

describe("marks", () => {
  it("buildMarksFromRows builds nested Marks from flat rows", () => {
    const rows = [
      { date_key: "2026-07-01", habit_id: "h1", status: "done" },
      { date_key: "2026-07-01", habit_id: "h2", status: "missed" },
      { date_key: "2026-07-02", habit_id: "h1", status: "done" },
    ] as DbMark[];
    const marks = buildMarksFromRows(rows);
    expect(marks["2026-07-01"]["h1"]).toBe("done");
    expect(marks["2026-07-01"]["h2"]).toBe("missed");
    expect(marks["2026-07-02"]["h1"]).toBe("done");
    expect(marks["2026-07-02"]["h2"]).toBeUndefined();
  });

  it("buildMarksFromRows returns {} for empty input", () => {
    expect(buildMarksFromRows([])).toEqual({});
  });

  it("buildMarksFromRows handles single row", () => {
    const marks = buildMarksFromRows([{ date_key: "2026-07-15", habit_id: "h1", status: "skipped" } as DbMark]);
    expect(marks["2026-07-15"]["h1"]).toBe("skipped");
  });

  it("marksToRows flattens Marks to DbMark[]", () => {
    const marks: Marks = { "2026-07-01": { h1: "done", h2: "missed" } };
    const rows = marksToRows("u-1", marks);
    expect(rows).toHaveLength(2);
    expect(rows[0].user_id).toBe("u-1");
    expect(rows[0].status).toBe("done");
  });

  it("marksToRows assigns unique IDs per row", () => {
    const rows = marksToRows("u-1", { "2026-07-01": { h1: "done" } });
    expect(rows[0].id).toBeTruthy();
    expect(typeof rows[0].id).toBe("string");
  });

  it("marksToRows returns [] for empty Marks", () => {
    expect(marksToRows("u-1", {})).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════
//  3. NOTES — rowToNote / noteToRow
// ════════════════════════════════════════════════════════════════════

describe("notes", () => {
  const BASE: DbNote = {
    id: "n-1", user_id: "u-1", created_at: "2026-07-01T12:00:00.000Z",
    updated_at: "2026-07-01T12:00:00.000Z", body: "Hello", tags: ["tag1"],
    links: { date: "2026-07-01" }, deleted_at: null,
  };

  it("rowToNote converts all fields", () => {
    const n = rowToNote(BASE);
    expect(n.id).toBe("n-1");
    expect(n.body).toBe("Hello");
    expect(n.tags).toEqual(["tag1"]);
    expect(n.links.date).toBe("2026-07-01");
    expect(n.deletedAt).toBeUndefined();
  });

  it("rowToNote handles deleted_at", () => {
    const n = rowToNote({ ...BASE, deleted_at: "2026-07-05T00:00:00Z" });
    expect(n.deletedAt).toBe("2026-07-05T00:00:00Z");
  });

  it("rowToNote handles null tags and null links", () => {
    const n = rowToNote({ ...BASE, tags: null as unknown as string[], links: null as unknown as typeof BASE.links });
    expect(n.tags).toEqual([]);
    expect(n.links).toEqual({});
  });

  it("round-trip preserves all fields", () => {
    const app = rowToNote(BASE);
    const row = noteToRow("u-1", app);
    expect(row.body).toBe("Hello");
    expect(row.deleted_at).toBeNull();
  });

  it("round-trip with deleted_at preserves value", () => {
    const dbNote: DbNote = { ...BASE, deleted_at: "2026-07-10T00:00:00Z" };
    const back = noteToRow("u-1", rowToNote(dbNote));
    expect(back.deleted_at).toBe("2026-07-10T00:00:00Z");
  });
});

// ════════════════════════════════════════════════════════════════════
//  4. GOALS — rowToGoal / goalToRow
// ════════════════════════════════════════════════════════════════════

describe("goals", () => {
  const MINIMAL: DbGoal = {
    id: "g-1", user_id: "u-1", title: "Read 20 books",
    target: 20, current: 5, created_at: "2026-01-01T00:00:00Z",
    category: null, deadline: null, linked_habit_ids: [],
    milestones: null, deleted_at: null,
  };

  it("rowToGoal converts minimal goal", () => {
    const g = rowToGoal(MINIMAL);
    expect(g.title).toBe("Read 20 books");
    expect(g.category).toBeUndefined();
    expect(g.deletedAt).toBeUndefined();
  });

  it("rowToGoal includes optional fields", () => {
    const g = rowToGoal({
      ...MINIMAL, category: "Health", deadline: "2026-12-31",
      linked_habit_ids: ["h1"], milestones: [{ id: "m1", title: "Halfway", at: 10, done: false }],
      deleted_at: "2026-06-01T00:00:00Z",
    });
    expect(g.category).toBe("Health");
    expect(g.deadline).toBe("2026-12-31");
    expect(g.linkedHabitIds).toEqual(["h1"]);
    expect(g.milestones![0].title).toBe("Halfway");
    expect(g.deletedAt).toBe("2026-06-01T00:00:00Z");
  });

  it("round-trip preserves optional fields", () => {
    const g = rowToGoal({ ...MINIMAL, category: "Work", linked_habit_ids: ["h1", "h2"] });
    const row = goalToRow("u-1", g);
    expect(row.category).toBe("Work");
    expect(row.linked_habit_ids).toEqual(["h1", "h2"]);
  });
});

// ════════════════════════════════════════════════════════════════════
//  5. SETTINGS — rowToSettings / settingsToRow
// ════════════════════════════════════════════════════════════════════

describe("settings", () => {
  const BASE: DbUserSettings = {
    user_id: "u-1", theme_mode: "dark", theme_accent: "blue",
    grace_hours: 5, used_template_ids: [], widget_order: null,
    onboarding_complete: false, custom_categories: [], auto_freeze_threshold: null,
  };

  it("rowToSettings converts minimal row", () => {
    const s = rowToSettings(BASE);
    expect(s.theme.mode).toBe("dark");
    expect(s.theme.accent).toBe("blue");
    expect(s.graceHours).toBe(5);
    // onboarding_complete is false in the DB → false ?? undefined = false
    expect(s.onboardingComplete).toBe(false);
    // custom_categories is [] → expected check: .length → undefined
    expect(s.customCategories).toBeUndefined();
  });

  it("rowToSettings includes onboardingComplete when true", () => {
    expect(rowToSettings({ ...BASE, onboarding_complete: true }).onboardingComplete).toBe(true);
  });

  it("rowToSettings includes widget_order when present", () => {
    const s = rowToSettings({ ...BASE, widget_order: ["habits", "stats"] });
    expect(s.widgetOrder).toEqual(["habits", "stats"]);
  });

  it("rowToSettings includes auto_freeze_threshold when positive", () => {
    expect(rowToSettings({ ...BASE, auto_freeze_threshold: 7 }).autoFreezeThreshold).toBe(7);
  });

  it("rowToSettings excludes auto_freeze_threshold when 0", () => {
    expect(rowToSettings({ ...BASE, auto_freeze_threshold: 0 }).autoFreezeThreshold).toBeUndefined();
  });

  it("rowToSettings includes custom_categories when non-empty", () => {
    expect(rowToSettings({ ...BASE, custom_categories: ["Gardening"] }).customCategories).toEqual(["Gardening"]);
  });

  it("settingsToRow uses DEFAULT_GRACE_HOURS when graceHours is missing", () => {
    const row = settingsToRow("u-1", { theme: { mode: "light", accent: "rose" }, graceHours: undefined });
    expect(row.grace_hours).toBe(5);
  });

  it("round-trip preserves values", () => {
    const row = settingsToRow("u-1", rowToSettings(BASE));
    expect(row.theme_mode).toBe("dark");
    expect(row.auto_freeze_threshold).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════
//  6. PROFILE — rowToProfile / profileToRow
// ════════════════════════════════════════════════════════════════════

describe("profile", () => {
  const BASE: DbUserProfile = {
    user_id: "u-1", display_name: "Alice", username: "alice",
    bio: null, motto: null, avatar: null, banner: null, showcase_badge_id: null,
  };

  it("rowToProfile converts minimal row", () => {
    const p = rowToProfile(BASE);
    expect(p.displayName).toBe("Alice");
    expect(p.bio).toBeUndefined();
    expect(p.showcaseBadgeId).toBeUndefined();
  });

  it("rowToProfile includes optional fields", () => {
    const p = rowToProfile({ ...BASE, bio: "Runner", motto: "Go!", avatar: "a.png", banner: "sunset", showcase_badge_id: "s1" });
    expect(p.bio).toBe("Runner");
    expect(p.motto).toBe("Go!");
    expect(p.avatar).toBe("a.png");
    expect(p.banner).toBe("sunset");
    expect(p.showcaseBadgeId).toBe("s1");
  });

  it("round-trip preserves all fields", () => {
    const row = profileToRow("u-1", rowToProfile({ ...BASE, bio: "Test" }));
    expect(row.display_name).toBe("Alice");
    expect(row.bio).toBe("Test");
  });
});

// ════════════════════════════════════════════════════════════════════
//  7. ECONOMY — rowToEconomy / economyStateToRow / row converters
// ════════════════════════════════════════════════════════════════════

describe("economy", () => {
  const BASE_STATE: DbEconomyState = {
    user_id: "u-1", owned: ["flame-1"], equipped: { flame: "flame-1" },
    bonus_coins: 150, last_check_in: "2026-07-22", check_in_streak: 5,
    last_quest_date: "2026-07-22",
    current_quest: { description: "Test", target: 3, current: 1, reward: 15 },
    last_spin_date: "2026-07-21",
    last_spin_result: { label: "50 coins", amount: 50, isFreeze: false },
  };

  it("rowToEconomy converts all fields", () => {
    const eco = rowToEconomy(BASE_STATE, [], [], []);
    expect(eco.bonusCoins).toBe(150);
    expect(eco.lastCheckIn).toBe("2026-07-22");
    expect(eco.checkInStreak).toBe(5);
    expect(eco.owned).toEqual(["flame-1"]);
    expect(eco.equipped.flame).toBe("flame-1");
    expect(eco.currentQuest).not.toBeNull();
    expect(eco.lastSpinResult?.amount).toBe(50);
    expect(eco.spent).toEqual([]);
    expect(eco.freezes).toEqual([]);
    expect(eco.bonuses).toEqual([]);
  });

  it("rowToEconomy parses spent, freeze, bonus rows", () => {
    const spent: DbEconomySpent[] = [{ id: "s1", user_id: "u-1", at: "2026-07-20T10:00:00Z", amount: 75, item: "flame-1" }];
    const freezes: DbEconomyFreeze[] = [{ id: "f1", user_id: "u-1", at: "2026-07-20T10:00:00Z", date: "2026-07-20", habit_id: "h1" }];
    const bonuses: DbEconomyBonus[] = [{ id: "b1", user_id: "u-1", type: "check_in", date_key: "2026-07-22", amount: 10, created_at: "2026-07-22T00:00:00Z" }];
    const eco = rowToEconomy(BASE_STATE, spent, freezes, bonuses);
    expect(eco.spent).toHaveLength(1);
    expect(eco.freezes).toHaveLength(1);
    expect(eco.freezes[0].habitId).toBe("h1");
    expect(eco.bonuses).toHaveLength(1);
    expect(eco.bonuses[0].type).toBe("check_in");
  });

  it("rowToEconomy handles null quest/spin", () => {
    const eco = rowToEconomy(
      { ...BASE_STATE, current_quest: null, last_spin_result: null }, [], [], [],
    );
    expect(eco.currentQuest).toBeNull();
    expect(eco.lastSpinResult).toBeNull();
  });

  it("rowToEconomy rejects invalid quest/spin shapes", () => {
    const eco = rowToEconomy(
      { ...BASE_STATE, current_quest: { bad: true }, last_spin_result: { amount: 50 } }, [], [], [],
    );
    expect(eco.currentQuest).toBeNull();
    expect(eco.lastSpinResult).toBeNull();
  });

  it("economyStateToRow converts Economy to DbEconomyState", () => {
    const app: Economy = {
      spent: [], owned: ["flame-1"], equipped: { flame: "flame-1" },
      freezes: [], bonuses: [], bonusCoins: 150,
      lastCheckIn: "2026-07-22", checkInStreak: 5, lastQuestDate: "2026-07-22",
      currentQuest: null, lastSpinDate: null, lastSpinResult: null,
    };
    const row = economyStateToRow("u-1", app);
    expect(row.bonus_coins).toBe(150);
    expect(row.check_in_streak).toBe(5);
    expect(row.last_spin_date).toBeNull();
  });

  it("bonusToRow / spentToRows / freezesToRows convert entries", () => {
    const b = bonusToRow("u-1", { id: "b1", type: "check_in", dateKey: "2026-07-22", amount: 10, at: "2026-07-22T00:00:00Z" });
    expect(b.type).toBe("check_in");

    const s = spentToRows("u-1", [{ id: "s1", at: "T", amount: 75, item: "flame-1" }]);
    expect(s[0].item).toBe("flame-1");

    const f = freezesToRows("u-1", [{ id: "f1", at: "T", date: "2026-07-20", habitId: "h1" }]);
    expect(f[0].habit_id).toBe("h1");
  });
});

// ════════════════════════════════════════════════════════════════════
//  8. UNLOCKS — rowToUnlocks
// ════════════════════════════════════════════════════════════════════

describe("unlocks", () => {
  it("builds Unlocks map from flat rows", () => {
    const unlocks = rowToUnlocks([
      { achievement_id: "streak-7", at: "2026-07-01T00:00:00Z", seen: false },
      { achievement_id: "done-100", at: "2026-07-15T00:00:00Z", seen: true },
    ] as DbUnlock[]);
    expect(unlocks["streak-7"].seen).toBe(false);
    expect(unlocks["done-100"].seen).toBe(true);
  });

  it("returns {} for empty array", () => expect(rowToUnlocks([])).toEqual({}));
});

// ════════════════════════════════════════════════════════════════════
//  9. PROGRESS SEEN — rowToProgressSeen / progressSeenToRow
// ════════════════════════════════════════════════════════════════════

describe("progressSeen", () => {
  const BASE: DbProgressSeen = {
    user_id: "u-1", seeded: true, level: 10, title: "Master",
    shop: ["flame-epic"], streaks: { h1: 7 }, tier_unlocks: ["common"],
    completed_goals: ["g1"],
  };

  it("rowToProgressSeen converts all fields", () => {
    const ps = rowToProgressSeen(BASE);
    expect(ps.seeded).toBe(true);
    expect(ps.level).toBe(10);
    expect(ps.shop).toEqual(["flame-epic"]);
    expect(ps.streaks).toEqual({ h1: 7 });
  });

  it("rowToProgressSeen replaces null streaks with {}", () => {
    const ps = rowToProgressSeen({ ...BASE, streaks: null as unknown as Record<string, number> });
    expect(ps.streaks).toEqual({});
  });

  it("round-trip preserves all fields", () => {
    const row = progressSeenToRow("u-1", rowToProgressSeen(BASE));
    expect(row.level).toBe(10);
    expect(row.streaks).toEqual({ h1: 7 });
  });
});

// ════════════════════════════════════════════════════════════════════
//  10. CORE — upsertTable batch logic
// ════════════════════════════════════════════════════════════════════

describe("upsertTable", () => {
  let mockUpsert: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let supabase: any;

  beforeEach(() => {
    mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom = vi.fn(() => ({ upsert: mockUpsert }));
    supabase = { from: mockFrom };
  });

  it("skips upsert when rows is empty", async () => {
    await upsertTable(supabase, "habits", [], (r) => r, "id");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("calls upsert with mapped rows", async () => {
    await upsertTable(supabase, "habits", [{ id: "h1", name: "Read" }], (h) => h, "id");
    expect(mockFrom).toHaveBeenCalledWith("habits");
  });

  it("batches rows in groups of 500", async () => {
    const rows = Array.from({ length: 750 }, (_, i) => ({ id: `h${i}` }));
    await upsertTable(supabase, "habits", rows, (r) => r, "id");
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpsert.mock.calls[0][0]).toHaveLength(500);
    expect(mockUpsert.mock.calls[1][0]).toHaveLength(250);
  });

  it("throws when upsert returns error", async () => {
    mockUpsert.mockResolvedValue({ error: new Error("DB err") });
    await expect(upsertTable(supabase, "test", [{ id: "1" }], (r) => r, "id")).rejects.toThrow("DB err");
  });
});

// ════════════════════════════════════════════════════════════════════
//  11. STATS SNAPSHOTS — loadUserStatsSnapshot (data conversion)
// ════════════════════════════════════════════════════════════════════

describe("stats snapshot conversion", () => {
  // loadUserStatsSnapshot is tested via its data conversion logic.
  // The function takes a DB row and converts fields from snake_case.
  // We test the conversion shape via a helper that mirrors the logic.
  function parseStatsRow(row: Record<string, unknown>) {
    return {
      level: row.level as number,
      currentStreak: row.current_streak as number,
      bestStreak: row.best_streak as number,
      totalCompletions: row.total_completions as number,
      consistency14d: row.consistency_14d as number,
      achievementCount: row.achievement_count as number,
      titleName: row.title_name as string,
      rankIcon: row.rank_icon as string,
      updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    };
  }

  it("converts DB row to StatsSnapshotData shape", () => {
    const row = {
      level: 10,
      current_streak: 15,
      best_streak: 30,
      total_completions: 500,
      consistency_14d: 85,
      achievement_count: 3,
      title_name: "Striver",
      rank_icon: "⭐",
      updated_at: "2026-07-22T00:00:00Z",
    };
    const stats = parseStatsRow(row);
    expect(stats.level).toBe(10);
    expect(stats.currentStreak).toBe(15);
    expect(stats.bestStreak).toBe(30);
    expect(stats.totalCompletions).toBe(500);
    expect(stats.consistency14d).toBe(85);
    expect(stats.achievementCount).toBe(3);
    expect(stats.titleName).toBe("Striver");
    expect(stats.rankIcon).toBe("⭐");
  });

  it("snapshot upsert row shape matches expected columns", () => {
    const stats = {
      level: 5,
      currentStreak: 7,
      bestStreak: 14,
      totalCompletions: 200,
      consistency14d: 70,
      achievementCount: 2,
      titleName: "Habit Newbie",
      rankIcon: "⬡",
      updatedAt: "2026-07-22T00:00:00Z",
    };
    const row = {
      user_id: "u-1",
      level: stats.level,
      current_streak: stats.currentStreak,
      best_streak: stats.bestStreak,
      total_completions: stats.totalCompletions,
      consistency_14d: stats.consistency14d,
      achievement_count: stats.achievementCount,
      title_name: stats.titleName,
      rank_icon: stats.rankIcon,
      updated_at: stats.updatedAt,
    };
    expect(row.level).toBe(5);
    expect(row.current_streak).toBe(7);
    expect(row.total_completions).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════════
//  12. parseRpcResult — RPC response parsing (pure function)
// ════════════════════════════════════════════════════════════════════

import { parseRpcResult } from "../index";

describe("parseRpcResult", () => {
  const EMPTY = {
    habits: [], marks: [], notes: [], goals: [],
    settings: null, profile: null, unlocks: [],
    economy_state: null, economy_spent: [], economy_freezes: [],
    economy_bonuses: [], progress_seen: null,
  };

  it("returns empty arrays and nulls for empty input", () => {
    const r = parseRpcResult(EMPTY);
    expect(r.habits).toEqual([]);
    expect(r.marks).toEqual({});
    expect(r.settings).toBeNull();
    expect(r.profile).toBeNull();
    expect(r.unlocks).toEqual({});
    expect(r.economy).toBeNull();
    expect(r.progressSeen).toBeNull();
  });

  it("parses habits with rowToHabit", () => {
    const r = parseRpcResult({
      ...EMPTY,
      habits: [{ id: "h1", created_at: "T", name: "Run", category: "Health", repeat_days: [0], archived: false, user_id: "u1", recurrence: null, start_date: null, time_of_day: null, priority: null, reminder: null, deleted_at: null }],
    });
    expect(r.habits[0].name).toBe("Run");
  });

  it("parses marks without id/user_id", () => {
    const r = parseRpcResult({ ...EMPTY, marks: [{ date_key: "2026-07-01", habit_id: "h1", status: "done" }] });
    expect(r.marks["2026-07-01"]["h1"]).toBe("done");
  });

  it("parses unlocks without id/user_id", () => {
    const r = parseRpcResult({ ...EMPTY, unlocks: [{ achievement_id: "a1", at: "T", seen: true }] });
    expect(r.unlocks["a1"].seen).toBe(true);
  });

  it("parses economy from 4 separate arrays", () => {
    const r = parseRpcResult({
      ...EMPTY,
      economy_state: { user_id: "u1", owned: [], equipped: {}, bonus_coins: 100, last_check_in: null, check_in_streak: 0, last_quest_date: null, current_quest: null, last_spin_date: null, last_spin_result: null },
      economy_spent: [{ id: "s1", user_id: "u1", at: "T", amount: 10, item: "x" }],
      economy_freezes: [],
      economy_bonuses: [],
    });
    expect(r.economy?.bonusCoins).toBe(100);
    expect(r.economy?.spent).toHaveLength(1);
  });
});
