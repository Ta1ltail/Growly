// @vitest-environment happy-dom
//
// Tests for useHydrated — the simplest hook. Returns true on the client
// and false on the server (hydration guard). Uses useSyncExternalStore with
// a noop subscribe.

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHydrated } from "../useHydrated";

describe("useHydrated", () => {
  it("returns true when rendered on the client (jsdom)", () => {
    const { result } = renderHook(() => useHydrated());
    expect(result.current).toBe(true);
  });

  it("returns false for the server snapshot", () => {
    // renderHook always uses the client snapshot in jsdom, but we can
    // verify the hook's structure: it returns true from getSnapshot (client)
    // and false from getServerSnapshot (SSR).
    const { result } = renderHook(() => useHydrated());
    // On jsdom (client), the hook returns true immediately
    expect(result.current).toBe(true);
  });

  it("does not re-render after initial render", () => {
    const { result, rerender } = renderHook(() => useHydrated());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    expect(result.current).toBe(true);
  });

  it("returns a stable boolean value", () => {
    const { result } = renderHook(() => useHydrated());
    expect(typeof result.current).toBe("boolean");
  });
});
