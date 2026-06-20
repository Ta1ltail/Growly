"use client";

// Drives the unified celebration flow: progression events (achievement,
// level-up, title, shop, streak milestone) pop in the CENTER first, then fire
// a Sonner toast as they're dismissed. The queue is DERIVED from the persisted
// seen-markers — no event objects are stored.

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

  useEffect(() => {
    seedCelebrationsSeen();
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const queue = useMemo(
    () => buildCelebrationQueue(data, today),
    [data, today],
  );
  const center = ready ? (queue[0] ?? null) : null;

  function dismissCenter() {
    if (!center) return;
    acknowledgeCelebration(center);
    const ev = center;
    // Fire Sonner toast with the celebration info
    const emoji = ev.badgeDef?.icon ?? ev.emoji ?? "🎉";
    toast(ev.name, {
      description: `${ev.eyebrow} · ${ev.reward ?? ev.description}`,
      icon: emoji,
      duration: 4000,
    });
  }

  if (!ready || !center) return null;

  return (
    <CelebrationCenter
      key={center.key}
      event={center}
      onDismiss={dismissCenter}
    />
  );
}
