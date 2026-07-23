"use client";

// Center stage of the unified celebration flow: a full-screen takeover card for
// the active CelebrationEvent (any kind). Dismiss via button, backdrop, or
// Escape — which hands the event off to a bottom-right toast and reveals the
// next queued event. Legendary achievements get the confetti burst.

import { useEffect, useRef, lazy, Suspense } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { CelebrationEvent } from "@/lib/celebrations";
import { RARITY_STYLE } from "@/lib/rarity";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { RewardChips } from "./RewardChips";

const Confetti = lazy(() =>
  import("@/components/celebrations/Confetti").then((m) => ({
    default: m.Confetti,
  })),
);

function seedFromKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

export function CelebrationCenter({
  event,
  onDismiss,
  queueIndex,
  queueTotal,
  confettiPalette,
}: {
  event: CelebrationEvent;
  onDismiss: () => void;
  queueIndex?: number;
  queueTotal?: number;
  confettiPalette?: string[];
}) {
  // Lock background scroll while the celebration is shown.
  // Scroll is released when the component unmounts (user dismisses all events).
  useScrollLock(true);

  // Keep the latest onDismiss in a ref (updated in an effect, not during
  // render) so the keydown listener below can stay subscribed once with [].
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismissRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const confettiColors =
    confettiPalette ??
    (event.badgeDef
      ? RARITY_STYLE[event.badgeDef.rarity].confettiColors
      : [event.accent]);

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
      {event.confetti && (
        <Suspense fallback={null}>
          <Confetti
            colors={confettiColors}
            count={90}
            seed={seedFromKey(event.key)}
          />
        </Suspense>
      )}

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
            <AchievementBadge
              def={event.badgeDef}
              size={108}
              shine={event.confetti || event.badgeDef.rarity === "epic"}
            />
          ) : (
            <span
              className="grid size-24 place-items-center rounded-2xl text-5xl"
              style={{
                background: `${event.accent}1f`,
                boxShadow: `0 12px 36px -8px ${event.glow}`,
              }}
              aria-hidden
            >
              {event.emoji}
            </span>
          )}
        </div>

        <h2 className="text-xl font-bold tracking-tight">{event.name}</h2>
        <p className="mt-1 text-sm text-muted">{event.description}</p>

        {event.reward && (
          <RewardChips reward={event.reward} accent={event.accent} size="md" />
        )}

        {/* Queue progress */}
        {queueTotal !== undefined && queueTotal > 1 && (
          <div className="mt-4 flex items-center gap-1.5">
            {Array.from({ length: queueTotal }, (_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: i === (queueIndex ?? 0) ? 16 : 6,
                  background:
                    i === (queueIndex ?? 0)
                      ? event.accent
                      : i < (queueIndex ?? 0)
                        ? `${event.accent}40`
                        : "var(--c-line)",
                }}
              />
            ))}
          </div>
        )}

        <button
          onClick={onDismiss}
          className="mt-6 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${event.accent}, color-mix(in srgb, ${event.accent} 80%, #000))`,
            boxShadow: `0 4px 16px -4px ${event.glow}`,
          }}
        >
          {queueTotal && queueTotal > 1 && (queueIndex ?? 0) < queueTotal - 1
            ? "Next achievement →"
            : "Awesome!"}
        </button>
      </div>
    </div>
  );
}
