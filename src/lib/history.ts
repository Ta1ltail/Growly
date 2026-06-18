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
//   - Call `canUndo()` / `canRedo()` to check availability (for UI indicators).

import type { AppData } from "./types";

const MAX_HISTORY = 50;

// Stack of snapshots: index 0 is oldest, length-1 is newest.
let undoStack: AppData[] = [];
let redoStack: AppData[] = [];

// Push a snapshot before a mutation. Captures the current state so we can
// restore it on undo.
export function pushSnapshot(data: AppData): void {
  // Deep-clone to freeze the snapshot
  const snapshot = JSON.parse(JSON.stringify(data)) as AppData;
  undoStack.push(snapshot);
  if (undoStack.length > MAX_HISTORY) {
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
  // Push current state onto redo stack
  redoStack.push(JSON.parse(JSON.stringify(currentData)) as AppData);
  if (redoStack.length > MAX_HISTORY) {
    redoStack.shift();
  }
  return snapshot;
}

// Redo: restore the most recently undone snapshot.
// Returns the restored AppData, or null if there's nothing to redo.
export function redo(currentData: AppData): AppData | null {
  const snapshot = redoStack.pop();
  if (!snapshot) return null;
  // Push current state onto undo stack
  undoStack.push(JSON.parse(JSON.stringify(currentData)) as AppData);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  return snapshot;
}

export function canUndo(): boolean {
  return undoStack.length > 0;
}

export function canRedo(): boolean {
  return redoStack.length > 0;
}

// Get the description of the next undoable action (for UI tooltip).
export function undoLabel(): string {
  if (undoStack.length === 0) return "Nothing to undo";
  return "Undo last action";
}

// Get the description of the next redoable action (for UI tooltip).
export function redoLabel(): string {
  if (redoStack.length === 0) return "Nothing to redo";
  return "Redo last undone action";
}

// Debug: clear both stacks (useful for dev mode)
export function clearHistory(): void {
  undoStack = [];
  redoStack = [];
}
