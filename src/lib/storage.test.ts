import { describe, it, expect, beforeEach } from "vitest";
import {
  loadData,
  saveData,
  STORAGE_KEY,
  SCHEMA_VERSION,
  emptyData,
} from "./storage";
import type { AppData } from "./types";

// jsdom-free localStorage stub on globalThis.window.
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
  // @ts-expect-error - minimal window for the test
  globalThis.window = { localStorage: ls };
}

function write(value: unknown) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

describe("loadData validation", () => {
  beforeEach(() => {
    installStorage();
  });

  it("returns emptyData when nothing is stored", () => {
    expect(loadData()).toEqual(emptyData);
  });

  it("returns emptyData on non-JSON garbage", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadData()).toEqual(emptyData);
  });

  it("returns emptyData when the root is not an object", () => {
    write([1, 2, 3]);
    expect(loadData()).toEqual(emptyData);
  });

  it("stamps the current schema version", () => {
    write({ habits: [] });
    expect(loadData().version).toBe(SCHEMA_VERSION);
  });

  it("drops habits with a bad shape but keeps valid ones", () => {
    write({
      habits: [
        {
          id: "ok",
          name: "Run",
          category: "Health",
          repeatDays: [1, 2],
          createdAt: "2026-06-01",
        },
        {
          id: "bad-cat",
          name: "X",
          category: "Nonsense",
          repeatDays: [],
          createdAt: "2026-06-01",
        },
        { id: "missing-fields" },
        "not even an object",
      ],
    });
    const { habits } = loadData();
    expect(habits).toHaveLength(1);
    expect(habits[0].id).toBe("ok");
  });

  it("filters out-of-range weekday numbers from repeatDays", () => {
    write({
      habits: [
        {
          id: "h",
          name: "R",
          category: "Health",
          repeatDays: [0, 7, 3, -1, 2.5],
          createdAt: "2026-06-01",
        },
      ],
    });
    expect(loadData().habits[0].repeatDays).toEqual([0, 3]);
  });

  it("keeps valid richer habit fields and drops malformed ones", () => {
    write({
      habits: [
        {
          id: "h",
          name: "R",
          category: "Health",
          repeatDays: [],
          createdAt: "2026-06-01",
          recurrence: { kind: "weekly", weekdays: [1, 9, 3] }, // 9 is dropped
          priority: "high",
          archived: true,
          timeOfDay: "07:30",
          reminder: { enabled: true, time: "07:00" },
          startDate: "2026-06-02",
        },
      ],
    });
    const h = loadData().habits[0];
    expect(h.recurrence).toEqual({ kind: "weekly", weekdays: [1, 3] });
    expect(h.priority).toBe("high");
    expect(h.archived).toBe(true);
    expect(h.reminder).toEqual({ enabled: true, time: "07:00" });
    expect(h.startDate).toBe("2026-06-02");
  });

  it("keeps only valid mark statuses and drops empty days", () => {
    write({
      marks: {
        "2026-06-10": { a: "done", b: "bogus" },
        "2026-06-11": { c: "weird" }, // becomes empty -> dropped
        "2026-06-12": "not an object",
      },
    });
    expect(loadData().marks).toEqual({ "2026-06-10": { a: "done" } });
  });

  it("migrates legacy notes (object) into Note[]", () => {
    write({
      notes: { "2026-06-10": "hi", "2026-06-11": 42, "2026-06-12": "  " },
    });
    const notes = loadData().notes;
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toBe("hi");
    expect(notes[0].links.date).toBe("2026-06-10");
    expect(notes[0].tags).toEqual([]);
  });

  it("keeps well-formed Note[] entries", () => {
    write({
      version: SCHEMA_VERSION,
      notes: [
        {
          id: "n1",
          createdAt: "2026-06-10T00:00:00Z",
          updatedAt: "2026-06-10T00:00:00Z",
          body: "x",
          tags: ["a"],
          links: { habitId: "h" },
        },
        { id: "bad" }, // dropped
      ],
    });
    const notes = loadData().notes;
    expect(notes).toHaveLength(1);
    expect(notes[0].links.habitId).toBe("h");
  });

  it("drops malformed goals and keeps richer goal fields", () => {
    write({
      goals: [
        {
          id: "g",
          title: "Read",
          target: 10,
          current: 3,
          createdAt: "2026-06-01",
          category: "Studies",
          deadline: "2026-12-31",
          milestones: [{ id: "m", title: "Halfway", at: 5, done: false }],
        },
        {
          id: "bad",
          title: "No numbers",
          target: "ten",
          current: 0,
          createdAt: "2026-06-01",
        },
      ],
    });
    const { goals } = loadData();
    expect(goals).toHaveLength(1);
    expect(goals[0].category).toBe("Studies");
    expect(goals[0].milestones).toHaveLength(1);
  });

  it("keeps valid audit-log entries", () => {
    write({
      auditLog: [
        {
          id: "a1",
          at: "2026-06-10T10:00:00Z",
          action: "habit.create",
          summary: "Created X",
          habitId: "h",
        },
        {
          id: "a2",
          at: "2026-06-10T10:00:00Z",
          action: "not-real",
          summary: "nope",
        },
      ],
    });
    const { auditLog } = loadData();
    expect(auditLog).toHaveLength(1);
    expect(auditLog[0].action).toBe("habit.create");
  });

  it("falls back to defaults for an invalid theme", () => {
    write({ settings: { theme: { mode: "neon", accent: "ultraviolet" } } });
    expect(loadData().settings.theme).toEqual({ mode: "dark", accent: "blue" });
  });

  it("preserves a valid theme and grace setting", () => {
    write({
      settings: { theme: { mode: "light", accent: "rose" }, graceHours: 3 },
    });
    const s = loadData().settings;
    expect(s.theme).toEqual({ mode: "light", accent: "rose" });
    expect(s.graceHours).toBe(3);
  });

  it("round-trips full data through save then load", () => {
    const data: AppData = {
      version: SCHEMA_VERSION,
      habits: [
        {
          id: "h",
          name: "R",
          category: "Health",
          repeatDays: [1],
          createdAt: "2026-06-01",
        },
      ],
      marks: { "2026-06-10": { h: "done" } },
      notes: [
        {
          id: "n",
          createdAt: "2026-06-10T00:00:00.000Z",
          updatedAt: "2026-06-10T00:00:00.000Z",
          body: "good",
          tags: [],
          links: { date: "2026-06-10" },
        },
      ],
      goals: [
        {
          id: "g",
          title: "Read",
          target: 5,
          current: 1,
          createdAt: "2026-06-01",
        },
      ],
      auditLog: [
        {
          id: "a",
          at: "2026-06-01T00:00:00.000Z",
          action: "habit.create",
          summary: "Created R",
          habitId: "h",
        },
      ],
      settings: {
        theme: { mode: "dark", accent: "blue" },
        graceHours: 5,
        usedTemplateIds: [],
      },
      profile: { displayName: "Justin", username: "justin" },
      unlocks: { "streak-7": { at: "2026-06-10T00:00:00.000Z", seen: true } },
      economy: {
        spent: [
          {
            id: "s1",
            at: "2026-06-11T00:00:00.000Z",
            amount: 120,
            item: "flame-azure",
          },
        ],
        owned: ["flame-azure"],
        equipped: { flame: "flame-azure" },
        freezes: [
          {
            id: "f1",
            at: "2026-06-12T00:00:00.000Z",
            date: "2026-06-09",
            habitId: "h",
          },
        ],
        bonusCoins: 0,
        lastCheckIn: null,
        checkInStreak: 0,
        lastQuestDate: null,
        currentQuest: null,
        lastSpinDate: null,
        lastSpinResult: null,
      },
      progressSeen: {
        seeded: true,
        level: 4,
        title: "Procrastination Survivor",
        shop: ["flame-gold"],
        streaks: { h: 7 },
        tierUnlocks: [],
      },
    };
    saveData(data);
    expect(loadData()).toEqual(data);
  });

  it("defaults progressSeen for pre-v5 saves", () => {
    write({ habits: [] });
    expect(loadData().progressSeen).toEqual( {
      seeded: false,
      level: 1,
      title: "Habit Newbie",
      shop: [],
      streaks: {},
      tierUnlocks: [],
    });
  });

  it("defaults profile and unlocks for pre-v3 saves", () => {
    write({ habits: [] });
    const { profile, unlocks } = loadData();
    expect(profile.displayName).toBe("Justin");
    expect(unlocks).toEqual({});
  });

  it("keeps valid unlocks and drops malformed ones", () => {
    write({
      unlocks: {
        "streak-7": { at: "2026-06-10T00:00:00Z", seen: true },
        "no-timestamp": { seen: true },
        "bad-shape": "nope",
      },
    });
    const { unlocks } = loadData();
    expect(Object.keys(unlocks)).toEqual(["streak-7"]);
    expect(unlocks["streak-7"]).toEqual({
      at: "2026-06-10T00:00:00Z",
      seen: true,
    });
  });
});
