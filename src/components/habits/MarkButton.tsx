"use client";

// A round mark button. Tap to cycle none -> done -> missed -> skipped.
// Animates the icon in with a pop.

import { Check, Minus, X } from "lucide-react";
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
}: {
  status: MarkStatus | undefined;
  onClick: () => void;
  size?: number;
}) {
  const icon =
    status === "done" ? (
      <Check className="size-3.5 animate-pop" strokeWidth={3} />
    ) : status === "missed" ? (
      <X className="size-3.5 animate-pop" strokeWidth={3} />
    ) : status === "skipped" ? (
      <Minus className="size-3.5 animate-pop" strokeWidth={3} />
    ) : null;

  return (
    <button
      onClick={onClick}
      aria-label={status ? `Marked ${status}` : "Not marked"}
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-full border transition-all active:scale-90 ${
        status ? STYLES[status] : "border-line bg-surface2 hover:border-accent"
      }`}
    >
      {icon}
    </button>
  );
}
