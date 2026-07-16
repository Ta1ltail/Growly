import { describe, it, expect } from "vitest";
import {
  mergeProfile,
  mergeSettings,
  mergeProgressSeen,
  mergeById,
  isEmptyEconomy,
} from "./sync";
import { computeDataHash } from "@/components/sync/SyncProvider";
import { DEFAULT_PROFILE, DEFAULT_PROGRESS_SEEN, DEFAULT_ECONOMY } from "../types";
import type { AppData, Economy, Profile, ProgressSeen } from "../types";
import { emptyData } from "../storage";

/* ──────────────────────────────────────────────
   mergeProfile
   ────────────────────────────────────────────── */

describe("mergeProfile", () => {
  const makeProfile = (overrides?: Partial<Profile>): Profile => ({
    ...DEFAULT_PROFILE,
    ...overrides,
  });

  it("returns local when remote is undefined", () => {
    const local = makeProfile({ displayName: "Alice", username: "alice" });
    expect(mergeProfile(local, undefined)).toBe(local);
  });

  it("prefers remote displayName when local is default", () => {
    const local = makeProfile();
    const remote = makeProfile({ displayName: "Alice", username: "alice_xyz" });
    const result = mergeProfile(local, remote);
    expect(result.displayName).toBe("Alice");
    expect(result.username).toBe("alice_xyz");
  });

  it("prefers local displayName when it differs from default", () => {
    const local = makeProfile({ displayName: "Custom", username: "user" });
    const remote = makeProfile({ displayName: "Server", username: "server_abc" });
    const result = mergeProfile(local, remote);
    expect(result.displayName).toBe("Custom");
  });

  it("prefers local username when it differs from default", () => {
    const local = makeProfile({ displayName: "User", username: "custom_user" });
    const remote = makeProfile({ displayName: "Server", username: "server_abc" });
    const result = mergeProfile(local, remote);
    expect(result.username).toBe("custom_user");
  });

  it("uses remote bio when local bio is unset", () => {
    const local = makeProfile();
    const remote = makeProfile({ bio: "Remote bio here" });
    const result = mergeProfile(local, remote);
    expect(result.bio).toBe("Remote bio here");
  });

  it("preserves local bio when explicitly set (even empty string)", () => {
    const local = makeProfile({ bio: "" });
    const remote = makeProfile({ bio: "Remote bio" });
    const result = mergeProfile(local, remote);
    expect(result.bio).toBe("");
  });

  it("uses remote motto when local is default", () => {
    const local = makeProfile();
    const remote = makeProfile({ motto: "Custom motto" });
    const result = mergeProfile(local, remote);
    expect(result.motto).toBe("Custom motto");
  });

  it("preserves local motto when it differs from default", () => {
    const local = makeProfile({ motto: "My motto" });
    const remote = makeProfile({ motto: "Remote motto" });
    const result = mergeProfile(local, remote);
    expect(result.motto).toBe("My motto");
  });

  it("uses remote avatar when local is unset", () => {
    const local = makeProfile();
    const remote = makeProfile({ avatar: "fox" });
    const result = mergeProfile(local, remote);
    expect(result.avatar).toBe("fox");
  });

  it("preserves local avatar when set", () => {
    const local = makeProfile({ avatar: "dragon" });
    const remote = makeProfile({ avatar: "fox" });
    const result = mergeProfile(local, remote);
    expect(result.avatar).toBe("dragon");
  });

  it("uses remote showcaseBadgeId when local is unset", () => {
    const local = makeProfile();
    const remote = makeProfile({ showcaseBadgeId: "streak-100" });
    const result = mergeProfile(local, remote);
    expect(result.showcaseBadgeId).toBe("streak-100");
  });
});

/* ──────────────────────────────────────────────
   mergeSettings
   ────────────────────────────────────────────── */

describe("mergeSettings", () => {
  const makeSettings = (overrides?: Partial<AppData["settings"]>): AppData["settings"] => ({
    theme: { mode: "dark", accent: "blue" },
    graceHours: 5,
    usedTemplateIds: [],
    customCategories: [],
    ...overrides,
  });

  it("returns local when remote is undefined", () => {
    const local = makeSettings({ theme: { mode: "light", accent: "rose" } });
    expect(mergeSettings(local, undefined)).toBe(local);
  });

  it("prefers remote theme when local is default", () => {
    const local = makeSettings();
    const remote = makeSettings({ theme: { mode: "light", accent: "violet" } });
    const result = mergeSettings(local, remote);
    expect(result.theme.mode).toBe("light");
    expect(result.theme.accent).toBe("violet");
  });

  it("prefers local theme when customized", () => {
    const local = makeSettings({ theme: { mode: "light", accent: "rose" } });
    const remote = makeSettings({ theme: { mode: "dark", accent: "blue" } });
    const result = mergeSettings(local, remote);
    expect(result.theme.mode).toBe("light");
    expect(result.theme.accent).toBe("rose");
  });

  it("prefers remote graceHours when local is default", () => {
    const local = makeSettings();
    const remote = makeSettings({ graceHours: 12 });
    const result = mergeSettings(local, remote);
    expect(result.graceHours).toBe(12);
  });

  it("prefers local graceHours when customized", () => {
    const local = makeSettings({ graceHours: 3 });
    const remote = makeSettings({ graceHours: 12 });
    const result = mergeSettings(local, remote);
    expect(result.graceHours).toBe(3);
  });

  it("prefers remote usedTemplateIds when local is empty", () => {
    const local = makeSettings();
    const remote = makeSettings({ usedTemplateIds: ["gym", "morning"] });
    const result = mergeSettings(local, remote);
    expect(result.usedTemplateIds).toEqual(["gym", "morning"]);
  });

  it("prefers local usedTemplateIds when not empty", () => {
    const local = makeSettings({ usedTemplateIds: ["student"] });
    const remote = makeSettings({ usedTemplateIds: ["gym"] });
    const result = mergeSettings(local, remote);
    expect(result.usedTemplateIds).toEqual(["student"]);
  });

  it("prefers remote widgetOrder when local is unset", () => {
    const local = makeSettings();
    const remote = makeSettings({ widgetOrder: ["stats", "habits"] });
    const result = mergeSettings(local, remote);
    expect(result.widgetOrder).toEqual(["stats", "habits"]);
  });

  it("prefers local widgetOrder when set", () => {
    const local = makeSettings({ widgetOrder: ["habits", "stats"] });
    const remote = makeSettings({ widgetOrder: ["stats", "habits"] });
    const result = mergeSettings(local, remote);
    expect(result.widgetOrder).toEqual(["habits", "stats"]);
  });

  it("prefers remote onboardingComplete when local is unset", () => {
    const local = makeSettings();
    const remote = makeSettings({ onboardingComplete: true });
    const result = mergeSettings(local, remote);
    expect(result.onboardingComplete).toBe(true);
  });

  it("prefers local onboardingComplete when set", () => {
    const local = makeSettings({ onboardingComplete: true });
    const remote = makeSettings();
    const result = mergeSettings(local, remote);
    expect(result.onboardingComplete).toBe(true);
  });
});

/* ──────────────────────────────────────────────
   mergeProgressSeen
   ────────────────────────────────────────────── */

describe("mergeProgressSeen", () => {
  const seeded = (overrides?: Partial<ProgressSeen>): ProgressSeen => ({
    ...DEFAULT_PROGRESS_SEEN,
    seeded: true,
    ...overrides,
  });

  const unseeded = (overrides?: Partial<ProgressSeen>): ProgressSeen => ({
    ...DEFAULT_PROGRESS_SEEN,
    ...overrides,
  });

  it("returns DEFAULT_PROGRESS_SEEN when both are undefined", () => {
    const result = mergeProgressSeen(undefined, undefined);
    expect(result).toEqual(DEFAULT_PROGRESS_SEEN);
  });

  it("returns local when remote is undefined", () => {
    const local = seeded({ level: 10 });
    expect(mergeProgressSeen(local, undefined)).toBe(local);
  });

  it("returns remote when local is undefined", () => {
    const remote = seeded({ level: 10 });
    expect(mergeProgressSeen(undefined, remote)).toBe(remote);
  });

  it("prefers remote when local is unseeded", () => {
    const local = unseeded();
    const remote = seeded({ level: 15, title: "Consistency Master" });
    const result = mergeProgressSeen(local, remote);
    expect(result.level).toBe(15);
    expect(result.title).toBe("Consistency Master");
  });

  it("prefers local when remote is unseeded", () => {
    const local = seeded({ level: 15 });
    const remote = unseeded();
    const result = mergeProgressSeen(local, remote);
    expect(result.level).toBe(15);
  });

  it("prefers local level when > 1", () => {
    const local = seeded({ level: 15 });
    const remote = seeded({ level: 10 });
    const result = mergeProgressSeen(local, remote);
    expect(result.level).toBe(15);
  });

  it("prefers remote level when local is 1", () => {
    const local = seeded({ level: 1 });
    const remote = seeded({ level: 10 });
    const result = mergeProgressSeen(local, remote);
    expect(result.level).toBe(10);
  });

  it("prefers local title when not default", () => {
    const local = seeded({ title: "Consistency Master" });
    const remote = seeded({ title: "Habit Newbie" });
    const result = mergeProgressSeen(local, remote);
    expect(result.title).toBe("Consistency Master");
  });

  it("prefers remote shop when local is empty", () => {
    const local = seeded({ shop: [] });
    const remote = seeded({ shop: ["flame-gold", "confetti-neon"] });
    const result = mergeProgressSeen(local, remote);
    expect(result.shop).toEqual(["flame-gold", "confetti-neon"]);
  });
});

/* ──────────────────────────────────────────────
   mergeById
   ────────────────────────────────────────────── */

describe("mergeById", () => {
  it("returns empty array when both empty", () => {
    expect(mergeById([], [])).toEqual([]);
  });

  it("merges two arrays by id, local overwrites remote", () => {
    const remote = [
      { id: "1", name: "a" },
      { id: "2", name: "b" },
    ];
    const local = [
      { id: "2", name: "updated-b" },
      { id: "3", name: "c" },
    ];
    const result = mergeById(remote, local, (x) => x.id);
    expect(result).toHaveLength(3);
    expect(result.find((x) => x.id === "1")?.name).toBe("a");
    expect(result.find((x) => x.id === "2")?.name).toBe("updated-b");
    expect(result.find((x) => x.id === "3")?.name).toBe("c");
  });

  it("uses default getId when not provided", () => {
    const result = mergeById([{ id: "x", name: "old" }], [{ id: "x", name: "updated" }]);
    expect(result.find((i) => i.id === "x")?.name).toBe("updated");
  });
});

/* ──────────────────────────────────────────────
   isEmptyEconomy
   ────────────────────────────────────────────── */

describe("isEmptyEconomy", () => {
  const fullEconomy: Economy = {
    ...DEFAULT_ECONOMY,
    owned: ["flame-gold"],
    spent: [{ id: "s1", at: "2024-01-01T00:00:00Z", amount: 400, item: "flame-gold" }],
    freezes: [],
    bonusCoins: 0,
    lastCheckIn: null,
    checkInStreak: 0,
    lastQuestDate: null,
    currentQuest: null,
    lastSpinDate: null,
    lastSpinResult: null,
  };

  it("returns true for undefined", () => {
    expect(isEmptyEconomy(undefined)).toBe(true);
  });

  it("returns true for DEFAULT_ECONOMY", () => {
    expect(isEmptyEconomy(DEFAULT_ECONOMY)).toBe(true);
  });

  it("returns false when economy has owned items", () => {
    expect(isEmptyEconomy(fullEconomy)).toBe(false);
  });

  it("returns false when economy has bonusCoins", () => {
    expect(isEmptyEconomy({ ...DEFAULT_ECONOMY, bonusCoins: 100 })).toBe(false);
  });

  it("returns false when economy has checkInStreak", () => {
    expect(isEmptyEconomy({ ...DEFAULT_ECONOMY, checkInStreak: 5 })).toBe(false);
  });

  it("returns false when economy has lastCheckIn", () => {
    expect(isEmptyEconomy({ ...DEFAULT_ECONOMY, lastCheckIn: "2024-01-15" })).toBe(false);
  });

  it("returns true for empty arrays and zeros", () => {
    expect(isEmptyEconomy({
      ...DEFAULT_ECONOMY,
      owned: [],
      spent: [],
      freezes: [],
      equipped: {},
    })).toBe(true);
  });
});

/* ──────────────────────────────────────────────
   computeDataHash
   ────────────────────────────────────────────── */

describe("computeDataHash", () => {
  const base: AppData = { ...emptyData };

  it("produces stable output for same data", () => {
    expect(computeDataHash(base)).toBe(computeDataHash({ ...base }));
  });

  it("changes when habits change", () => {
    const a = computeDataHash(base);
    const modified = {
      ...base,
      habits: [
        { id: "h1", name: "Test", category: "Health" as const, repeatDays: [], createdAt: "2024-01-01T00:00:00Z" },
      ],
    };
    const b = computeDataHash(modified);
    expect(a).not.toBe(b);
  });

  it("changes when marks change (count by status)", () => {
    const a = computeDataHash(base);
    const modified = {
      ...base,
      marks: { "2024-01-15": { h1: "done" as const } },
    };
    expect(a).not.toBe(computeDataHash(modified));
  });

  it("changes when marks status changes (done → missed)", () => {
    const withDone = {
      ...base,
      marks: { "2024-01-15": { h1: "done" as const } },
    };
    const withMissed = {
      ...base,
      marks: { "2024-01-15": { h1: "missed" as const } },
    };
    expect(computeDataHash(withDone)).not.toBe(computeDataHash(withMissed));
  });

  it("changes when notes change", () => {
    const a = computeDataHash(base);
    const modified = {
      ...base,
      notes: [
        {
          id: "n1",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          body: "Test note",
          tags: [],
          links: {},
        },
      ],
    };
    expect(a).not.toBe(computeDataHash(modified));
  });

  it("changes when goals change", () => {
    const a = computeDataHash(base);
    const modified = {
      ...base,
      goals: [
        {
          id: "g1",
          title: "Test goal",
          target: 10,
          current: 3,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
    };
    expect(a).not.toBe(computeDataHash(modified));
  });

  it("changes when settings change", () => {
    const a = computeDataHash(base);
    const modified = {
      ...base,
      settings: {
        ...base.settings,
        theme: { mode: "light" as const, accent: "violet" },
      },
    };
    expect(a).not.toBe(computeDataHash(modified));
  });

  it("changes when profile changes", () => {
    const a = computeDataHash(base);
    const modified = {
      ...base,
      profile: { ...base.profile, displayName: "Changed" },
    };
    expect(a).not.toBe(computeDataHash(modified));
  });

  it("changes when unlocks change", () => {
    const a = computeDataHash(base);
    const modified = {
      ...base,
      unlocks: { "streak-7": { at: "2024-01-01T00:00:00Z", seen: false } },
    };
    expect(a).not.toBe(computeDataHash(modified));
  });

  it("changes when economy changes", () => {
    const a = computeDataHash(base);
    const modified = {
      ...base,
      economy: {
        ...base.economy,
        bonusCoins: 100,
        owned: ["flame-gold"],
        equipped: { flame: "flame-gold" },
      },
    };
    expect(a).not.toBe(computeDataHash(modified));
  });

  it("changes when progressSeen changes", () => {
    const a = computeDataHash(base);
    const modified = {
      ...base,
      progressSeen: { ...base.progressSeen, seeded: true, level: 10 },
    };
    expect(a).not.toBe(computeDataHash(modified));
  });

  it("detects habit name change (not just count)", () => {
    const original = {
      ...base,
      habits: [
        { id: "h1", name: "Original", category: "Health" as const, repeatDays: [], createdAt: "2024-01-01T00:00:00Z" },
      ],
    };
    const renamed = {
      ...base,
      habits: [
        { id: "h1", name: "Renamed", category: "Health" as const, repeatDays: [], createdAt: "2024-01-01T00:00:00Z" },
      ],
    };
    expect(computeDataHash(original)).not.toBe(computeDataHash(renamed));
  });

  it("detects goal progress change (not just count)", () => {
    const original = {
      ...base,
      goals: [
        { id: "g1", title: "Goal", target: 10, current: 3, createdAt: "2024-01-01T00:00:00Z" },
      ],
    };
    const progressed = {
      ...base,
      goals: [
        { id: "g1", title: "Goal", target: 10, current: 7, createdAt: "2024-01-01T00:00:00Z" },
      ],
    };
    expect(computeDataHash(original)).not.toBe(computeDataHash(progressed));
  });
});
