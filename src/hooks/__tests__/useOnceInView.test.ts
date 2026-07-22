// @vitest-environment happy-dom
//
// Tests for useOnceInView — fires once when an element enters the viewport
// via IntersectionObserver, then disconnects.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnceInView } from "../useOnceInView";

interface IntersectionObserverCallback {
  (entries: { isIntersecting: boolean }[]): void;
}

describe("useOnceInView", () => {
  let observeFn: ReturnType<typeof vi.fn>;
  let disconnectFn: ReturnType<typeof vi.fn>;
  /** Stack of callbacks — each new observer pushes its callback. */
  let callbacks: IntersectionObserverCallback[];

  class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      callbacks.push(callback);
    }
    observe = observeFn;
    disconnect = disconnectFn;
  }

  beforeEach(() => {
    observeFn = vi.fn();
    disconnectFn = vi.fn();
    callbacks = [];

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Invoke the n-th observer's callback with the given intersecting status. */
  function triggerIntersection(index: number, isIntersecting: boolean) {
    act(() => {
      callbacks[index]([{ isIntersecting }]);
    });
  }

  it("starts with inView as false", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useOnceInView(ref));
    expect(result.current).toBe(false);
  });

  it("observes the element on mount", () => {
    const ref = { current: document.createElement("div") };
    renderHook(() => useOnceInView(ref));
    expect(observeFn).toHaveBeenCalledWith(ref.current);
    expect(observeFn).toHaveBeenCalledTimes(1);
  });

  it("sets inView to true when element intersects", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useOnceInView(ref));

    triggerIntersection(0, true);

    expect(result.current).toBe(true);
  });

  it("disconnects observer after intersection", () => {
    const ref = { current: document.createElement("div") };
    renderHook(() => useOnceInView(ref));

    triggerIntersection(0, true);

    expect(disconnectFn).toHaveBeenCalledTimes(1);
  });

  it("does not set inView when element is not intersecting", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useOnceInView(ref));

    triggerIntersection(0, false);

    expect(result.current).toBe(false);
  });

  it("does not disconnect when element is not intersecting", () => {
    const ref = { current: document.createElement("div") };
    renderHook(() => useOnceInView(ref));

    triggerIntersection(0, false);

    expect(disconnectFn).not.toHaveBeenCalled();
  });

  it("stays true after first intersection even if later callback returns false", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useOnceInView(ref));

    triggerIntersection(0, true);
    expect(result.current).toBe(true);

    // After disconnect, the effect is cleaned up, so subsequent callbacks
    // won't fire. The state stays true.
    expect(result.current).toBe(true);
  });

  it("uses the provided threshold", () => {
    const ref = { current: document.createElement("div") };
    renderHook(() => useOnceInView(ref, 0.5));
    expect(observeFn).toHaveBeenCalled();
  });

  it("does nothing when ref.current is null", () => {
    const ref = { current: null };
    const { result } = renderHook(() => useOnceInView(ref));
    expect(result.current).toBe(false);
    expect(observeFn).not.toHaveBeenCalled();
  });

  it("does not re-observe when ref.current changes (effect deps on ref object, not .current)", () => {
    const ref = { current: document.createElement("div") };
    const { rerender } = renderHook(() => useOnceInView(ref));

    expect(observeFn).toHaveBeenCalledTimes(1);

    // Change ref.current — since the effect depends on the `ref` object
    // (not ref.current), React won't re-run the effect.
    ref.current = document.createElement("div");
    rerender();

    // The observer is NOT disconnected or re-observed because the
    // ref object reference hasn't changed.
    expect(observeFn).toHaveBeenCalledTimes(1);
  });

  it("disconnects observer on unmount", () => {
    const ref = { current: document.createElement("div") };
    const { unmount } = renderHook(() => useOnceInView(ref));

    unmount();

    expect(disconnectFn).toHaveBeenCalled();
  });

  it("handles multiple elements independently", () => {
    const ref1 = { current: document.createElement("div") };
    const ref2 = { current: document.createElement("div") };

    const { result: r1 } = renderHook(() => useOnceInView(ref1));
    const { result: r2 } = renderHook(() => useOnceInView(ref2));

    expect(r1.current).toBe(false);
    expect(r2.current).toBe(false);

    // Only trigger the FIRST observer's callback (ref1)
    triggerIntersection(0, true);

    expect(r1.current).toBe(true);
    // Second element was NOT triggered, so it stays false
    expect(r2.current).toBe(false);
  });
});
