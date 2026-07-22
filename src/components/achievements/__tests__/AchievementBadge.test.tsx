// @vitest-environment happy-dom
//
// Tests for AchievementBadge — a rarity-driven badge with gradient ring, glow, and medal.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AchievementBadge } from "../AchievementBadge";
import type { AchievementDef } from "@/lib/types";

function makeDef(overrides?: Partial<AchievementDef>): AchievementDef {
  return {
    id: "test-1",
    name: "Test Achievement",
    description: "A test",
    icon: "🏆",
    rarity: "rare",
    target: 10,
    ...overrides,
  } as AchievementDef;
}

describe("AchievementBadge", () => {
  it("renders the achievement icon", () => {
    render(<AchievementBadge def={makeDef({ icon: "⭐" })} />);
    expect(screen.getByText("⭐")).toBeTruthy();
  });

  it("renders lock emoji when locked", () => {
    render(<AchievementBadge def={makeDef()} locked />);
    expect(screen.getByText("🔒")).toBeTruthy();
  });

  it("does not render lock emoji when not locked", () => {
    render(<AchievementBadge def={makeDef()} />);
    expect(screen.queryByText("🔒")).toBeNull();
  });

  it("applies grayscale filter when locked", () => {
    const { container } = render(<AchievementBadge def={makeDef()} locked />);
    const iconSpan = container.querySelector(".leading-none");
    expect(iconSpan?.getAttribute("style")).toContain("grayscale");
  });

  it("does not apply grayscale when not locked", () => {
    const { container } = render(<AchievementBadge def={makeDef()} />);
    const iconSpan = container.querySelector(".leading-none");
    expect(iconSpan?.getAttribute("style")).not.toContain("grayscale");
  });

  it("uses surface2 background when locked", () => {
    const { container } = render(<AchievementBadge def={makeDef()} locked />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.getAttribute("style")).toContain("surface2");
  });

  it("renders shine animation when shine is true and not locked", () => {
    const { container } = render(<AchievementBadge def={makeDef()} shine />);
    // Shine element has background with conic-gradient (uses inline style)
    const shine = container.querySelector('[style*="conic-gradient"]');
    expect(shine).toBeTruthy();
  });

  it("does not render shine when not requested", () => {
    const { container } = render(<AchievementBadge def={makeDef()} />);
    const shine = container.querySelector('[style*="conic-gradient"]');
    expect(shine).toBeNull();
  });

  it("does not render shine when locked even if shine is true", () => {
    const { container } = render(<AchievementBadge def={makeDef()} locked shine />);
    const shine = container.querySelector('[style*="conic-gradient"]');
    expect(shine).toBeNull();
  });

  it("applies custom size", () => {
    const { container } = render(<AchievementBadge def={makeDef()} size={48} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.getAttribute("style")).toContain("width: 48px");
    expect(badge.getAttribute("style")).toContain("height: 48px");
  });

  it("defaults to size 72", () => {
    const { container } = render(<AchievementBadge def={makeDef()} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.getAttribute("style")).toContain("width: 72px");
    expect(badge.getAttribute("style")).toContain("height: 72px");
  });
});
