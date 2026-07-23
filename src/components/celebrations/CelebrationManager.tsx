"use client";

// CelebrationManager drives the unified celebration flow.
// Events pop in the CENTER first (most prestigious first), then fire a Sonner
// toast as they're dismissed. The toast is styled to match the center popup —
// same rarity accent colors, gradient accents, and badge icon consistency.
// Queue progress dots show how many events remain.

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAppData,
  seedCelebrationsSeen,
  seedUnlocksSeen,
  acknowledgeCelebration,
} from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { useSound } from "@/hooks/useSound";
import type { SoundEvent } from "@/lib/sound/SoundManager";
import { buildCelebrationQueue } from "@/lib/celebrations";
import { CONFETTI_SKINS, equippedOrDefault } from "@/lib/economy";
import { CelebrationCenter } from "./CelebrationCenter";
import { RewardChips } from "./RewardChips";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";

// Map celebration kinds to sound events
const CELEBRATION_SOUND_MAP: Partial<Record<string, SoundEvent>> = {
  achievement: "achievement:unlock",
  levelup: "reward:levelup",
  title: "reward:levelup",
  streak: "streak:milestone",
  goal: "goal:complete",
  tier: "achievement:unlock",
  shop: "reward:coin",
};

export function CelebrationManager() {
  const data = useAppData();
  const today = useToday();
  const { play } = useSound();
  const [ready, setReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Track which celebration events have been dismissed this session so they
  // never re-appear regardless of queue rebuilds, re-renders, or Zustand state
  // updates. This is a client-side safety net — the store's seen-markers
  // (set by acknowledgeCelebration) are the persistent source of truth.
  const dismissedRef = useRef(new Set<string>());

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

  // Filter out events dismissed this session to prevent re-shows. The ref-based
  // check is instant and survives re-renders without waiting for the store to
  // propagate — eliminates the race where a shrinking queue resets currentIndex.
  const visibleQueue = useMemo(
    () => queue.filter((ev) => !dismissedRef.current.has(ev.key)),
    [queue],
  );

  // Safely reset index when the visible queue empties or new events arrive.
  // Using an effect here is safe because visibleQueue changes are infrequent
  // and the reset only fires when the current index is out of bounds.
  useEffect(() => {
    if (currentIndex >= visibleQueue.length && visibleQueue.length > 0) {
      setCurrentIndex(0);
    }
  }, [visibleQueue.length]);

  const center =
    ready && visibleQueue.length > 0 && currentIndex < visibleQueue.length
      ? visibleQueue[currentIndex]
      : null;

  // Track which celebration events have already triggered a sound so we never
  // replay a sound from the same event — handles re-renders and duplicate
  // subscriptions safely.
  const playedSoundsRef = useRef(new Set<string>());

  // Play the appropriate sound when a new celebration event is shown.
  // Only plays once per unique event key — guarantees no duplicate playback
  // from hydration, re-renders, sync, or state updates.
  useEffect(() => {
    if (!center) return;
    if (playedSoundsRef.current.has(center.key)) return;
    playedSoundsRef.current.add(center.key);

    const soundEvent = CELEBRATION_SOUND_MAP[center.kind];
    if (soundEvent) {
      play(soundEvent);
    }
  }, [center, play]);

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
              <RewardChips reward={ev.reward} accent={ev.accent} size="sm" />
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

    // Advance to next event or close. Uses visibleQueue (which excludes
    // dismissed events) to determine if there are more events to show.
    if (currentIndex < visibleQueue.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  if (!ready || !center || dismissedRef.current.has(center.key)) return null;

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
