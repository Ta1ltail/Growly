"use client";

// Medium celebration (rare / epic): a centered popup card with an animated
// badge entrance. Dismiss via button, backdrop, or Escape.

import { useEffect } from "react";
import type { AchievementDef } from "@/lib/types";
import { RARITY_STYLE } from "@/lib/rarity";
import { AchievementBadge } from "@/components/AchievementBadge";

export function AchievementPopup({
  def,
  xp,
  onDismiss,
}: {
  def: AchievementDef;
  xp: number;
  onDismiss: () => void;
}) {
  const r = RARITY_STYLE[def.rarity];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[58] grid place-items-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Achievement unlocked: ${def.name}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div className="animate-rise flex w-[min(22rem,calc(100vw-2rem))] flex-col items-center rounded-3xl border border-line bg-surface p-6 text-center shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: r.accent }}>
          {r.label} Achievement
        </p>
        <div className="my-4 animate-[celebrate-in_0.6s_var(--ease-spring)_both]">
          <AchievementBadge def={def} size={104} shine={def.rarity === "epic"} />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{def.name}</h2>
        <p className="mt-1 text-sm text-muted">{def.description}</p>
        <div
          className="mt-4 rounded-full px-4 py-1 font-mono text-sm font-bold"
          style={{ background: `${r.accent}1f`, color: r.accent }}
        >
          +{xp} XP
        </div>
        <button
          onClick={onDismiss}
          className="mt-5 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-95"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
}
