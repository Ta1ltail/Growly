"use client";

// Major celebration (legendary): full-screen takeover with confetti, a glowing
// shined badge, and the XP reward. Dismiss via button or Escape.

import { useEffect } from "react";
import type { AchievementDef } from "@/lib/types";
import { RARITY_STYLE } from "@/lib/rarity";
import { AchievementBadge } from "@/components/AchievementBadge";
import { Confetti } from "@/components/Confetti";

// Stable seed per achievement so confetti is deterministic (no Math.random in
// render path / no hydration drift), yet varies between achievements.
function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

export function AchievementCelebration({
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
      className="fixed inset-0 z-[58] grid place-items-center overflow-hidden bg-black/70 p-4 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Legendary achievement unlocked: ${def.name}`}
    >
      <Confetti colors={r.confettiColors} count={90} seed={seedFromId(def.id)} />

      {/* radial glow behind the badge */}
      <div
        aria-hidden
        className="animate-glow-pulse pointer-events-none absolute size-80 rounded-full blur-3xl"
        style={{ background: r.glow }}
      />

      <div className="relative flex flex-col items-center text-center">
        <p
          className="text-sm font-bold uppercase tracking-[0.3em]"
          style={{ color: r.accent, textShadow: `0 0 18px ${r.glow}` }}
        >
          Legendary Unlock
        </p>
        <div className="my-6 animate-[celebrate-in_0.7s_var(--ease-spring)_both]">
          <AchievementBadge def={def} size={148} shine />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white drop-shadow">{def.name}</h2>
        <p className="mt-2 max-w-xs text-sm text-white/70">{def.description}</p>
        <div
          className="mt-5 rounded-full px-5 py-1.5 font-mono text-base font-bold text-white"
          style={{ background: r.gradient, boxShadow: `0 8px 24px -6px ${r.glow}` }}
        >
          +{xp} XP
        </div>
        <button
          onClick={onDismiss}
          className="mt-7 rounded-xl border border-white/25 bg-white/10 px-8 py-2.5 text-sm font-semibold text-white backdrop-blur transition-transform hover:bg-white/20 active:scale-95"
        >
          Claim
        </button>
      </div>
    </div>
  );
}
