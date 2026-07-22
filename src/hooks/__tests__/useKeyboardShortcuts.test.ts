// @vitest-environment happy-dom
//
// Tests for useKeyboardShortcuts — global keyboard shortcuts for navigation,
// undo/redo, adding habits, and showing the help modal.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock next/navigation useRouter
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock store undo/redo actions
vi.mock("@/lib/store", () => ({
  undoAction: vi.fn().mockReturnValue(true),
  redoAction: vi.fn().mockReturnValue(true),
}));

import { useKeyboardShortcuts } from "../useKeyboardShortcuts";
import { undoAction, redoAction } from "@/lib/store";

describe("useKeyboardShortcuts", () => {
  let customEventSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPush.mockClear();
    (undoAction as ReturnType<typeof vi.fn>).mockClear();
    (redoAction as ReturnType<typeof vi.fn>).mockClear();
    customEventSpy = vi.fn();

    (window as any).addEventListener("kb:toggle-help", customEventSpy);
    (window as any).addEventListener("kb:add-habit", customEventSpy);
  });

  afterEach(() => {
    (window as any).removeEventListener("kb:toggle-help", customEventSpy);
    (window as any).removeEventListener("kb:add-habit", customEventSpy);
  });

  /** Dispatch a keydown event on the given target (defaults to window). */
  function fireKey(
    key: string,
    opts?: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; target?: EventTarget },
  ) {
    act(() => {
      const target = opts?.target ?? window;
      target.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          ctrlKey: opts?.ctrlKey ?? false,
          metaKey: opts?.metaKey ?? false,
          shiftKey: opts?.shiftKey ?? false,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  }

  it("ignores keyboard events when focused on an input element", () => {
    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    // Fire keydown on the input — it will bubble up to window
    fireKey("g", { target: input });
    fireKey("t", { target: input });

    // Should not navigate to /today because we're in an input
    expect(mockPush).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("ignores keyboard events when focused on a textarea", () => {
    renderHook(() => useKeyboardShortcuts());

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    fireKey("g", { target: textarea });
    fireKey("t", { target: textarea });

    expect(mockPush).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  describe("G-prefix navigation", () => {
    it("navigates to /today when pressing g then t", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g");
      fireKey("t");
      expect(mockPush).toHaveBeenCalledWith("/today");
    });

    it("navigates to /dashboard when pressing g then d", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g");
      fireKey("d");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("navigates to /habits when pressing g then h", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g");
      fireKey("h");
      expect(mockPush).toHaveBeenCalledWith("/habits");
    });

    it("navigates to /tracker when pressing g then r", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g");
      fireKey("r");
      expect(mockPush).toHaveBeenCalledWith("/tracker");
    });

    it("navigates to /calendar when pressing g then c", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g");
      fireKey("c");
      expect(mockPush).toHaveBeenCalledWith("/calendar");
    });

    it("navigates to /stats when pressing g then s", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g");
      fireKey("s");
      expect(mockPush).toHaveBeenCalledWith("/stats");
    });

    it("navigates to /achievements when pressing g then a", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g");
      fireKey("a");
      expect(mockPush).toHaveBeenCalledWith("/achievements");
    });

    it("navigates to /profile when pressing g then p", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g");
      fireKey("p");
      expect(mockPush).toHaveBeenCalledWith("/profile");
    });

    it("navigates to /shop when pressing g then o", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g");
      fireKey("o");
      expect(mockPush).toHaveBeenCalledWith("/shop");
    });

    it("navigates to /notes when pressing g then n", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g");
      fireKey("n");
      expect(mockPush).toHaveBeenCalledWith("/notes");
    });

    it("navigates to /goals when pressing g then g", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g");
      fireKey("g");
      expect(mockPush).toHaveBeenCalledWith("/goals");
    });

    it("navigates to /settings when pressing g then l", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g");
      fireKey("l");
      expect(mockPush).toHaveBeenCalledWith("/settings");
    });
  });

  describe("G-prefix timeout", () => {
    it("does not navigate when timeout expires before second key", () => {
      vi.useFakeTimers();
      renderHook(() => useKeyboardShortcuts());

      fireKey("g");
      // Advance past the 2000ms timeout
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      fireKey("t");

      expect(mockPush).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("Undo/Redo", () => {
    it("calls undoAction on Ctrl+Z", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("z", { ctrlKey: true });
      expect(undoAction).toHaveBeenCalledTimes(1);
    });

    it("calls undoAction on Cmd+Z", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("z", { metaKey: true });
      expect(undoAction).toHaveBeenCalledTimes(1);
    });

    it("calls redoAction on Ctrl+Shift+Z", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("z", { ctrlKey: true, shiftKey: true });
      expect(redoAction).toHaveBeenCalledTimes(1);
    });

    it("calls redoAction on Ctrl+Y", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("y", { ctrlKey: true });
      expect(redoAction).toHaveBeenCalledTimes(1);
    });

    it("calls redoAction on Cmd+Y", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("y", { metaKey: true });
      expect(redoAction).toHaveBeenCalledTimes(1);
    });
  });

  describe("Single-key actions", () => {
    it("dispatches kb:add-habit event on 'n' key", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("n");
      expect(customEventSpy).toHaveBeenCalled();
    });

    it("dispatches kb:toggle-help event on '?' key", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("?");
      expect(customEventSpy).toHaveBeenCalled();
    });
  });

  describe("Modifier key safety", () => {
    it("does not trigger g-prefix when Ctrl+G is pressed", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("g", { ctrlKey: true });
      // Should NOT set gPending, and should NOT navigate
      fireKey("t");
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("does not trigger 'n' add habit when Ctrl+N is pressed", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKey("n", { ctrlKey: true });
      expect(customEventSpy).not.toHaveBeenCalled();
    });

    it("does not block n input when focus is in input", () => {
      renderHook(() => useKeyboardShortcuts());

      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      // Fire on the input so e.target is the input (which is not editable
      // via contentEditable, but has tagName "INPUT")
      fireKey("n", { target: input });
      expect(customEventSpy).not.toHaveBeenCalled();
      document.body.removeChild(input);
    });
  });

  describe("ALL_SHORTCUTS export", () => {
    it("exports all defined shortcuts", async () => {
      const { ALL_SHORTCUTS } = await import("../useKeyboardShortcuts");
      expect(ALL_SHORTCUTS.length).toBe(16);
      expect(ALL_SHORTCUTS.map((s) => s.keys)).toContain("g then d");
      expect(ALL_SHORTCUTS.map((s) => s.keys)).toContain("Ctrl+Z");
      expect(ALL_SHORTCUTS.map((s) => s.keys)).toContain("?");
    });
  });
});
