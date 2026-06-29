import { describe, it, expect } from "vitest";
import { canEditMark, isFutureDay } from "./policy";

const D = (s: string) => new Date(`${s}T12:00:00`);
const MIDNIGHT = (s: string) => new Date(`${s}T00:00:00`);
const EARLY = (s: string) => new Date(`${s}T03:30:00`);
const LATE = (s: string) => new Date(`${s}T08:00:00`);

// --- canEditMark -----------------------------------------------------------

describe("canEditMark", () => {
  const GRACE = 5; // 5-hour grace window

  it("allows editing today", () => {
    expect(canEditMark("2026-06-10", D("2026-06-10"), GRACE)).toBe(true);
  });

  it("allows editing today even late in the day", () => {
    expect(canEditMark("2026-06-10", new Date("2026-06-10T23:59:00"), GRACE)).toBe(
      true,
    );
  });

  it("blocks editing a future day", () => {
    expect(canEditMark("2026-06-15", D("2026-06-10"), GRACE)).toBe(false);
  });

  it("blocks editing a day more than 1 day in the past", () => {
    expect(canEditMark("2026-06-08", D("2026-06-10"), GRACE)).toBe(false);
  });

  it("blocks editing a day 2 days in the past", () => {
    expect(canEditMark("2026-06-08", MIDNIGHT("2026-06-10"), GRACE)).toBe(
      false,
    );
  });

  describe("yesterday with grace window", () => {
    it("allows editing yesterday within grace hours", () => {
      // June 10 at 3:30 AM → yesterday (June 9) should be editable (3.5h < 5h)
      expect(canEditMark("2026-06-09", EARLY("2026-06-10"), GRACE)).toBe(true);
    });

    it("blocks editing yesterday after grace hours have passed", () => {
      // June 10 at 8:00 AM → yesterday (June 9) should be locked (8h >= 5h)
      expect(canEditMark("2026-06-09", LATE("2026-06-10"), GRACE)).toBe(false);
    });

    it("respects a custom grace window of 0 hours (no grace)", () => {
      expect(canEditMark("2026-06-09", EARLY("2026-06-10"), 0)).toBe(false);
    });

    it("respects a custom grace window of 10 hours", () => {
      expect(canEditMark("2026-06-09", LATE("2026-06-10"), 10)).toBe(true);
    });

    it("works at the exact boundary of the grace window", () => {
      // 5 hours after midnight = 05:00
      const boundary = new Date("2026-06-10T05:00:00");
      // At exactly 5.0h, hoursIntoToday = 5, so 5 < 5 is false → blocked
      expect(canEditMark("2026-06-09", boundary, GRACE)).toBe(false);
      const justBefore = new Date("2026-06-10T04:59:59");
      expect(canEditMark("2026-06-09", justBefore, GRACE)).toBe(true);
    });
  });

  it("returns false for a zero-grace window on yesterday", () => {
    expect(canEditMark("2026-06-09", EARLY("2026-06-10"), 0)).toBe(false);
  });

  it("handles negative dayDiff (future) gracefully", () => {
    expect(canEditMark("2026-06-20", D("2026-06-10"), GRACE)).toBe(false);
  });

  it("handles same-day with late hour across midnight boundary", () => {
    // If today is June 10 at 11:59 PM, "2026-06-10" is still today
    expect(
      canEditMark("2026-06-10", new Date("2026-06-10T23:59:00"), GRACE),
    ).toBe(true);
  });
});

// --- isFutureDay -----------------------------------------------------------

describe("isFutureDay", () => {
  it("returns false for today", () => {
    expect(isFutureDay("2026-06-10", D("2026-06-10"))).toBe(false);
  });

  it("returns false for yesterday", () => {
    expect(isFutureDay("2026-06-09", D("2026-06-10"))).toBe(false);
  });

  it("returns true for tomorrow", () => {
    expect(isFutureDay("2026-06-11", D("2026-06-10"))).toBe(true);
  });

  it("returns true for next week", () => {
    expect(isFutureDay("2026-06-17", D("2026-06-10"))).toBe(true);
  });

  it("returns false for last month", () => {
    expect(isFutureDay("2026-05-10", D("2026-06-10"))).toBe(false);
  });

  it("returns false for a year ago", () => {
    expect(isFutureDay("2025-06-10", D("2026-06-10"))).toBe(false);
  });
});
