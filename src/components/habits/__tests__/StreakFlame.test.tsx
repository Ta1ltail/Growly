// @vitest-environment happy-dom
//
// Tests for StreakFlame — animated streak indicator with tiered visuals.
// Depends on useAppDataSelector from the store (mocked).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreakFlame } from "../StreakFlame";

// ── Mock the store selector ─────────────────────────────────────
// StreakFlame calls useAppDataSelector to read the equipped flame skin.
// Default: no flame skin equipped (uses default colors).
vi.mock("@/lib/store", () => ({
  useAppDataSelector: vi.fn((selector: (d: any) => any) =>
    selector({
      economy: {
        spent: [],
        owned: [],
        equipped: {},
        freezes: [],
        bonuses: [],
        bonusCoins: 0,
        lastCheckIn: null,
        checkInStreak: 0,
        lastQuestDate: null,
        currentQuest: null,
        lastSpinDate: null,
        lastSpinResult: null,
      },
    }),
  ),
}));

describe("StreakFlame", () => {
  // ── None tier ────────────────────────────────────────────────

  it("returns null when streak is 0", () => {
    const { container } = render(<StreakFlame streak={0} />);
    expect(container.textContent).toBe("");
  });

  it("returns null when streak is negative", () => {
    const { container } = render(<StreakFlame streak={-5} />);
    expect(container.textContent).toBe("");
  });

  // ── Small tier (1-6 days) ────────────────────────────────────

  it("renders small tier for streak of 1", () => {
    render(<StreakFlame streak={1} />);
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("renders small tier for streak of 6", () => {
    render(<StreakFlame streak={6} />);
    expect(screen.getByText("6")).toBeTruthy();
  });

  it("small tier does NOT show glow halo", () => {
    const { container } = render(<StreakFlame streak={3} />);
    const glow = container.querySelector(".animate-glow-pulse");
    expect(glow).toBeNull();
  });

  it("small tier does NOT show embers", () => {
    const { container } = render(<StreakFlame streak={3} />);
    const ember = container.querySelector(".animate-ember");
    expect(ember).toBeNull();
  });

  // ── Medium tier (7-29 days) ──────────────────────────────────

  it("renders medium tier for streak of 7", () => {
    render(<StreakFlame streak={7} />);
    expect(screen.getByText("7")).toBeTruthy();
  });

  it("renders medium tier for streak of 29", () => {
    render(<StreakFlame streak={29} />);
    expect(screen.getByText("29")).toBeTruthy();
  });

  it("medium tier shows glow halo", () => {
    const { container } = render(<StreakFlame streak={14} />);
    const glow = container.querySelector(".animate-glow-pulse");
    expect(glow).toBeTruthy();
  });

  it("medium tier does NOT show embers", () => {
    const { container } = render(<StreakFlame streak={14} />);
    const ember = container.querySelector(".animate-ember");
    expect(ember).toBeNull();
  });

  // ── Large tier (30+ days) ────────────────────────────────────

  it("renders large tier for streak of 30", () => {
    render(<StreakFlame streak={30} />);
    expect(screen.getByText("30")).toBeTruthy();
  });

  it("renders large tier for streak of 365", () => {
    render(<StreakFlame streak={365} />);
    expect(screen.getByText("365")).toBeTruthy();
  });

  it("large tier shows glow halo", () => {
    const { container } = render(<StreakFlame streak={100} />);
    expect(container.querySelector(".animate-glow-pulse")).toBeTruthy();
  });

  it("large tier shows embers", () => {
    const { container } = render(<StreakFlame streak={100} />);
    const embers = container.querySelectorAll(".animate-ember");
    expect(embers.length).toBe(3);
  });

  // ── Count display ────────────────────────────────────────────

  it("shows count by default", () => {
    render(<StreakFlame streak={5} />);
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("hides count when showCount is false", () => {
    render(<StreakFlame streak={5} showCount={false} />);
    expect(screen.queryByText("5")).toBeNull();
  });

  // ── aria-label ───────────────────────────────────────────────

  it("has aria-label with streak count", () => {
    const { container } = render(<StreakFlame streak={42} />);
    // The outer span has the aria-label
    const linkEl = container.querySelector('[aria-label="42 day streak"]');
    expect(linkEl).toBeTruthy();
  });

  // ── Custom colors prop ───────────────────────────────────────

  it("uses provided colors instead of store value", () => {
    const customColors = {
      small: "#ff0000",
      medium: "#00ff00",
      large: "#0000ff",
    };
    const { container } = render(
      <StreakFlame streak={14} colors={customColors} />,
    );
    // The glow halo should use the custom medium color
    const glow = container.querySelector(".animate-glow-pulse");
    expect(glow).toBeTruthy();
  });

  // ── Custom size ──────────────────────────────────────────────

  it("accepts custom size prop", () => {
    const { container } = render(<StreakFlame streak={14} size={32} />);
    const iconContainer = container.querySelector(".relative.inline-flex");
    expect(iconContainer?.getAttribute("style")).toContain("32px");
  });

  // ── className passthrough ────────────────────────────────────

  it("applies custom className", () => {
    render(
      <StreakFlame streak={7} className="test-class" />,
    );
    const text = screen.getByText("7");
    const parent = text.closest(".test-class");
    expect(parent).toBeTruthy();
  });
});
