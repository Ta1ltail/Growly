import type { MarkStatus } from "./types";

// Tap cycle: none -> done -> missed -> skipped -> none
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
