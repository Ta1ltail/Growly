// Tests for date utilities — pure functions, no mocks needed.

import { describe, it, expect } from "vitest";
import { dateKey, parseDateKey, prettyDate, addDays, startOfDay, dayDiff } from "../date";

describe("dateKey", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(dateKey(new Date(2024, 0, 15))).toBe("2024-01-15");
  });

  it("pads single-digit month and day", () => {
    expect(dateKey(new Date(2024, 2, 5))).toBe("2024-03-05");
  });

  it("handles December", () => {
    expect(dateKey(new Date(2024, 11, 25))).toBe("2024-12-25");
  });
});

describe("parseDateKey", () => {
  it("parses YYYY-MM-DD back into a Date", () => {
    const d = parseDateKey("2024-01-15");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it("round-trips with dateKey", () => {
    const original = new Date(2024, 6, 4);
    expect(dateKey(parseDateKey(dateKey(original)))).toBe("2024-07-04");
  });
});

describe("prettyDate", () => {
  it("formats a date in English", () => {
    const result = prettyDate(new Date(2024, 0, 1));
    expect(result).toContain("Monday");
    expect(result).toContain("January");
    expect(result).toContain("1");
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    const d = new Date(2024, 0, 1);
    const result = addDays(d, 5);
    expect(result.getDate()).toBe(6);
  });

  it("subtracts days with negative n", () => {
    const d = new Date(2024, 0, 10);
    const result = addDays(d, -3);
    expect(result.getDate()).toBe(7);
  });

  it("does not mutate the original date", () => {
    const d = new Date(2024, 0, 1);
    addDays(d, 10);
    expect(d.getDate()).toBe(1);
  });

  it("crosses month boundaries", () => {
    const d = new Date(2024, 0, 30);
    const result = addDays(d, 5);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(4);
  });
});

describe("startOfDay", () => {
  it("sets time to local midnight", () => {
    const d = new Date(2024, 6, 4, 14, 30, 45, 123);
    const sod = startOfDay(d);
    expect(sod.getHours()).toBe(0);
    expect(sod.getMinutes()).toBe(0);
    expect(sod.getSeconds()).toBe(0);
    expect(sod.getMilliseconds()).toBe(0);
  });

  it("does not change the date", () => {
    const d = new Date(2024, 11, 25, 8, 0, 0, 0);
    const sod = startOfDay(d);
    expect(sod.getFullYear()).toBe(2024);
    expect(sod.getMonth()).toBe(11);
    expect(sod.getDate()).toBe(25);
  });
});

describe("dayDiff", () => {
  it("returns positive when a is later", () => {
    const a = new Date(2024, 0, 10);
    const b = new Date(2024, 0, 5);
    expect(dayDiff(a, b)).toBe(5);
  });

  it("returns negative when a is earlier", () => {
    const a = new Date(2024, 0, 5);
    const b = new Date(2024, 0, 10);
    expect(dayDiff(a, b)).toBe(-5);
  });

  it("returns 0 for same day", () => {
    const a = new Date(2024, 0, 5, 10, 0);
    const b = new Date(2024, 0, 5, 14, 0);
    expect(dayDiff(a, b)).toBe(0);
  });

  it("crosses month boundaries", () => {
    const a = new Date(2024, 1, 1);
    const b = new Date(2024, 0, 28);
    expect(dayDiff(a, b)).toBe(4);
  });
});
