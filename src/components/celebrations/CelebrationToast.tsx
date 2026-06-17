"use client";

// Bottom-right stage of the unified celebration flow: after the center popup is
// dismissed the event lingers here as a small auto-dismissing toast. Positioned
// by the manager's stack container (this renders just the card).

import { useEffect } from "react";
import type { CelebrationEvent } from "@/lib/celebrations";
import { AchievementBadge } from "@/components/AchievementBadge";

const VISIBLE_MS = 4200;

export function CelebrationToast({
  event,
  onDismiss,
}: {
  event: CelebrationEvent;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <button
      onClick={onDismiss}
      className="animate-[toast-in_var(--dur-base)_var(--ease-spring)_both] flex w-[min(20rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left shadow-lg hover:bg-surface2"
      style={{ boxShadow: `0 12px 32px -10px ${event.glow}` }}
      aria-label={`${event.eyebrow}: ${event.name}. Dismiss.`}
    >
      {event.badgeDef ? (
        <AchievementBadge def={event.badgeDef} size={48} />
      ) : (
        <span
          className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl"
          style={{ background: `${event.accent}1f` }}
          aria-hidden
        >
          {event.emoji}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: event.accent }}>
          {event.eyebrow}
        </p>
        <p className="truncate text-sm font-semibold">{event.name}</p>
        <p className="truncate text-xs text-muted">{event.description}</p>
      </div>
      {event.reward && (
        <span className="shrink-0 self-start rounded-full bg-surface2 px-2 py-0.5 font-mono text-xs font-bold text-accent">
          {event.reward}
        </span>
      )}
    </button>
  );
}
