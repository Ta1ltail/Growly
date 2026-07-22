// @vitest-environment happy-dom
//
// Tests for XpBar — a presentational component showing the user's XP
// progress bar. No store dependencies — takes LevelInfo as a prop.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { XpBar } from "../XpBar";

import type { LevelInfo } from "@/lib/xp";

describe("XpBar", () => {
  function makeLevel(overrides?: Partial<LevelInfo>): LevelInfo {
    return {
      level: 5,
      xpIntoLevel: 300,
      xpForNext: 1000,
      xpToNext: 700,
      totalXp: 2300,
      progressPct: 0.3,
      isMax: false,
      ...overrides,
    };
  }

  // ── Level display ────────────────────────────────────────────

  it("renders the level number", () => {
    render(<XpBar level={makeLevel({ level: 7 })} />);
    expect(screen.getByText("7")).toBeTruthy();
  });

  it("renders 'Level' label", () => {
    render(<XpBar level={makeLevel()} />);
    expect(screen.getByText("Level")).toBeTruthy();
  });

  // ── XP display ───────────────────────────────────────────────

  it("shows current XP into level / max XP", () => {
    render(<XpBar level={makeLevel({ xpIntoLevel: 300, xpForNext: 1000 })} />);
    expect(screen.getByText(/1,000.*XP/)).toBeTruthy();
    // "300" appears in the AnimatedCounter (xpIntoLevel)
    expect(screen.getByText("300")).toBeTruthy();
  });

  it("shows total XP", () => {
    render(<XpBar level={makeLevel({ totalXp: 5000 })} />);
    expect(screen.getByText(/5,000.*XP total/)).toBeTruthy();
  });

  it("shows XP to next level", () => {
    render(<XpBar level={makeLevel({ xpToNext: 700, level: 5 })} />);
    expect(screen.getByText(/700.*XP to Lv 6/)).toBeTruthy();
  });

  // ── Next unlock ──────────────────────────────────────────────

  it("shows nextUnlock text when provided", () => {
    render(
      <XpBar
        level={makeLevel()}
        nextUnlock="Discipline Warrior"
      />,
    );
    expect(screen.getByText(/Discipline Warrior/)).toBeTruthy();
  });

  it("does not show nextUnlock separator when no nextUnlock", () => {
    render(<XpBar level={makeLevel()} />);
    // The separator is a middle dot (·) between XP and unlock text
    expect(screen.queryByText(/·/)).toBeNull();
  });

  // ── Max level state ──────────────────────────────────────────

  it("shows 'MAX' when isMax is true", () => {
    render(<XpBar level={makeLevel({ isMax: true })} />);
    expect(screen.getByText("MAX")).toBeTruthy();
  });

  it("does not show XP to next level when isMax is true", () => {
    render(<XpBar level={makeLevel({ isMax: true })} />);
    expect(screen.queryByText(/XP to Lv/)).toBeNull();
  });

  it("does not show nextUnlock when isMax is true", () => {
    render(
      <XpBar
        level={makeLevel({ isMax: true })}
        nextUnlock="Discipline Warrior"
      />,
    );
    expect(screen.queryByText(/Discipline Warrior/)).toBeNull();
  });

  // ── Progress bar ─────────────────────────────────────────────

  it("renders a progress bar", () => {
    const { container } = render(
      <XpBar level={makeLevel({ progressPct: 0.5 })} />,
    );
    // ProgressBar renders a div with overflow-hidden rounded-full
    const bar = container.querySelector(".overflow-hidden.rounded-full");
    expect(bar).toBeTruthy();
  });

  // ── className passthrough ────────────────────────────────────

  it("applies custom className", () => {
    const { container } = render(
      <XpBar level={makeLevel()} className="my-custom-class" />,
    );
    const el = container.querySelector(".my-custom-class");
    expect(el).toBeTruthy();
  });
});
