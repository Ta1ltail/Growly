"use client";

// A round button showing a habit's mark for a day. Tap to cycle the status.

import { MARK_FILL, MARK_LABEL } from "@/lib/marks";
import type { MarkStatus } from "@/lib/types";

export function MarkButton({
  status,
  onClick,
}: {
  status: MarkStatus | undefined;
  onClick: () => void;
}) {
  const base =
    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors";
  return (
    <button
      onClick={onClick}
      aria-label={status ? `Marked ${status}` : "Not marked"}
      className={
        status ? `${base} ${MARK_FILL[status]}` : `${base} border-line bg-surface`
      }
    >
      {status ? MARK_LABEL[status] : ""}
    </button>
  );
}
