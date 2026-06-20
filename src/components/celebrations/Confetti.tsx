"use client";

// Dependency-free confetti burst for major (legendary) celebrations.
// Pieces are positioned/animated purely with CSS (keyframe `confetti-fall`);
// no per-frame JS. A deterministic PRNG keeps SSR and the first client render
// identical (avoids hydration mismatch and the banned Math.random). Renders
// nothing when the user prefers reduced motion.

import { useMemo } from "react";

// Tiny seeded PRNG (mulberry32) — deterministic per seed.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function usePrefersReducedMotion(): boolean {
  return useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
}

export function Confetti({
  colors,
  count = 80,
  seed = 1,
}: {
  colors: string[];
  count?: number;
  seed?: number;
}) {
  const reduced = usePrefersReducedMotion();

  const pieces = useMemo(() => {
    const rand = mulberry32(seed * 2654435761);
    return Array.from({ length: count }, (_, i) => {
      const left = rand() * 100; // vw start
      const drift = (rand() - 0.5) * 40; // vw horizontal drift
      const delay = rand() * 0.6; // s
      const duration = 2.2 + rand() * 1.6; // s
      const rotate = 360 + Math.round(rand() * 720); // deg
      const size = 6 + Math.round(rand() * 6); // px
      const color = colors[i % colors.length];
      const round = rand() > 0.5;
      return { left, drift, delay, duration, rotate, size, color, round, i };
    });
  }, [colors, count, seed]);

  if (reduced) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      {pieces.map((p) => (
        <span
          key={p.i}
          className="absolute top-0 animate-[confetti-fall_linear_forwards]"
          style={{
            left: `${p.left}vw`,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            borderRadius: p.round ? "9999px" : "1px",
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            // consumed by the confetti-fall keyframe
            ["--cx" as string]: `${p.drift}vw`,
            ["--cr" as string]: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
