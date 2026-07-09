"use client";

// CelebrationManager drives the unified celebration flow.
// Events pop in the CENTER first (most prestigious first), then fire a Sonner
// toast as they're dismissed. The toast is styled to match the center popup —
// same rarity accent colors, gradient accents, and badge icon consistency.
// Queue progress dots show how many events remain.

import { useEffect, useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import {
  useAppData,
  seedCelebrationsSeen,
  seedUnlocksSeen,
  acknowledgeCelebration,
} from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { buildCelebrationQueue } from "@/lib/celebrations";
import { CONFETTI_SKINS, equippedOrDefault } from "@/lib/economy";
import { CelebrationCenter } from "./CelebrationCenter";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";

export function CelebrationManager() {
  const data = useAppData();
  const today = useToday();
  const [ready, setReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Baseline both the achievement seen-flags and the progress markers once on
    // mount so a returning/migrating user isn't flooded with celebrations for
    // progress earned before this session.
    seedUnlocksSeen();
    seedCelebrationsSeen();
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const queue = useMemo(
    () => buildCelebrationQueue(data, today),
    [data, today],
  );

  // Reset index when the queue changes (new achievements, etc.). Done during
  // render — the documented React pattern — rather than in an effect, which
  // would trigger a cascading re-render.
  const [prevLen, setPrevLen] = useState(queue.length);
  if (prevLen !== queue.length) {
    setPrevLen(queue.length);
    setCurrentIndex(0);
  }

  const center =
    ready && queue.length > 0 && currentIndex < queue.length
      ? queue[currentIndex]
      : null;

  // Equipped confetti cosmetic — override the default colors only when the user
  // has bought and equipped a non-default palette.
  const confettiSkin = equippedOrDefault(data.economy, "confetti");
  const confettiPalette =
    confettiSkin === "confetti-default"
      ? undefined
      : CONFETTI_SKINS[confettiSkin];

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
          {/* Icon / badge — real achievement art when available, to match the
              center popup; emoji tile otherwise. */}
          {ev.badgeDef ? (
            <div className="shrink-0">
              <AchievementBadge def={ev.badgeDef} size={40} />
            </div>
          ) : (
            <span
              className="grid size-10 shrink-0 place-items-center rounded-lg text-lg"
              style={{
                background: `${ev.accent}18`,
                color: ev.accent,
              }}
            >
              {emoji}
            </span>
          )}

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-ink">
              {ev.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted leading-tight">
              {ev.eyebrow}
            </p>
            {ev.reward && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {ev.reward
                  .split("·")
                  .map((part) => part.trim())
                  .filter(Boolean)
                  .map((part, i) => {
                    // Render the coin glyph as the lucide SVG instead of the
                    // emoji so it can't fall back to a missing-glyph box.
                    const isCoin = part.includes("🪙");
                    const text = part.replace("🪙", "").trim();
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: `${ev.accent}15`,
                          color: ev.accent,
                        }}
                      >
                        {text}
                        {isCoin && <Coins className="size-3" aria-hidden />}
                      </span>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      ),
      {
        duration: 5000,
        // The card below brings its own surface, border, and bevel shadow.
        // Strip Sonner's default container chrome (and the global closeButton +
        // toastOptions.style from <Toaster>) so it doesn't render a second
        // bordered rectangle behind the card.
        unstyled: true,
        closeButton: false,
        style: {
          background: "transparent",
          border: "none",
          boxShadow: "none",
          padding: 0,
        },
      },
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
      confettiPalette={confettiPalette}
    />
  );
}
