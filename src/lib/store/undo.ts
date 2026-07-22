"use client";

// Undo / redo — domain logic extracted from index.ts

import { update } from "./core";
import { undo as undoHistory, redo as redoHistory } from "../history";

/* ---------------- undo / redo ---------------- */

// Undo the last action. Returns true if something was undone.
export function undoAction(): boolean {
  let didUndo = false;
  update((prev) => {
    const restored = undoHistory(prev);
    if (!restored) return prev;
    didUndo = true;
    // Preserve the current session's settings and profile to avoid losing
    // preferences when undoing
    return {
      ...restored,
      settings: prev.settings,
      profile: prev.profile,
    };
  }, false); // don't record history for undo itself
  return didUndo;
}

// Redo the last undone action. Returns true if something was redone.
export function redoAction(): boolean {
  let didRedo = false;
  update((prev) => {
    const restored = redoHistory(prev);
    if (!restored) return prev;
    didRedo = true;
    return {
      ...restored,
      settings: prev.settings,
      profile: prev.profile,
    };
  }, false); // don't record history for redo itself
  return didRedo;
}
