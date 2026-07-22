// @vitest-environment happy-dom
//
// Tests for Button — a presentational button component with variant and size
// styling. No store dependencies — pure UI rendering.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../Button";

describe("Button", () => {
  // ── Basic rendering ──────────────────────────────────────────

  it("renders a button element", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("renders children text", () => {
    render(<Button>Save</Button>);
    expect(screen.getByText("Save")).toBeTruthy();
  });

  it("renders children elements", () => {
    const { container } = render(
      <Button>
        <span data-testid="child" />
      </Button>,
    );
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });

  // ── Variants ─────────────────────────────────────────────────

  it("renders with primary variant by default", () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-accent");
  });

  it("renders soft variant", () => {
    render(<Button variant="soft">Soft</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-accent/10");
  });

  it("renders outline variant", () => {
    render(<Button variant="outline">Outline</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("border");
    expect(btn.className).toContain("border-line");
  });

  it("renders ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("text-muted");
    expect(btn.className).toContain("hover:bg-surface2");
  });

  it("renders danger variant", () => {
    render(<Button variant="danger">Danger</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-missed");
    expect(btn.className).toContain("text-white");
  });

  // ── Sizes ────────────────────────────────────────────────────

  it("renders with md size by default", () => {
    render(<Button>Default</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("text-sm");
  });

  it("renders sm size", () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("text-xs");
  });

  it("renders icon size", () => {
    render(<Button size="icon">I</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("size-9");
  });

  // ── Click handler ────────────────────────────────────────────

  it("fires onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // ── Disabled state ───────────────────────────────────────────

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("applies disabled styles when disabled", () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("disabled:opacity-50");
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Disabled</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not fire onClick when disabled via pointer-events", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Disabled</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  // ── Type attribute ───────────────────────────────────────────

  it("defaults type to button", () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });

  it("accepts custom type prop", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button").getAttribute("type")).toBe("submit");
  });

  // ── className passthrough ────────────────────────────────────

  it("applies custom className", () => {
    render(<Button className="my-custom-class">Styled</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("my-custom-class");
  });

  it("merges custom className with default classes", () => {
    render(<Button className="extra">Merge</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("rounded-xl");
    expect(btn.className).toContain("font-semibold");
    expect(btn.className).toContain("extra");
  });

  // ── Additional props passthrough ─────────────────────────────

  it("passes additional HTML button props", () => {
    render(<Button aria-label="Custom label">Labeled</Button>);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Custom label");
  });

  it("passes data attributes", () => {
    render(<Button data-testid="test-btn">Data</Button>);
    expect(screen.getByTestId("test-btn")).toBeTruthy();
  });

  it("passes id attribute", () => {
    render(<Button id="submit-btn">ID</Button>);
    expect(screen.getByRole("button").getAttribute("id")).toBe("submit-btn");
  });
});
