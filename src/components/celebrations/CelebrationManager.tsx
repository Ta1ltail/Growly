"use client";

// CelebrationManager drives the unified celebration flow.
// Events pop in the CENTER first (most prestigious first), then fire a Sonner
// toast as they're dismissed. The toast is styled to match the center popup —
// same rarity accent colors, gradient accents, and badge icon consistency.
// Queue progress dots show how many events remain.

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useAppData,
  seedCelebrationsSeen,
  acknowledgeCelebration,
} from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { buildCelebrationQueue } from "@/lib/celebrations";
import { CelebrationCenter } from "./CelebrationCenter";

export function CelebrationManager() {
  const data = useAppData();
  const today = useToday();
  const [ready, setReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    seedCelebrationsSeen();
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const queue = useMemo(
    () => buildCelebrationQueue(data, today),
    [data, today],
  );

  // Reset index when queue changes (new achievements, etc.)
  useEffect(() => {
    setCurrentIndex(0);
  }, [queue.length]);

  const center = ready && queue.length > 0 ? queue[currentIndex] : null;

  function dismissCenter() {
    if (!center) return;
    acknowledgeCelebration(center);

    // Fire a toast styled to match the center popup — same accent color,
    // rarity badge, reward display, and gradient accent bar.
    const ev = center;
    const emoji = ev.badgeDef?.icon ?? ev.emoji ?? "🎉";

    toast.custom(
      (t) => (
        <div
          onClick={() => toast.dismiss(t)}
          className="flex items-start gap-3 rounded-xl border p-3 shadow-lg cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
          style={{
            background: "var(--c-surface)",
            borderColor: ev.accent + "40",
            boxShadow: `0 4px 16px -4px ${ev.glow}`,
            minWidth: 280,
            maxWidth: 360,
          }}
        >
          {/* Accent bar */}
          <div
            className="mt-0.5 h-10 w-1 shrink-0 rounded-full"
            style={{ background: ev.accent }}
          />

          {/* Icon / badge */}
          <span
            className="grid size-10 shrink-0 place-items-center rounded-lg text-lg"
            style={{
              background: `${ev.accent}18`,
              color: ev.accent,
            }}
          >
            {emoji}
          </span>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-ink">
              {ev.name}
            </p>
            <p className="mt-0.5 text-xs text-muted leading-tight">
              {ev.eyebrow}
            </p>
            {ev.reward && (
              <p
                className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{
                  background: `${ev.accent}15`,
                  color: ev.accent,
                }}
              >
                {ev.reward}
              </p>
            )}
          </div>
        </div>
      ),
      { duration: 5000 },
    );

    // Advance to next event or close
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  if (!ready || !center) return null;

  return (
    <CelebrationCenter
      key={center.key}
      event={center}
      onDismiss={dismissCenter}
      queueIndex={currentIndex}
      queueTotal={queue.length}
    />
  );
}
