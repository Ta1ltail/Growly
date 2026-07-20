"use client";

// Undo/redo stack for AppData snapshots. Captures state before each mutation.

import type { AppData } from "./types";

const MAX_HISTORY = 20;
const MAX_HISTORY_BYTES = 200_000;

let undoStack: AppData[] = [];
let redoStack: AppData[] = [];
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
