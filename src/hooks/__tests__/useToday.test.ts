// @vitest-environment happy-dom
//
// Tests for useToday — returns a stable Date for "today" that updates at
// midnight via a setTimeout to the next midnight.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToday } from "../useToday";

describe("useToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a Date object", () => {
    const { result } = renderHook(() => useToday());
    expect(result.current).toBeInstanceOf(Date);
  });

  it("returns the current date", () => {
    const now = new Date("2026-07-22T12:00:00");
    vi.setSystemTime(now);

    const { result } = renderHook(() => useToday());
    expect(result.current.getFullYear()).toBe(2026);
    expect(result.current.getMonth()).toBe(6); // July = 6
    expect(result.current.getDate()).toBe(22);
  });

  it("returns a stable reference across re-renders (same day)", () => {
    const now = new Date("2026-07-22T12:00:00");
    vi.setSystemTime(now);

    const { result, rerender } = renderHook(() => useToday());
    const first = result.current;

    rerender();
    expect(result.current).toBe(first);
  });

  it("updates after midnight when the timer fires", () => {
    // Set time to 23:59:59 on July 22
    const justBeforeMidnight = new Date("2026-07-22T23:59:59");
    vi.setSystemTime(justBeforeMidnight);

    const { result } = renderHook(() => useToday());
    expect(result.current.getDate()).toBe(22);

    // Advance past midnight
    act(() => {
      vi.advanceTimersByTime(2000); // 2 seconds should cross midnight
    });

    expect(result.current.getDate()).toBe(23);
    expect(result.current.getMonth()).toBe(6);
    expect(result.current.getFullYear()).toBe(2026);
  });

  it("sets a timeout to the next midnight", () => {
    const now = new Date("2026-07-22T06:00:00");
    vi.setSystemTime(now);

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    renderHook(() => useToday());

    // The hook should have called setTimeout with a delay equal to
    // msToMidnight (capped to at least 1000ms).
    // July 22 -> July 23 midnight = 18 hours = 64800000ms
    expect(setTimeoutSpy).toHaveBeenCalled();
    const delay = setTimeoutSpy.mock.calls[0][1] as number;
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThanOrEqual(86400000); // max 24 hours

    setTimeoutSpy.mockRestore();
  });

  it("reschedules the timer after midnight update", () => {
    const now = new Date("2026-07-22T23:59:58");
    vi.setSystemTime(now);

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const { result } = renderHook(() => useToday());

    // The hook calls setTimeout once on mount
    expect(setTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

    // Advance past midnight to trigger the update
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.getDate()).toBe(23);

    // After midnight fires, the effect re-runs and calls setTimeout again
    expect(setTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

    setTimeoutSpy.mockRestore();
  });

  it("cleans up the timer on unmount", () => {
    vi.setSystemTime(new Date("2026-07-22T12:00:00"));

    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const { unmount } = renderHook(() => useToday());
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
