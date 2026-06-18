"use client";

// Center stage of the unified celebration flow: a full-screen takeover card for
// the active CelebrationEvent (any kind). Dismiss via button, backdrop, or
// Escape — which hands the event off to a bottom-right toast and reveals the
// next queued event. Legendary achievements get the confetti burst.

import { useEffect } from "react";
import type { CelebrationEvent } from "@/lib/celebrations";
import { RARITY_STYLE } from "@/lib/rarity";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { Confetti } from "@/components/celebrations/Confetti";

// Stable seed per event so confetti is deterministic (no Math.random in render).
function seedFromKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

export function CelebrationCenter({
  event,
  onDismiss,
}: {
  event: CelebrationEvent;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const confettiColors =
    event.badgeDef ? RARITY_STYLE[event.badgeDef.rarity].confettiColors : [event.accent];

  return (
    <div
      className="fixed inset-0 z-[58] grid place-items-center overflow-hidden bg-black/60 p-4 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${event.eyebrow}: ${event.name}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      {event.confetti && <Confetti colors={confettiColors} count={90} seed={seedFromKey(event.key)} />}

      {/* radial glow behind the icon */}
      <div
        aria-hidden
        className="animate-glow-pulse pointer-events-none absolute size-72 rounded-full blur-3xl"
        style={{ background: event.glow }}
      />

      <div className="animate-rise relative flex w-[min(22rem,calc(100vw-2rem))] flex-col items-center rounded-3xl border border-line bg-surface p-6 text-center shadow-2xl">
        <p
          className="text-xs font-bold uppercase tracking-[0.2em]"
          style={{ color: event.accent }}
        >
          {event.eyebrow}
        </p>

        <div className="my-5 animate-[celebrate-in_0.6s_var(--ease-spring)_both]">
          {event.badgeDef ? (
            <AchievementBadge def={event.badgeDef} size={108} shine={event.confetti || event.badgeDef.rarity === "epic"} />
          ) : (
            <span
              className="grid size-24 place-items-center rounded-2xl text-5xl"
              style={{ background: `${event.accent}1f`, boxShadow: `0 12px 36px -8px ${event.glow}` }}
              aria-hidden
            >
              {event.emoji}
            </span>
          )}
        </div>

        <h2 className="text-xl font-bold tracking-tight">{event.name}</h2>
        <p className="mt-1 text-sm text-muted">{event.description}</p>

        {event.reward && (
          <div
            className="mt-4 rounded-full px-4 py-1 font-mono text-sm font-bold"
            style={{ background: `${event.accent}1f`, color: event.accent }}
          >
            {event.reward}
          </div>
        )}

        <button
          onClick={onDismiss}
          className="mt-6 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-95"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
}
