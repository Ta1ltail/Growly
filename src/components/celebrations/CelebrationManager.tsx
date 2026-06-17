"use client";

// Drives the unified celebration flow (spec §5, extended): EVERY progression
// event — achievement unlocked, level up, new title, shop unlock, streak
// milestone — pops in the CENTER first, then hands off to a bottom-right TOAST,
// one at a time (queued).
//
// The queue is DERIVED: buildCelebrationQueue diffs current progress against the
// persisted seen-markers (lib/celebrations). The active center event is just
// queue[0]; dismissing it acknowledges the event (advancing the seen-marker,
// which drops it from the queue and reveals the next) AND appends it to the
// ephemeral bottom-right toast stack.
//
// A one-time silent baseline on mount records existing progress as seen, so a
// returning user only celebrates progress earned from now on. We gate rendering
// on `ready` (set via rAF after the seed) so nothing flashes before it lands.

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppData, seedCelebrationsSeen, acknowledgeCelebration } from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { buildCelebrationQueue, type CelebrationEvent } from "@/lib/celebrations";
import { CelebrationCenter } from "./CelebrationCenter";
import { CelebrationToast } from "./CelebrationToast";

export function CelebrationManager() {
  const data = useAppData();
  const today = useToday();
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; event: CelebrationEvent }[]>([]);
  const counter = useRef(0);

  // One-time silent baseline, then arm the watcher on the next frame.
  useEffect(() => {
    seedCelebrationsSeen();
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const queue = useMemo(() => buildCelebrationQueue(data, today), [data, today]);
  const center = ready ? queue[0] ?? null : null;

  function dismissCenter() {
    if (!center) return;
    const ev = center;
    acknowledgeCelebration(ev); // advances seen → queue drops it → next reveals
    setToasts((prev) => [...prev, { id: counter.current++, event: ev }]);
  }

  if (!ready) return null;

  return (
    <>
      {center && <CelebrationCenter key={center.key} event={center} onDismiss={dismissCenter} />}

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[55] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
          {toasts.map((t) => (
            <CelebrationToast
              key={t.id}
              event={t.event}
              onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            />
          ))}
        </div>
      )}
    </>
  );
}
