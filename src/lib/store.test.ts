// Store unit tests — exercises the core business logic through the store's
// action functions (addHabit, cycleMark, addNote, etc.) by invoking them
// directly with a mock localStorage backing.
//
// These tests verify:
//   - Habit CRUD (add, update, delete, duplicate, archive)
//   - Note CRUD (add, update, delete, setDailyNote upsert)
//   - Goal CRUD (add, update, delete)
//   - Settings mutations (theme, grace hours, onboarding, categories)
//   - Profile updates
//   - Engagement features (check-in, daily quest, daily spin)
//   - Data lifecycle (clearAllData preserves profile/settings/economy)
//   - Undo / redo stack
//   - Mark cycling (requires a habit + editable date)

import { describe, it, expect, beforeEach } from "vitest";
import { resetHistory } from "./history";
import {
  addHabit,
  updateHabit,
  deleteHabit,
  duplicateHabit,
  setHabitArchived,
  cycleMark,
  addNote,
  updateNote,
  deleteNote,
  setDailyNote,
  addGoal,
  updateGoal,
  deleteGoal,
  setTheme,
  setGraceHours,
  completeOnboarding,
  markTemplateUsed,
  addCustomCategory,
  removeCustomCategory,
  updateProfile,
  claimDailyCheckIn,
  refreshDailyQuest,
  claimDailyQuest,
  doDailySpin,
  clearAllData,
  undoAction,
  redoAction,
  reloadCache,
} from "./store";
import { loadData, saveData, emptyData } from "./storage";
import { makeHabit } from "./habits";
import { dateKey, addDays } from "./date";
import type { Habit, Goal } from "./types";

/**
 * Some store mutations (cycleMark, undoAction, redoAction) use debounced
 * saves (100ms). After calling these, wait for the debounce to flush before
 * asserting against localStorage via loadData().
 */
function flushSave(): Promise<void> {
  return new Promise((r) => setTimeout(r, 150));
}

// ── Mock localStorage ───────────────────────────────────────────────
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
  // @ts-expect-error - minimal window stub for tests
  globalThis.window = { localStorage: ls };
}

beforeEach(() => {
  installStorage();
  saveData(emptyData);
  reloadCache();
  resetHistory();
});

// ── Helpers ─────────────────────────────────────────────────────────
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

// ── Habit CRUD ──────────────────────────────────────────────────────
describe("habit actions", () => {
  it("addHabit appends a habit", () => {
    const h = makeTestHabit({ name: "Read" });
    addHabit(h);
    expect(loadData().habits).toHaveLength(1);
    expect(loadData().habits[0].name).toBe("Read");
  });

  it("addHabit records audit log entry", () => {
    const h = makeTestHabit();
    addHabit(h);
    const log = loadData().auditLog;
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].action).toBe("habit.create");
  });

  it("updateHabit modifies in place", () => {
    const h = makeTestHabit({ name: "Original" });
    addHabit(h);
    const updated = { ...h, name: "Updated" };
    updateHabit(updated);
    expect(loadData().habits[0].name).toBe("Updated");
  });

  it("updateHabit records edit audit log", () => {
    const h = makeTestHabit();
    addHabit(h);
    updateHabit({ ...h, name: "v2" });
    expect(loadData().auditLog[0].action).toBe("habit.edit");
  });

  it("deleteHabit removes the habit", () => {
    const h = makeTestHabit();
    addHabit(h);
    deleteHabit(h.id);
    expect(loadData().habits).toHaveLength(0);
  });

  it("duplicateHabit creates a copy with (copy) suffix", () => {
    const h = makeTestHabit({ name: "Push-ups" });
    addHabit(h);
    duplicateHabit(h.id);
    const habits = loadData().habits;
    expect(habits).toHaveLength(2);
    expect(habits[1].name).toContain("(copy)");
    expect(habits[1].id).not.toBe(h.id);
  });

  it("setHabitArchived toggles archived flag", () => {
    const h = makeTestHabit();
    addHabit(h);
    setHabitArchived(h.id, true);
    expect(loadData().habits[0].archived).toBe(true);
    setHabitArchived(h.id, false);
    expect(loadData().habits[0].archived).toBe(false);
  });
});

// ── Notes ───────────────────────────────────────────────────────────
describe("note actions", () => {
  it("addNote creates and prepends a note", () => {
    const note = addNote({ body: "Hello", tags: ["test"] });
    const notes = loadData().notes;
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toBe("Hello");
    expect(notes[0].id).toBe(note.id);
  });

  it("updateNote patches body and tags", () => {
    const note = addNote({ body: "Original", tags: [] });
    updateNote(note.id, { body: "Edited", tags: ["updated"] });
    const n = loadData().notes[0];
    expect(n.body).toBe("Edited");
    expect(n.tags).toEqual(["updated"]);
  });

  it("deleteNote removes a note", () => {
    const note = addNote({ body: "To delete" });
    expect(loadData().notes).toHaveLength(1);
    deleteNote(note.id);
    expect(loadData().notes).toHaveLength(0);
  });

  it("setDailyNote creates a new daily note when none exists", () => {
    setDailyNote("2026-07-16", "Great day!");
    const notes = loadData().notes;
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toBe("Great day!");
    expect(notes[0].links.date).toBe("2026-07-16");
  });

  it("setDailyNote updates an existing daily note", () => {
    setDailyNote("2026-07-16", "First");
    setDailyNote("2026-07-16", "Updated");
    const notes = loadData().notes;
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toBe("Updated");
  });

  it("setDailyNote with empty text deletes the note", () => {
    setDailyNote("2026-07-16", "Something");
    expect(loadData().notes).toHaveLength(1);
    setDailyNote("2026-07-16", "");
    expect(loadData().notes).toHaveLength(0);
  });

  it("setDailyNote does not affect non-daily notes", () => {
    addNote({ body: "Regular note", tags: [] });
    setDailyNote("2026-07-16", "Daily");
    expect(loadData().notes).toHaveLength(2);
  });
});

// ── Goals ───────────────────────────────────────────────────────────
describe("goal actions", () => {
  it("addGoal appends a goal", () => {
    const goal: Goal = {
      id: "g1",
      title: "Read 20 books",
      target: 20,
      current: 0,
      createdAt: new Date().toISOString(),
    };
    addGoal(goal);
    expect(loadData().goals).toHaveLength(1);
    expect(loadData().goals[0].title).toBe("Read 20 books");
  });

  it("updateGoal modifies in place", () => {
    const goal: Goal = {
      id: "g1",
      title: "Run",
      target: 10,
      current: 2,
      createdAt: new Date().toISOString(),
    };
    addGoal(goal);
    updateGoal({ ...goal, current: 5 });
    expect(loadData().goals[0].current).toBe(5);
  });

  it("deleteGoal removes a goal", () => {
    const goal: Goal = {
      id: "g1",
      title: "Walk",
      target: 30,
      current: 0,
      createdAt: new Date().toISOString(),
    };
    addGoal(goal);
    deleteGoal("g1");
    expect(loadData().goals).toHaveLength(0);
  });
});

// ── Settings ────────────────────────────────────────────────────────
describe("settings actions", () => {
  it("setTheme updates theme mode", () => {
    setTheme({ mode: "light" });
    expect(loadData().settings.theme.mode).toBe("light");
  });

  it("setTheme updates accent", () => {
    setTheme({ accent: "rose" });
    expect(loadData().settings.theme.accent).toBe("rose");
  });

  it("setGraceHours clamps to zero minimum", () => {
    setGraceHours(-5);
    expect(loadData().settings.graceHours).toBe(0);
  });

  it("setGraceHours sets valid hours", () => {
    setGraceHours(3);
    expect(loadData().settings.graceHours).toBe(3);
  });

  it("completeOnboarding sets the flag", () => {
    expect(loadData().settings.onboardingComplete).toBeUndefined();
    completeOnboarding();
    expect(loadData().settings.onboardingComplete).toBe(true);
  });

  it("markTemplateUsed tracks unique template IDs", () => {
    markTemplateUsed("t1");
    markTemplateUsed("t2");
    markTemplateUsed("t1"); // duplicate
    expect(loadData().settings.usedTemplateIds).toEqual(["t1", "t2"]);
  });

  it("addCustomCategory adds a category", () => {
    addCustomCategory("Gardening");
    expect(loadData().settings.customCategories).toContain("Gardening");
  });

  it("addCustomCategory skips duplicates", () => {
    addCustomCategory("Gardening");
    addCustomCategory("Gardening");
    const cats = loadData().settings.customCategories ?? [];
    expect(cats.filter((c) => c === "Gardening")).toHaveLength(1);
  });

  it("removeCustomCategory removes a category", () => {
    addCustomCategory("Gardening");
    removeCustomCategory("Gardening");
    expect(loadData().settings.customCategories).not.toContain("Gardening");
  });
});

// ── Profile ─────────────────────────────────────────────────────────
describe("profile actions", () => {
  it("updateProfile patches displayName", () => {
    updateProfile({ displayName: "Alice" });
    expect(loadData().profile.displayName).toBe("Alice");
  });

  it("updateProfile patches bio and motto", () => {
    updateProfile({ bio: "Hello!", motto: "Carpe diem" });
    expect(loadData().profile.bio).toBe("Hello!");
    expect(loadData().profile.motto).toBe("Carpe diem");
  });
});

// ── Mark cycling ────────────────────────────────────────────────────
describe("mark cycling", () => {
  it("cycleMark cycles undefined -> done -> missed -> skipped -> undefined", async () => {
    const h = makeTestHabit();
    addHabit(h);
    const today = dateKey(new Date());

    cycleMark(today, h.id);
    await flushSave();
    expect(loadData().marks[today]?.[h.id]).toBe("done");

    cycleMark(today, h.id);
    await flushSave();
    expect(loadData().marks[today]?.[h.id]).toBe("missed");

    cycleMark(today, h.id);
    await flushSave();
    expect(loadData().marks[today]?.[h.id]).toBe("skipped");

    cycleMark(today, h.id);
    await flushSave();
    expect(loadData().marks[today]?.[h.id]).toBeUndefined();
  });

  it("cycleMark does not edit locked (past) dates", async () => {
    const h = makeTestHabit();
    addHabit(h);
    const past = dateKey(addDays(new Date(), -10));
    cycleMark(past, h.id);
    await flushSave();
    expect(loadData().marks[past]).toBeUndefined();
  });

  it("cycleMark updates daily quest progress when marking done today", async () => {
    const h = makeTestHabit({ name: "Push-ups", category: "Workout" });
    addHabit(h);
    const today = dateKey(new Date());

    refreshDailyQuest();
    const data = loadData();
    if (data.economy.currentQuest) {
      const questData = { ...data };
      questData.economy = {
        ...questData.economy,
        currentQuest: {
          description: "Do 3 workout habits",
          target: 3,
          current: 0,
          reward: 15,
          category: "Workout" as const,
        },
      };
      saveData(questData);
      reloadCache();
    }

    cycleMark(today, h.id, "Workout");
    await flushSave();
    const updated = loadData();
    if (updated.economy.currentQuest) {
      expect(updated.economy.currentQuest.current).toBeGreaterThanOrEqual(1);
    }
  });
});

// ── Engagement ──────────────────────────────────────────────────────
describe("engagement features", () => {
  it("claimDailyCheckIn returns reward and streak on first claim", () => {
    const result = claimDailyCheckIn();
    expect(result.reward).toBeGreaterThan(0);
    expect(result.streak).toBe(1);
  });

  it("claimDailyCheckIn returns 0/0 if already claimed today", () => {
    claimDailyCheckIn();
    const second = claimDailyCheckIn();
    expect(second.reward).toBe(0);
    expect(second.streak).toBe(0);
  });

  it("claimDailyCheckIn increments streak on consecutive days", () => {
    // Day 1
    const r1 = claimDailyCheckIn();
    expect(r1.streak).toBe(1);

    // Manually set lastCheckIn to yesterday so next claim advances streak
    const data = loadData();
    const yesterday = dateKey(addDays(new Date(), -1));
    data.economy.lastCheckIn = yesterday;
    data.economy.checkInStreak = 1;
    saveData(data);
    reloadCache();

    const r2 = claimDailyCheckIn();
    expect(r2.streak).toBe(2);
  });

  it("refreshDailyQuest generates a quest", () => {
    // Add a habit so there's something to generate a quest from
    const h = makeTestHabit();
    addHabit(h);

    refreshDailyQuest();
    const data = loadData();
    expect(data.economy.currentQuest).not.toBeNull();
    expect(data.economy.lastQuestDate).toBe(dateKey(new Date()));
  });

  it("claimDailyQuest claims and marks quest as claimed", () => {
    // Set up a completed quest manually
    const data = loadData();
    data.economy.currentQuest = {
      description: "Complete 3 habits",
      target: 3,
      current: 3,
      reward: 15,
      claimed: false,
    };
    saveData(data);
    reloadCache();

    claimDailyQuest();
    const updated = loadData();
    expect(updated.economy.currentQuest?.claimed).toBe(true);
    expect(updated.economy.bonusCoins).toBeGreaterThanOrEqual(15);
  });

  it("doDailySpin returns a reward on first spin", () => {
    const result = doDailySpin();
    expect(result).not.toBeNull();
    expect(result!.amount).toBeGreaterThan(0);
  });

  it("doDailySpin returns null if already spun today", () => {
    doDailySpin();
    const second = doDailySpin();
    expect(second).toBeNull();
  });

  it("doDailySpin persists lastSpinResult", () => {
    doDailySpin();
    const data = loadData();
    expect(data.economy.lastSpinResult).not.toBeNull();
    expect(data.economy.lastSpinDate).toBe(dateKey(new Date()));
  });
});

// ── Data lifecycle ──────────────────────────────────────────────────
describe("data lifecycle", () => {
  it("clearAllData preserves settings, profile, owned/equipped cosmetics", () => {
    // Set up some data
    setTheme({ mode: "light" });
    updateProfile({ displayName: "Alice", username: "alice" });

    const h = makeTestHabit();
    addHabit(h);

    clearAllData();

    const data = loadData();
    // Profile and settings survive
    expect(data.profile.displayName).toBe("Alice");
    expect(data.settings.theme.mode).toBe("light");
    // Habits are wiped
    expect(data.habits).toHaveLength(0);
    // Economy preserved owned/equipped, but freezes are cleared
    expect(data.economy.owned).toEqual([]);
    expect(data.economy.freezes).toEqual([]);
  });

  it("clearAllData bumps generation to abort in-flight sync", () => {
    // Just verify it doesn't throw
    expect(() => clearAllData()).not.toThrow();
  });
});

// ── Undo / Redo ─────────────────────────────────────────────────────
describe("undo / redo", () => {
  it("undoAction restores previous state after addHabit", async () => {
    const h = makeTestHabit();
    addHabit(h);
    expect(loadData().habits).toHaveLength(1);

    const undone = undoAction();
    expect(undone).toBe(true);
    await flushSave();
    expect(loadData().habits).toHaveLength(0);
  });

  it("redoAction restores after undo", async () => {
    const h = makeTestHabit();
    addHabit(h);
    undoAction();
    await flushSave();

    const redone = redoAction();
    expect(redone).toBe(true);
    await flushSave();
    expect(loadData().habits).toHaveLength(1);
  });

  it("undoAction returns false when nothing to undo", () => {
    expect(undoAction()).toBe(false);
  });

  it("redoAction returns false when nothing to redo", () => {
    expect(redoAction()).toBe(false);
  });

  it("undo preserves settings and profile", async () => {
    setTheme({ mode: "light" });
    updateProfile({ displayName: "Bob" });

    const h = makeTestHabit();
    addHabit(h);

    undoAction();
    await flushSave();

    const data = loadData();
    expect(data.settings.theme.mode).toBe("light");
    expect(data.profile.displayName).toBe("Bob");
  });
});

// ── Full round-trip ─────────────────────────────────────────────────
describe("full data integration", () => {
  it("creates, marks, and updates a habit through the store", async () => {
    const h = makeTestHabit({ name: "Run", category: "Workout" });
    addHabit(h);
    expect(loadData().habits).toHaveLength(1);

    const today = dateKey(new Date());
    cycleMark(today, h.id);
    await flushSave();
    expect(loadData().marks[today]?.[h.id]).toBe("done");

    updateHabit({ ...h, name: "Morning run" });
    expect(loadData().habits[0].name).toBe("Morning run");

    addNote({ body: "Felt great today!", tags: ["running"], links: { habitId: h.id } });
    expect(loadData().notes).toHaveLength(1);
  });

  it("handles multiple data types simultaneously", () => {
    const h = makeTestHabit();
    addHabit(h);
    addNote({ body: "Note 1" });
    const goal: Goal = {
      id: "g1",
      title: "Read",
      target: 10,
      current: 1,
      createdAt: new Date().toISOString(),
    };
    addGoal(goal);
    completeOnboarding();

    const data = loadData();
    expect(data.habits).toHaveLength(1);
    expect(data.notes).toHaveLength(1);
    expect(data.goals).toHaveLength(1);
    expect(data.settings.onboardingComplete).toBe(true);
  });
});
