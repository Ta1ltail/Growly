"use client";

// Undo/redo history stack for the app store.
// Captures snapshots of AppData before each mutation so users can undo/redo
// habit creation, editing, deletion, and mark-cycling actions.
//
// The stack is a circular buffer with undo and redo pointers.
// MAX_HISTORY limits memory usage. Older entries are dropped.
//
// Integration:
//   - Call `pushSnapshot(data)` BEFORE any store mutation (inside update()).
//   - Call `undo()` to go back; returns the restored AppData or null.
//   - Call `redo()` to go forward; returns the restored AppData or null.

import type { AppData } from "./types";

// Maximum number of snapshots to keep. Each snapshot is a deep-cloned copy
// of the full AppData (habits, marks, notes, goals, etc.), so memory usage
// is proportional to data size × MAX_HISTORY. 20 snapshots of a typical user
// with a few hundred marks uses ~1-2MB, which is acceptable for modern
// browsers. Power users with thousands of marks may use up to ~5MB.
// The redo stack shares the same cap, capped independently.
const MAX_HISTORY = 20;

// Estimated maximum bytes for a single snapshot before size-based eviction
// kicks in (~200KB). Applied on push to prevent unbounded memory growth
// for users with very large datasets.
const MAX_HISTORY_BYTES = 200_000;

// Stack of snapshots: index 0 is oldest, length-1 is newest.
let undoStack: AppData[] = [];
let redoStack: AppData[] = [];

// Push a snapshot before a mutation. Captures the current state so we can
// restore it on undo.
export function pushSnapshot(data: AppData): void {
  // Deep-clone to freeze the snapshot
  const snapshot = JSON.parse(JSON.stringify(data)) as AppData;
  undoStack.push(snapshot);
  
  // Cap by count
  while (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  
  // Cap by total estimated bytes — if the stack exceeds the budget, drop
  // oldest entries until under the threshold. The undo stack holds compressed
  // JSON strings, so rough estimate: JSON.stringify length × 2 (in-memory).
  const totalBytes = undoStack.reduce(
    (sum, s) => sum + JSON.stringify(s).length,
    0,
  );
  while (undoStack.length > 1 && totalBytes > MAX_HISTORY_BYTES) {
    undoStack.shift();
  }
  
  // Clear redo stack on new action (standard undo behavior)
  redoStack = [];
}

// Undo: restore the most recent snapshot.
// Returns the restored AppData, or null if there's nothing to undo.
export function undo(currentData: AppData): AppData | null {
  const snapshot = undoStack.pop();
  if (!snapshot) return null;
  redoStack = replaceStack(
    redoStack,
    JSON.parse(JSON.stringify(currentData)) as AppData,
    MAX_HISTORY,
  );
  return snapshot;
}

function replaceStack(stack: AppData[], item: AppData, max: number): AppData[] {
  const next = [...stack, item];
  return next.length > max ? next.slice(1) : next;
}

/** Reset both undo and redo stacks. Used by tests to isolate state between runs. */
export function resetHistory(): void {
  undoStack = [];
  redoStack = [];
}

// Redo: restore the most recently undone snapshot.
// Returns the restored AppData, or null if there's nothing to redo.
export function redo(currentData: AppData): AppData | null {
  const snapshot = redoStack.pop();
  if (!snapshot) return null;
  undoStack = replaceStack(
    undoStack,
    JSON.parse(JSON.stringify(currentData)) as AppData,
    MAX_HISTORY,
  );
  return snapshot;
}
