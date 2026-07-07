"use client";

// Returns a stable Date for "today" that updates at midnight.
// Uses useState + a timeout to the next midnight so the date never goes stale
// when a tab is left open across midnight.

import { useState, useEffect } from "react";

export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
      now.getTime();
    // Guard against near-zero ms values — if midnight is < 1s away, add 1s
    const safeMs = Math.max(msToMidnight, 1000);
    const timer = setTimeout(() => {
      setToday(new Date());
    }, safeMs);
    return () => clearTimeout(timer);
    // Depend on `today` so each rollover reschedules the next midnight timer —
    // otherwise a tab left open past two midnights would keep showing day 1.
  }, [today]);

  return today;
}
