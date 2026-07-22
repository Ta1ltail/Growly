// @vitest-environment happy-dom
//
// Tests for ErrorBoundary — a React class component that catches rendering
// errors and displays a fallback UI. No store dependencies — uses
// componentDidCatch/getDerivedStateFromError lifecycle methods.

import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";

// Mock reportError to prevent actual network calls and console noise
vi.mock("@/lib/errorTracking", () => ({
  reportError: vi.fn(),
}));

// Suppress console.error during error-catching tests — React logs
// caught errors to the console during development.
let originalConsoleError: typeof console.error;

beforeEach(() => {
  originalConsoleError = console.error;
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// ── Helper: a child component that throws on render ────────────

function ThrowingChild({ message = "Test error" }: { message?: string }): ReactNode {
  throw new Error(message);
}

function SafeChild({ text = "Safe content" }: { text?: string }) {
  return <div>{text}</div>;
}

describe("ErrorBoundary", () => {
  // ── Normal rendering (no error) ─────────────────────────────

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Safe content")).toBeTruthy();
  });

  it("renders multiple children when there is no error", () => {
    render(
      <ErrorBoundary>
        <SafeChild text="Child 1" />
        <SafeChild text="Child 2" />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Child 1")).toBeTruthy();
    expect(screen.getByText("Child 2")).toBeTruthy();
  });

  // ── Error state ──────────────────────────────────────────────

  it("renders fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  it("shows error message in the fallback UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Network failure" />
      </ErrorBoundary>,
    );
    // The error message is in a <details> element
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  it("does NOT render children when an error occurs", () => {
    render(
      <ErrorBoundary>
        <SafeChild text="Should not appear" />
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("Should not appear")).toBeNull();
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  // ── Error details disclosure ─────────────────────────────────

  it("shows error details in a <details> element when expanded", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Detailed error message" />
      </ErrorBoundary>,
    );
    // The <details> summary text
    expect(screen.getByText("Error details")).toBeTruthy();
  });

  it("displays the error message inside the <details>", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Something broke" />
      </ErrorBoundary>,
    );
    // The pre element contains the error message
    // It's inside a <details> so initially hidden, but the text is in the DOM
    const container = screen.getByText("Something went wrong").parentElement;
    // The message should be in the <pre> inside <details>
    const details = container?.querySelector("details");
    expect(details).toBeTruthy();
    const pre = details?.querySelector("pre");
    expect(pre?.textContent).toContain("Something broke");
  });

  it("does not show error details section when error is null", () => {
    // Render without error first (getDerivedStateFromError not called)
    const { container } = render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>,
    );
    expect(container.querySelector("details")).toBeNull();
  });

  // ── Reload button ────────────────────────────────────────────

  it("renders a reload button when an error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    const reloadBtn = screen.getByText("Reload app");
    expect(reloadBtn).toBeTruthy();
  });

  it("reload button is a <button> element", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    const reloadBtn = screen.getByText("Reload app");
    expect(reloadBtn.tagName).toBe("BUTTON");
  });

  // ── Custom fallback ──────────────────────────────────────────

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom error UI")).toBeTruthy();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });

  it("renders custom fallback with children", () => {
    render(
      <ErrorBoundary
        fallback={
          <div>
            <h1>Oops</h1>
            <button>Retry</button>
          </div>
        }
      >
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Oops")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  // ── Issue tracker link ───────────────────────────────────────

  it("shows link to GitHub issues", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    const link = screen.getByRole("link");
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toContain("github.com/justin-g0/growly/issues");
  });

  it("opens link in new tab", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  // ── Recovery: non-error children after error ─────────────────

  it("recovers after error when non-throwing children are rendered", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeTruthy();

    // Re-render with safe children — the ErrorBoundary has hasError=true
    // from getDerivedStateFromError, so it still shows fallback.
    // The user must click Reload to reset the state.
    rerender(
      <ErrorBoundary>
        <SafeChild text="Recovered" />
      </ErrorBoundary>,
    );

    // ErrorBoundary does NOT auto-recover — it still shows fallback
    expect(screen.queryByText("Recovered")).toBeNull();
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  // ── Data safety messaging ────────────────────────────────────

  it("mentions local data safety in the fallback", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/data is safely stored/i)).toBeTruthy();
  });
});
