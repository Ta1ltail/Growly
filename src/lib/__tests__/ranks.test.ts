// Tests for ranks — pure data module, no mocks needed.

import { describe, it, expect } from "vitest";
import { RANK_STYLE, RANK_ORDER } from "../ranks";

describe("RANK_STYLE", () => {
  it("has entries for all 5 ranks", () => {
    expect(Object.keys(RANK_STYLE)).toHaveLength(5);
  });

  it("each rank has required fields", () => {
    for (const [rank, style] of Object.entries(RANK_STYLE)) {
      expect(style.label).toBe(rank);
      expect(typeof style.icon).toBe("string");
      expect(style.icon.length).toBeGreaterThan(0);
      expect(style.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(style.glow).toMatch(/^rgba\(/);
      expect(style.gradient).toMatch(/^linear-gradient\(/);
      expect(typeof style.animated).toBe("boolean");
    }
  });

  it("Beginner has gray/slate accent", () => {
    expect(RANK_STYLE.Beginner.accent).toBe("#94a3b8");
  });

  it("Legendary is animated", () => {
    expect(RANK_STYLE.Legendary.animated).toBe(true);
  });

  it("Beginner is not animated", () => {
    expect(RANK_STYLE.Beginner.animated).toBe(false);
  });

  it("Legendary has tri-tone gradient", () => {
    expect(RANK_STYLE.Legendary.gradient).toContain("#f43f5e");
  });
});

describe("RANK_ORDER", () => {
  it("orders ranks from Beginner (0) to Legendary (4)", () => {
    expect(RANK_ORDER.Beginner).toBe(0);
    expect(RANK_ORDER.Intermediate).toBe(1);
    expect(RANK_ORDER.Advanced).toBe(2);
    expect(RANK_ORDER.Expert).toBe(3);
    expect(RANK_ORDER.Legendary).toBe(4);
  });

  it("has no duplicate values", () => {
    const values = Object.values(RANK_ORDER);
    expect(new Set(values).size).toBe(values.length);
  });
});
