// @vitest-environment happy-dom
//
// Tests for MarkButton — a round button that cycles through mark states.
// Pure presentational component with no store dependencies.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkButton } from "../MarkButton";

describe("MarkButton", () => {
  // ── Basic rendering ──────────────────────────────────────────

  it("renders a button element", () => {
    render(<MarkButton status={undefined} onClick={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeTruthy();
  });

  it("renders with no icon when status is undefined and not locked", () => {
    render(<MarkButton status={undefined} onClick={() => {}} />);
    const btn = screen.getByRole("button");
    // The button should be empty (no icon) when no status
    expect(btn.textContent).toBe("");
  });

  it("renders check icon for done status", () => {
    render(<MarkButton status="done" onClick={() => {}} />);
    const btn = screen.getByRole("button");
    // Should contain an SVG (the Check icon)
    expect(btn.querySelector("svg")).toBeTruthy();
  });

  it("renders X icon for missed status", () => {
    render(<MarkButton status="missed" onClick={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn.querySelector("svg")).toBeTruthy();
  });

  it("renders minus icon for skipped status", () => {
    render(<MarkButton status="skipped" onClick={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn.querySelector("svg")).toBeTruthy();
  });

  it("renders lock icon when locked with no status", () => {
    render(<MarkButton status={undefined} onClick={() => {}} locked />);
    const btn = screen.getByRole("button");
    // Lock icon rendered
    expect(btn.querySelector("svg")).toBeTruthy();
  });

  // ── aria-label ───────────────────────────────────────────────

  it("aria-label reflects no status", () => {
    render(<MarkButton status={undefined} onClick={() => {}} />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Not marked");
  });

  it("aria-label reflects done status", () => {
    render(<MarkButton status="done" onClick={() => {}} />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Marked done");
  });

  it("aria-label reflects missed status", () => {
    render(<MarkButton status="missed" onClick={() => {}} />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Marked missed");
  });

  it("aria-label reflects locked with no status", () => {
    render(<MarkButton status={undefined} onClick={() => {}} locked />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Locked");
  });

  it("aria-label reflects locked with existing status", () => {
    render(<MarkButton status="done" onClick={() => {}} locked />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Locked, marked done");
  });

  it("aria-label reflects frozen state", () => {
    render(<MarkButton status="missed" onClick={() => {}} frozen />);
    const label = screen.getByRole("button").getAttribute("aria-label");
    expect(label).toContain("protected by a streak freeze");
  });

  // ── Click handler ────────────────────────────────────────────

  it("fires onClick when clicked", () => {
    const onClick = vi.fn();
    render(<MarkButton status={undefined} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("prevents default on mousedown (scroll-jump protection)", () => {
    const onClick = vi.fn();
    render(<MarkButton status={undefined} onClick={onClick} />);
    const btn = screen.getByRole("button");
    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    btn.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  // ── Disabled state ───────────────────────────────────────────

  it("is disabled when locked with no status", () => {
    render(<MarkButton status={undefined} onClick={() => {}} locked />);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("is NOT disabled when locked with existing status (still shows mark)", () => {
    render(<MarkButton status="done" onClick={() => {}} locked />);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false);
  });

  it("is NOT disabled when not locked", () => {
    render(<MarkButton status="done" onClick={() => {}} />);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false);
  });

  // ── Custom size ──────────────────────────────────────────────

  it("applies custom size as width and height", () => {
    render(<MarkButton status={undefined} onClick={() => {}} size={32} />);
    const btn = screen.getByRole("button");
    expect(btn.style.width).toBe("32px");
    expect(btn.style.height).toBe("32px");
  });

  it("uses default size of 24", () => {
    render(<MarkButton status={undefined} onClick={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn.style.width).toBe("24px");
    expect(btn.style.height).toBe("24px");
  });

  // ── Frozen state ─────────────────────────────────────────────

  it("shows snowflake badge when frozen", () => {
    const { container } = render(
      <MarkButton status="missed" onClick={() => {}} frozen />,
    );
    // The frozen badge has title="Protected by a streak freeze"
    const badge = container.querySelector('[title="Protected by a streak freeze"]');
    expect(badge).toBeTruthy();
  });

  it("does not show snowflake badge when not frozen", () => {
    const { container } = render(
      <MarkButton status="missed" onClick={() => {}} />,
    );
    const badge = container.querySelector('[title="Protected by a streak freeze"]');
    expect(badge).toBeNull();
  });

  // ── Done burst ring ──────────────────────────────────────────

  it("shows burst ring animation when done", () => {
    const { container } = render(<MarkButton status="done" onClick={() => {}} />);
    const burst = container.querySelector('[aria-hidden="true"]');
    // The burst ring has aria-hidden
    expect(burst).toBeTruthy();
  });
});
