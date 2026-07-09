import { describe, it, expect } from "vitest";
import { cn, uid, TONE } from "./util";

// --- uid -------------------------------------------------------------------

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(uid()).toBeTruthy();
    expect(typeof uid()).toBe("string");
  });

  it("returns unique values on consecutive calls", () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });

  it("returns different values across many calls (no collisions)", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

// --- cn (class name merge) -------------------------------------------------

describe("cn", () => {
  it("joins multiple class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, "b", undefined, null, "c")).toBe("a b c");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles conditional classes via objects", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("merges tailwind classes (later wins)", () => {
    // twMerge should resolve px-4 and px-2 → px-2 (later wins)
    const result = cn("px-4", "px-2");
    expect(result).toBe("px-2");
  });
});

// --- TONE ------------------------------------------------------------------

describe("TONE", () => {
  it("has all three tones", () => {
    expect(TONE.good).toContain("text-done");
    expect(TONE.info).toContain("text-accent");
    expect(TONE.warn).toContain("text-amber-500");
  });

  it("each tone has border, bg, and text classes", () => {
    for (const [, classes] of Object.entries(TONE)) {
      expect(classes).toMatch(/border-/);
      expect(classes).toMatch(/bg-/);
      expect(classes).toMatch(/text-/);
    }
  });
});
