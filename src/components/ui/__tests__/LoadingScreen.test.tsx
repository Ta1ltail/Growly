// @vitest-environment happy-dom
//
// Tests for LoadingScreen — a full-screen loading state shown during initial
// Supabase sync. Pure presentational component with no props or state.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingScreen } from "../LoadingScreen";

describe("LoadingScreen", () => {
  // ── Component rendering ─────────────────────────────────────

  it("renders a full-screen container", () => {
    const { container } = render(<LoadingScreen />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("fixed");
    expect(outer.className).toContain("inset-0");
    expect(outer.className).toContain("z-[100]");
  });

  it("has a surface background", () => {
    const { container } = render(<LoadingScreen />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("bg-surface");
  });

  it("centers content vertically and horizontally", () => {
    const { container } = render(<LoadingScreen />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("items-center");
    expect(outer.className).toContain("justify-center");
  });

  // ── App icon (SVG) ──────────────────────────────────────────

  it("renders an SVG element for the app icon", () => {
    const { container } = render(<LoadingScreen />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("SVG has the accent color class", () => {
    const { container } = render(<LoadingScreen />);
    const svg = container.querySelector("svg");
    expect(svg?.className).toContain("text-accent");
  });

  it("SVG has size-16 class", () => {
    const { container } = render(<LoadingScreen />);
    const svg = container.querySelector("svg");
    expect(svg?.className).toContain("size-16");
  });

  it("SVG has 6 path elements (sprout icon)", () => {
    const { container } = render(<LoadingScreen />);
    const svg = container.querySelector("svg");
    const paths = svg?.querySelectorAll("path");
    expect(paths?.length).toBe(6);
  });

  // ── Glow ring ────────────────────────────────────────────────

  it("renders a glow ring with ping animation", () => {
    const { container } = render(<LoadingScreen />);
    const glowRing = container.querySelector(".animate-ping");
    expect(glowRing).toBeTruthy();
  });

  it("glow ring has accent-colored background", () => {
    const { container } = render(<LoadingScreen />);
    const glowRing = container.querySelector(".animate-ping");
    expect(glowRing?.className).toContain("bg-accent/20");
  });

  it("glow ring is positioned absolutely over the icon", () => {
    const { container } = render(<LoadingScreen />);
    const glowRing = container.querySelector(".animate-ping");
    expect(glowRing?.className).toContain("absolute");
    expect(glowRing?.className).toContain("inset-0");
  });

  it("glow ring is rounded (circular)", () => {
    const { container } = render(<LoadingScreen />);
    const glowRing = container.querySelector(".animate-ping");
    expect(glowRing?.className).toContain("rounded-full");
  });

  // ── App name ─────────────────────────────────────────────────

  it("renders the app name 'Growly'", () => {
    render(<LoadingScreen />);
    expect(screen.getByText("Growly")).toBeTruthy();
  });

  it("app name has bold text style", () => {
    render(<LoadingScreen />);
    const growly = screen.getByText("Growly");
    expect(growly.className).toContain("font-bold");
  });

  // ── Loading status text ──────────────────────────────────────

  it("renders the loading status text", () => {
    render(<LoadingScreen />);
    // The ellipsis character is \u2026 — matching flexibly
    const statusText = screen.getByText(/Sprouting/);
    expect(statusText).toBeTruthy();
  });

  it("loading text has pulse animation", () => {
    render(<LoadingScreen />);
    const statusText = screen.getByText(/Sprouting/);
    expect(statusText.className).toContain("animate-pulse");
  });

  it("loading text mentions 'data'", () => {
    render(<LoadingScreen />);
    const statusText = screen.getByText(/Sprouting/);
    expect(statusText.textContent).toMatch(/data/);
  });

  // ── Structure ────────────────────────────────────────────────

  it("icon and text are in a column layout", () => {
    const { container } = render(<LoadingScreen />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("flex-col");
  });

  it("has a gap between icon and text", () => {
    const { container } = render(<LoadingScreen />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("gap-5");
  });

  // ── Semantic content ─────────────────────────────────────────

  it("does not render any interactive elements (no buttons)", () => {
    const { container } = render(<LoadingScreen />);
    expect(container.querySelector("button")).toBeNull();
  });

  it("does not render any links", () => {
    const { container } = render(<LoadingScreen />);
    expect(container.querySelector("a")).toBeNull();
  });

  // ── Multiple renders (stability) ─────────────────────────────

  it("renders consistently across multiple re-renders", () => {
    const { container: c1 } = render(<LoadingScreen />);
    const svgCount1 = c1.querySelectorAll("svg").length;

    const { container: c2 } = render(<LoadingScreen />);
    const svgCount2 = c2.querySelectorAll("svg").length;

    expect(svgCount1).toBe(svgCount2);
    expect(svgCount1).toBe(1);
  });
});
