// Shared logic for habit marks: the tap cycle and display labels.

import type { MarkStatus } from "./types";

// Tap order: none -> done -> missed -> skipped -> none
export const CYCLE: (MarkStatus | undefined)[] = [
  undefined,
  "done",
  "missed",
  "skipped",
];

export function nextStatus(cur: MarkStatus | undefined): MarkStatus | undefined {
  return CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
}

export const MARK_LABEL: Record<MarkStatus, string> = {
  done: "✓",
  missed: "✕",
  skipped: "–",
};

// Tailwind classes for a filled mark of each status.
export const MARK_FILL: Record<MarkStatus, string> = {
  done: "border-done bg-done text-white",
  missed: "border-missed bg-missed text-white",
  skipped: "border-skipped bg-skipped text-white",
};
