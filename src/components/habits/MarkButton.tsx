"use client";

// A round mark button. Tap to cycle none -> done -> missed -> skipped.
// When `locked` (past day under the Honest Tracking Policy) it is disabled
// and shows a subtle lock instead of inviting a tap.

import { Check, Lock, Minus, Snowflake, X } from "lucide-react";
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
  frozen = false,
}: {
  status: MarkStatus | undefined;
  onClick: () => void;
  size?: number;
  locked?: boolean;
  // A streak-freeze protects this (missed) day — show a snowflake badge so the
  // protected miss is visually distinct from an unprotected one.
  frozen?: boolean;
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
      aria-label={`${locked ? `Locked${status ? `, marked ${status}` : ""}` : status ? `Marked ${status}` : "Not marked"}${frozen ? ", protected by a streak freeze" : ""}`}
      style={{ width: size, height: size }}
      className={`relative flex shrink-0 items-center justify-center rounded-full border transition-all active:scale-90 before:absolute before:inset-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:min-w-[44px] before:min-h-[44px] before:content-[''] ${
        status
          ? STYLES[status]
          : "border-line bg-surface2 hover:border-accent hover:scale-110"
      } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
    >
      {status === "done" && (
        <span
          key="done-burst"
          aria-hidden
          className="animate-burst pointer-events-none absolute inset-0 rounded-full ring-2 ring-done/60"
        />
      )}
      {icon}
      {frozen && (
        <span
          aria-hidden
          title="Protected by a streak freeze"
          className="absolute -right-1 -top-1 grid place-items-center rounded-full bg-sky-500 text-white ring-2 ring-surface"
          style={{
            width: Math.round(size * 0.5),
            height: Math.round(size * 0.5),
          }}
        >
          <Snowflake
            style={{ width: size * 0.3, height: size * 0.3 }}
            strokeWidth={3}
          />
        </span>
      )}
    </button>
  );
}
