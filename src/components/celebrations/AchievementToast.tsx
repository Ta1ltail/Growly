"use client";

// Small celebration (common): a slide-in toast that auto-dismisses.

import { useEffect } from "react";
import type { AchievementDef } from "@/lib/types";
import { RARITY_STYLE } from "@/lib/rarity";
import { AchievementBadge } from "@/components/AchievementBadge";

const VISIBLE_MS = 4200;

export function AchievementToast({
  def,
  xp,
  onDismiss,
}: {
  def: AchievementDef;
  xp: number;
  onDismiss: () => void;
}) {
  const r = RARITY_STYLE[def.rarity];

  // The manager keys each toast by achievement id, so this instance maps to one
  // achievement; auto-dismiss it after the visible window.
  useEffect(() => {
    const t = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-[55] flex justify-end sm:bottom-6 sm:right-6">
      <button
        onClick={onDismiss}
        className="animate-[toast-in_var(--dur-base)_var(--ease-spring)_both] flex w-[min(20rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left shadow-lg ring-1 ring-inset hover:bg-surface2"
        style={{ boxShadow: `0 12px 32px -10px ${r.glow}` }}
        aria-label={`Achievement unlocked: ${def.name}. Dismiss.`}
      >
        <AchievementBadge def={def} size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: r.accent }}>
            {r.label} Unlocked
          </p>
          <p className="truncate text-sm font-semibold">{def.name}</p>
          <p className="truncate text-xs text-muted">{def.description}</p>
        </div>
        <span className="shrink-0 self-start rounded-full bg-surface2 px-2 py-0.5 font-mono text-xs font-bold text-accent">
          +{xp}
        </span>
      </button>
    </div>
  );
}
