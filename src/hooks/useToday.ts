"use client";

// Returns a single stable Date for "today" for the lifetime of the component,
// so date math does not recompute a new Date on every render.

import { useState } from "react";

export function useToday(): Date {
  const [today] = useState(() => new Date());
  return today;
}
