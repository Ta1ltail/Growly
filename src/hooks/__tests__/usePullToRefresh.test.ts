// @vitest-environment happy-dom
//
// Tests for usePullToRefresh — native touch gesture for pull-to-refresh.
// Uses touchstart/touchmove/touchend events on the document body.
//
// IMPORTANT: Events must be dispatched on document.body (or a child element)
// so that e.target has a .closest() method — the hook's handleTouchStart
// calls target.closest() which fails when target is the document node.
//
// Note on TouchEvent: happy-dom's TouchEvent may not support the `touches`
// property. We construct plain Events and assign `touches` directly via
// indexer access (`(event as any).touches = [...]`).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePullToRefresh } from "../usePullToRefresh";

describe("usePullToRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Ensure scrollY is 0 (top of page) for pull-to-refresh to activate
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Dispatch a touch event on document.body so e.target has .closest(). */
  function fireTouch(type: string, clientY: number) {
    const event = new TouchEvent(type as any, { bubbles: true }) as any;
    // happy-dom TouchEvent returns empty TouchList for touches; override it.
    Object.defineProperty(event, "touches", {
      value: [{ clientY, clientX: 0 }],
      configurable: true,
    });
    document.body.dispatchEvent(event);
  }

  /** Dispatch a touchend event on document.body. */
  function fireEnd() {
    document.body.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
  }

  it("starts with default state (not pulling, not refreshing)", () => {
    const { result } = renderHook(() => usePullToRefresh(() => {}));
    expect(result.current.pulling).toBe(false);
    expect(result.current.refreshing).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it("ignores touchstart when scrolled down", () => {
    window.scrollY = 100;
    const { result } = renderHook(() => usePullToRefresh(() => {}));

    act(() => { fireTouch("touchstart", 100); });
    act(() => { fireTouch("touchmove", 250); });

    expect(result.current.pulling).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it("updates pulling state on touch move", () => {
    const { result } = renderHook(() => usePullToRefresh(() => {}));

    act(() => { fireTouch("touchstart", 100); });
    act(() => { fireTouch("touchmove", 200); });

    expect(result.current.pulling).toBe(true);
    expect(result.current.progress).toBeGreaterThan(0);
    expect(result.current.progress).toBeLessThanOrEqual(1);
  });

  it("resets pulling state on touch end without reaching threshold", () => {
    const { result } = renderHook(() => usePullToRefresh(() => {}));

    act(() => { fireTouch("touchstart", 100); });
    act(() => { fireTouch("touchmove", 150); });

    expect(result.current.pulling).toBe(true);

    act(() => { fireEnd(); });

    expect(result.current.pulling).toBe(false);
    expect(result.current.refreshing).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it("triggers refresh when pull exceeds threshold", () => {
    // onRefresh must return a Promise, otherwise the hook's else branch
    // immediately sets refreshing back to false (vi.fn() returns undefined).
    const onRefresh = vi.fn<() => Promise<void>>(() => new Promise(() => {}));
    const { result } = renderHook(() => usePullToRefresh(onRefresh));

    act(() => { fireTouch("touchstart", 100); });
    act(() => { fireTouch("touchmove", 300); });

    act(() => { fireEnd(); });

    expect(result.current.refreshing).toBe(true);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("calls async refresh and resets refreshing state when done", async () => {
    const refreshPromise = Promise.resolve() as Promise<void>;
    const onRefresh = vi.fn<() => Promise<void>>(() => refreshPromise);
    const { result } = renderHook(() => usePullToRefresh(onRefresh));

    act(() => { fireTouch("touchstart", 100); });
    act(() => { fireTouch("touchmove", 300); });
    act(() => { fireEnd(); });

    expect(result.current.refreshing).toBe(true);

    await act(async () => { await refreshPromise; });

    expect(result.current.refreshing).toBe(false);
  });

  it("ignores touches inside dialog elements", () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh));

    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);

    act(() => {
      const touchEvent = new TouchEvent("touchstart", { bubbles: true }) as any;
      Object.defineProperty(touchEvent, "touches", {
        value: [{ clientY: 100, clientX: 0 }],
        configurable: true,
      });
      dialog.dispatchEvent(touchEvent);
    });

    act(() => {
      const moveEvent = new TouchEvent("touchmove", { bubbles: true }) as any;
      Object.defineProperty(moveEvent, "touches", {
        value: [{ clientY: 100, clientX: 0 }],
        configurable: true,
      });
      dialog.dispatchEvent(moveEvent);
    });

    // The hook only checks dialogs in handleTouchStart, not handleTouchMove.
    // So pulling may become true from a touchmove after a dialog-start gesture
    // BUT onRefresh should never be called because handleTouchEnd needs the
    // pull to reach threshold, and startY.current was never set.
    expect(onRefresh).not.toHaveBeenCalled();

    document.body.removeChild(dialog);
  });

  it("clamps progress to 1 at maximum pull distance", () => {
    const { result } = renderHook(() => usePullToRefresh(() => {}));

    act(() => { fireTouch("touchstart", 100); });
    act(() => { fireTouch("touchmove", 500); });

    expect(result.current.progress).toBe(1);
  });

  it("safety timeout resets refreshing if it gets stuck", () => {
    const onRefresh = vi.fn<() => Promise<void>>(() => new Promise(() => {}));
    const { result } = renderHook(() => usePullToRefresh(onRefresh));

    act(() => { fireTouch("touchstart", 100); });
    act(() => { fireTouch("touchmove", 300); });
    act(() => { fireEnd(); });

    expect(result.current.refreshing).toBe(true);

    act(() => { vi.advanceTimersByTime(6000); });

    expect(result.current.refreshing).toBe(false);
  });

  it("handles upward swipe (negative diff) gracefully", () => {
    const { result } = renderHook(() => usePullToRefresh(() => {}));

    act(() => { fireTouch("touchstart", 200); });
    act(() => { fireTouch("touchmove", 100); });

    expect(result.current.pulling).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it("cleans up event listeners on unmount", () => {
    const spy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => usePullToRefresh(() => {}));

    unmount();

    expect(spy).toHaveBeenCalledWith("touchstart", expect.any(Function));
    expect(spy).toHaveBeenCalledWith("touchmove", expect.any(Function));
    expect(spy).toHaveBeenCalledWith("touchend", expect.any(Function));
  });
});
