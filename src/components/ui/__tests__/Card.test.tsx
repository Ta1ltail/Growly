// @vitest-environment happy-dom
//
// Tests for Card — a presentational card component with optional interactive
// hover effects and glow styling. No store dependencies.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "../Card";

describe("Card", () => {
  // ── Basic rendering ──────────────────────────────────────────

  it("renders a div", () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.querySelector("div")).toBeTruthy();
  });

  it("renders children text", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeTruthy();
  });

  it("renders children elements", () => {
    const { container } = render(
      <Card>
        <span data-testid="child" />
      </Card>,
    );
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });

  it("renders complex children (nested divs)", () => {
    const { container } = render(
      <Card>
        <div className="nested">
          <p>Paragraph</p>
        </div>
      </Card>,
    );
    expect(container.querySelector(".nested")).toBeTruthy();
    expect(screen.getByText("Paragraph")).toBeTruthy();
  });

  // ── Default styles ───────────────────────────────────────────

  it("has rounded corners and border by default", () => {
    const { container } = render(<Card>Default</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("rounded-2xl");
    expect(card.className).toContain("border");
    expect(card.className).toContain("border-line");
  });

  it("has surface background with backdrop blur", () => {
    const { container } = render(<Card>Default</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("bg-surface");
    expect(card.className).toContain("backdrop-blur-sm");
  });

  // ── Interactive mode ─────────────────────────────────────────

  it("adds interactive hover classes when interactive is true", () => {
    const { container } = render(<Card interactive>Interactive</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("transition-all");
    expect(card.className).toContain("hover:scale-[1.015]");
    expect(card.className).toContain("hover:-translate-y-0.5");
    expect(card.className).toContain("hover:border-accent/40");
  });

  it("does not have interactive classes by default", () => {
    const { container } = render(<Card>Static</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain("hover:scale-[1.015]");
  });

  // ── Glow mode ────────────────────────────────────────────────

  it("adds glow shadow when glow is true", () => {
    const { container } = render(<Card glow>Glowing</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("shadow-[0_0_24px");
  });

  it("does not have glow shadow by default", () => {
    const { container } = render(<Card>No Glow</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain("shadow-[0_0_24px");
  });

  // ── Combined modes ─────────────────────────────────────────

  it("supports both interactive and glow simultaneously", () => {
    const { container } = render(
      <Card interactive glow>
        Both
      </Card>,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("hover:scale-[1.015]");
    expect(card.className).toContain("shadow-[0_0_24px");
  });

  // ── className passthrough ────────────────────────────────────

  it("applies custom className", () => {
    const { container } = render(
      <Card className="my-custom-class">Styled</Card>,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("my-custom-class");
  });

  it("merges custom className with default classes", () => {
    const { container } = render(
      <Card className="extra">Merge</Card>,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("rounded-2xl");
    expect(card.className).toContain("border-line");
    expect(card.className).toContain("extra");
  });

  it("merges custom className with interactive classes", () => {
    const { container } = render(
      <Card interactive className="interactive-card">
        Combined
      </Card>,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("hover:scale-[1.015]");
    expect(card.className).toContain("interactive-card");
  });

  // ── Empty children edge case ────────────────────────────────

  it("renders with null/undefined children", () => {
    const { container } = render(<Card>{null}</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toBeTruthy();
  });

  it("renders with multiple children", () => {
    render(
      <Card>
        <span>First</span>
        <span>Second</span>
        <span>Third</span>
      </Card>,
    );
    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
    expect(screen.getByText("Third")).toBeTruthy();
  });
});
