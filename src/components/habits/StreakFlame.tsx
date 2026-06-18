// Animated streak flame that evolves with streak length (spec §3):
//   • Small  (1–6 days)   — light flicker, no glow.
//   • Medium (7–29 days)  — stronger flicker + breathing glow halo.
//   • Large  (30+ days)   — fast flicker, dynamic glow, rising ember particles.
// Pure CSS animation (keyframes in globals.css) so it's GPU-cheap and the
// global prefers-reduced-motion rule neutralizes it automatically.
//
// The per-tier color ramp is the equipped "flame" cosmetic (shop §15), resolved
// from the store. The free default ramp equals the original hardcoded colors,
// so users who own no skin see no change (and SSR/first paint is unaffected
// because the server snapshot has an empty economy → the default ramp).

"use client";

import { memo, useMemo } from "react";
import { Flame } from "lucide-react";
import { useAppDataSelector } from "@/lib/store";
import { equippedOrDefault, FLAME_SKINS } from "@/lib/economy";

export type FlameTier = "none" | "small" | "medium" | "large";
export type FlameColors = Record<Exclude<FlameTier, "none">, string>;

export function flameTier(streak: number): FlameTier {
  if (streak <= 0) return "none";
  if (streak < 7) return "small";
  if (streak < 30) return "medium";
  return "large";
}

const DEFAULT_FLAME_COLORS: FlameColors = FLAME_SKINS["flame-default"];

export const StreakFlame = memo(function StreakFlame({
  streak,
  size = 16,
  showCount = true,
  className = "",
  colors,
}: {
  streak: number;
  size?: number;
  showCount?: boolean;
  className?: string;
  // Optional override; when omitted the equipped flame skin is used.
  colors?: FlameColors;
}) {
  const equippedFlame = useAppDataSelector((d) => equippedOrDefault(d.economy, "flame"));
  const tier = flameTier(streak);

  const ramp = useMemo(
    () => colors ?? FLAME_SKINS[equippedFlame] ?? DEFAULT_FLAME_COLORS,
    [colors, equippedFlame],
  );
  if (tier === "none") return null;

  const color = ramp[tier];
  const flickerClass =
    tier === "large" ? "animate-flicker-fast" : tier === "medium" ? "animate-flicker-medium" : "animate-flicker";

  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-label={`${streak} day streak`}>
      <span className="relative inline-flex" style={{ width: size, height: size }}>
        {/* breathing glow halo (medium + large) */}
        {tier !== "small" && (
          <span
            aria-hidden
            className="animate-glow-pulse pointer-events-none absolute inset-0 rounded-full blur-md"
            style={{ background: color, transformOrigin: "center bottom" }}
          />
        )}
        {/* rising embers (large only) */}
        {tier === "large" && (
          <>
            <Ember color={color} delay="0s" offset="-3px" />
            <Ember color={color} delay="0.6s" offset="3px" />
            <Ember color={color} delay="1.1s" offset="0px" />
          </>
        )}
        <Flame
          className={`relative ${flickerClass}`}
          style={{ width: size, height: size, color, transformOrigin: "center bottom" }}
          fill={tier === "large" ? color : "none"}
          strokeWidth={tier === "large" ? 1.5 : 2}
        />
      </span>
      {showCount && (
        <span className="font-mono text-xs font-semibold tabular-nums" style={{ color }}>
          {streak}
        </span>
      )}
    </span>
  );
});

function Ember({ color, delay, offset }: { color: string; delay: string; offset: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-1 left-1/2 size-1 rounded-full"
      style={{
        background: color,
        marginLeft: offset,
        animation: "ember 1.6s ease-out infinite",
        animationDelay: delay,
      }}
    />
  );
}
