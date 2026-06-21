// Shared logic for habit marks: the tap cycle and display labels.

import type { MarkStatus } from "./types";

// Tap order: none -> done -> missed -> skipped -> none
const CYCLE: (MarkStatus | undefined)[] = [
  undefined,
  "done",
  "missed",
  "skipped",
];

export function nextStatus(
  cur: MarkStatus | undefined,
): MarkStatus | undefined {
  return CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
}

const MARK_LABEL: Record<MarkStatus, string> = {
  done: "✓",
  missed: "✕",
  skipped: "–",
};
