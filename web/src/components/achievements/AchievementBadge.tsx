// Collectible achievement badge (spec §6). Rarity drives the gradient ring,
// glow, and medal. Used in celebrations and the Achievement Gallery.

import { memo } from "react";
import type { AchievementDef } from "@/lib/types";
import { RARITY_STYLE } from "@/lib/rarity";

export const AchievementBadge = memo(function AchievementBadge({
  def,
  size = 72,
  locked = false,
  shine = false,
}: {
  def: AchievementDef;
  size?: number;
  locked?: boolean;
  shine?: boolean;
}) {
  const r = RARITY_STYLE[def.rarity];
  return (
    <div
      className="relative grid place-items-center rounded-2xl"
      style={{
        width: size,
        height: size,
        background: locked ? "var(--c-surface2)" : r.gradient,
        boxShadow: locked
          ? "none"
          : `0 8px 24px -8px ${r.glow}, inset 0 0 0 1px rgba(255,255,255,0.15)`,
      }}
    >
      {shine && !locked && (
        <span
          aria-hidden
          className="animate-[spin-slow_6s_linear_infinite] pointer-events-none absolute inset-0 rounded-2xl opacity-40"
          style={{
            background: `conic-gradient(from 0deg, transparent, ${r.accent}, transparent 40%)`,
          }}
        />
      )}
      <span
        className="relative leading-none"
        style={{
          fontSize: size * 0.42,
          filter: locked ? "grayscale(1) opacity(0.4)" : "none",
        }}
      >
        {def.icon}
      </span>
      <span
        className="absolute -bottom-1 -right-1 text-base leading-none drop-shadow"
        aria-hidden
      >
        {locked ? "🔒" : r.medal}
      </span>
    </div>
  );
});
