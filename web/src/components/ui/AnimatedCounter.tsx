"use client";

// Counts up to `value` with an eased ramp whenever it changes (spec §4
// micro-interactions / animated counters). Renders the final value on the
// server and first client paint to avoid hydration mismatch, then animates
// subsequent changes. Respects prefers-reduced-motion (snaps instantly).

import { useEffect, useRef, useState } from "react";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function AnimatedCounter({
  value,
  duration = 600,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const span = reduced ? 0 : duration;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const t = span === 0 ? 1 : Math.min((now - startRef.current) / span, 1);
      setDisplay(Math.round(from + (value - from) * easeOut(t)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
        startRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
      fromRef.current = value;
    };
  }, [value, duration]);

  return <span className={`tabular-nums ${className}`}>{display}</span>;
}
