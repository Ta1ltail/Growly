// @vitest-environment happy-dom
//
// Tests for store undo/redo system.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { emptyData, saveData, loadData } from "../../storage";
import {
  addHabit,
  undoAction,
  redoAction,
  reloadCache,
  setSyncCallback,
} from "../../store";
import { getSnapshot } from "../core";
import { makeHabit } from "../../habits";

function installStorage() {
  let store: Record<string, string> = {};
  const ls = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
  // @ts-expect-error
  globalThis.window = { localStorage: ls, ...globalThis.window };
}

beforeEach(() => {
  vi.clearAllMocks();
  installStorage();
  saveData(emptyData);
  reloadCache();
  setSyncCallback(null);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("undoAction", () => {
  it("returns false when there's nothing to undo", () => {
    expect(undoAction()).toBe(false);
  });

  it("undoes the last addHabit", () => {
    const h = makeHabit({ name: "Test", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" });
    addHabit(h);
    expect(getSnapshot().habits).toHaveLength(1);

    const didUndo = undoAction();
    expect(didUndo).toBe(true);
    expect(getSnapshot().habits).toHaveLength(0);
  });

  it("undoes multiple operations in reverse order", () => {
    const h1 = makeHabit({ name: "First", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" });
    const h2 = makeHabit({ name: "Second", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" });
    addHabit(h1);
    addHabit(h2);
    expect(getSnapshot().habits).toHaveLength(2);

    undoAction();
    expect(getSnapshot().habits).toHaveLength(1);
    expect(getSnapshot().habits[0].name).toBe("First");

    undoAction();
    expect(getSnapshot().habits).toHaveLength(0);
  });

  it("preserves settings and profile after undo", () => {
    const h = makeHabit({ name: "Test", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" });
    addHabit(h);
    const beforeUndo = getSnapshot();

    undoAction();
    const afterUndo = getSnapshot();

    // Settings and profile should be the same reference (preserved by undoAction)
    expect(afterUndo.settings).toBe(beforeUndo.settings);
    expect(afterUndo.profile).toBe(beforeUndo.profile);
  });

  it("does not affect previous undo history when creating after undo", () => {
    const h1 = makeHabit({ name: "First", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" });
    addHabit(h1);

    const h2 = makeHabit({ name: "Second", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" });
    addHabit(h2);

    // Undo the second addition
    undoAction();
    expect(getSnapshot().habits).toHaveLength(1);

    // Add a new habit (this should clear the redo stack)
    const h3 = makeHabit({ name: "Third", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" });
    addHabit(h3);
    expect(getSnapshot().habits).toHaveLength(2);
    expect(getSnapshot().habits[0].name).toBe("First");
    expect(getSnapshot().habits[1].name).toBe("Third");
  });
});

describe("redoAction", () => {
  it("returns false when there's nothing to redo", () => {
    expect(redoAction()).toBe(false);
  });

  it("redoes the last undone action", () => {
    const h = makeHabit({ name: "Test", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" });
    addHabit(h);
    undoAction();
    expect(getSnapshot().habits).toHaveLength(0);

    const didRedo = redoAction();
    expect(didRedo).toBe(true);
    expect(getSnapshot().habits).toHaveLength(1);
    expect(getSnapshot().habits[0].name).toBe("Test");
  });

  it("does not redo after a new action is taken", () => {
    const h1 = makeHabit({ name: "First", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" });
    addHabit(h1);

    const h2 = makeHabit({ name: "Second", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" });
    addHabit(h2);

    undoAction(); // Undo Second
    undoAction(); // Undo First

    // New action
    const h3 = makeHabit({ name: "Third", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" });
    addHabit(h3);

    // Redo should do nothing (redo stack was cleared)
    expect(redoAction()).toBe(false);
  });

  it("preserves settings and profile after redo", () => {
    const h = makeHabit({ name: "Test", category: "Health", recurrence: { kind: "daily" }, repeatDays: [], priority: "med" });
    addHabit(h);

    undoAction();
    const beforeRedo = getSnapshot();

    redoAction();
    const afterRedo = getSnapshot();

    expect(afterRedo.settings).toBe(beforeRedo.settings);
    expect(afterRedo.profile).toBe(beforeRedo.profile);
  });
});
