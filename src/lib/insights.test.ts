import { describe, it, expect } from "vitest";
import { todayHeadline } from "./insights";

describe("todayHeadline", () => {
  it("says to add a habit when there are no scheduled habits", () => {
    expect(todayHeadline(0, 0)).toBe("Add a habit to start your day.");
  });

  it("celebrates a perfect day", () => {
    expect(todayHeadline(5, 5)).toBe("Perfect day — all 5 done. 🎉");
  });

  it("celebrates a perfect single-habit day", () => {
    expect(todayHeadline(1, 1)).toBe("Perfect day — all 1 done. 🎉");
  });

  it("encourages when nothing is done yet", () => {
    expect(todayHeadline(0, 3)).toBe("A fresh start. Pick one to begin.");
  });

  it("encourages when more than half done", () => {
    expect(todayHeadline(3, 5)).toBe("Great pace — just 2 to go.");
  });

  it("encourages when exactly half done", () => {
    expect(todayHeadline(3, 6)).toBe("Great pace — just 3 to go.");
  });

  it("encourages when less than half done with partial progress", () => {
    expect(todayHeadline(1, 5)).toBe("1 done so far. You've got this.");
  });

  it("handles 1 done out of 2", () => {
    expect(todayHeadline(1, 2)).toBe("Great pace — just 1 to go.");
  });

  it("handles 2 done out of 10", () => {
    expect(todayHeadline(2, 10)).toBe("2 done so far. You've got this.");
  });
});
