"use client";

// A round mark button. Tap to cycle none -> done -> missed -> skipped.
// When `locked` (past day under the Honest Tracking Policy) it is disabled
// and shows a subtle lock instead of inviting a tap.

import { Check, Lock, Minus, X } from "lucide-react";
import type { MarkStatus } from "@/lib/types";

const STYLES: Record<MarkStatus, string> = {
  done: "border-done bg-done text-white shadow-md shadow-done/30",
  missed: "border-missed bg-missed text-white shadow-md shadow-missed/30",
  skipped: "border-skipped bg-skipped text-white",
};

export function MarkButton({
  status,
  onClick,
  size = 24,
  locked = false,
}: {
  status: MarkStatus | undefined;
  onClick: () => void;
  size?: number;
  locked?: boolean;
}) {
  const icon =
    status === "done" ? (
      <Check className="size-3.5 animate-pop" strokeWidth={3} />
    ) : status === "missed" ? (
      <X className="size-3.5 animate-pop" strokeWidth={3} />
    ) : status === "skipped" ? (
      <Minus className="size-3.5 animate-pop" strokeWidth={3} />
    ) : locked ? (
      <Lock className="size-3 opacity-50" />
    ) : null;

  return (
    <button
      onClick={onClick}
      disabled={locked && !status}
      aria-label={locked ? `Locked${status ? `, marked ${status}` : ""}` : status ? `Marked ${status}` : "Not marked"}
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-full border transition-all active:scale-90 ${
        status ? STYLES[status] : "border-line bg-surface2 hover:border-accent"
      } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
    >
      {icon}
    </button>
  );
}
