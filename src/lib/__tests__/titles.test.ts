// Tests for titles — pure functions, no mocks needed.

import { describe, it, expect } from "vitest";
import { TITLES, titleForLevel } from "../titles";

describe("TITLES", () => {
  it("has 20 titles", () => {
    expect(TITLES).toHaveLength(20);
  });

  it("each title has name, rank, and minLevel", () => {
    for (const t of TITLES) {
      expect(typeof t.name).toBe("string");
      expect(t.name.length).toBeGreaterThan(0);
      expect(["Beginner", "Intermediate", "Advanced", "Expert", "Legendary"]).toContain(t.rank);
      expect(typeof t.minLevel).toBe("number");
      expect(t.minLevel).toBeGreaterThanOrEqual(1);
    }
  });

  it("is sorted ascending by minLevel", () => {
    for (let i = 1; i < TITLES.length; i++) {
      expect(TITLES[i].minLevel).toBeGreaterThanOrEqual(TITLES[i - 1].minLevel);
    }
  });

  it("first title is 'Habit Newbie' at level 1", () => {
    expect(TITLES[0].name).toBe("Habit Newbie");
    expect(TITLES[0].minLevel).toBe(1);
  });

  it("last title is 'Legendary Achiever' at level 60", () => {
    expect(TITLES[TITLES.length - 1].name).toBe("Legendary Achiever");
    expect(TITLES[TITLES.length - 1].minLevel).toBe(60);
  });
});

describe("titleForLevel", () => {
  it("returns the first title for level 1", () => {
    const info = titleForLevel(1);
    expect(info.current.name).toBe("Habit Newbie");
    expect(info.next).toBeTruthy();
    expect(info.levelsToNext).toBe(1);
  });

  it("returns correct title for level 5 (Intermediate tier)", () => {
    const info = titleForLevel(5);
    expect(info.current.name).toBe("Consistency Apprentice");
    expect(info.current.rank).toBe("Intermediate");
  });

  it("returns correct title for level 13 (Advanced tier)", () => {
    const info = titleForLevel(13);
    expect(info.current.name).toBe("Discipline Warrior");
    expect(info.current.rank).toBe("Advanced");
  });

  it("returns correct title for level 36 (Legendary tier)", () => {
    const info = titleForLevel(36);
    expect(info.current.name).toBe("Gigachad");
    expect(info.current.rank).toBe("Legendary");
  });

  it("returns the last title at level 60", () => {
    const info = titleForLevel(60);
    expect(info.current.name).toBe("Legendary Achiever");
    expect(info.next).toBeNull();
    expect(info.levelsToNext).toBeNull();
  });

  it("returns the last title above max level", () => {
    const info = titleForLevel(100);
    expect(info.current.name).toBe("Legendary Achiever");
    expect(info.next).toBeNull();
  });

  it("shows levels to next title correctly", () => {
    const info = titleForLevel(3);
    expect(info.current.name).toBe("Procrastination Survivor");
    expect(info.next?.name).toBe("Consistency Apprentice");
    expect(info.levelsToNext).toBe(2); // Level 5 - 3 = 2
  });

  it("returns 'Getting Started' at level 2", () => {
    const info = titleForLevel(2);
    expect(info.current.name).toBe("Getting Started");
  });

  it("next is non-null at level 59 (one below max)", () => {
    const info = titleForLevel(59);
    expect(info.next).not.toBeNull();
    expect(info.levelsToNext).toBe(1);
  });
});
