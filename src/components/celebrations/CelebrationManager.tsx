"use client";

// Shows a celebration whenever an achievement unlocks and hasn't been seen yet
// (spec §5): toast (common) · popup (rare/epic) · full-screen + confetti
// (legendary). The "queue" is DERIVED, not stored — the set of unseen unlocks
// in the store IS the queue, so we just render the most prestigious unseen one.
// Dismissing marks it seen in the store, which removes it and reveals the next.
//
// A one-time silent seed on mount records all already-earned achievements as
// seen, so a returning user only celebrates achievements earned THIS session.
// We gate rendering on `ready` (set via rAF after the seed) so nothing flashes
// before seeding lands.

import { useEffect, useState } from "react";
import { useAppData, seedUnlocksSeen, markAchievementsSeen } from "@/lib/store";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { RARITY_STYLE } from "@/lib/rarity";
import { RARITY_XP } from "@/lib/xp";
import type { AchievementDef } from "@/lib/types";
import { AchievementToast } from "./AchievementToast";
import { AchievementPopup } from "./AchievementPopup";
import { AchievementCelebration } from "./AchievementCelebration";

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function CelebrationManager() {
  const data = useAppData();
  const [ready, setReady] = useState(false);

  // One-time silent seed, then arm the watcher on the next frame.
  useEffect(() => {
    seedUnlocksSeen();
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) return null;

  // Most prestigious unseen unlock = the one to celebrate now.
  let current: AchievementDef | null = null;
  let bestXp = -1;
  for (const [id, rec] of Object.entries(data.unlocks)) {
    if (rec.seen) continue;
    const def = BY_ID.get(id);
    if (!def) continue;
    const xp = RARITY_XP[def.rarity];
    if (xp > bestXp) {
      bestXp = xp;
      current = def;
    }
  }

  if (!current) return null;

  const tier = RARITY_STYLE[current.rarity].tier;
  const xp = RARITY_XP[current.rarity];
  const dismiss = () => markAchievementsSeen([current!.id]);

  if (tier === "toast") {
    return <AchievementToast key={current.id} def={current} xp={xp} onDismiss={dismiss} />;
  }
  if (tier === "popup") {
    return <AchievementPopup key={current.id} def={current} xp={xp} onDismiss={dismiss} />;
  }
  return <AchievementCelebration key={current.id} def={current} xp={xp} onDismiss={dismiss} />;
}
