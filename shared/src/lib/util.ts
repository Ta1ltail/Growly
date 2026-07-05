// Shared utility helpers. Kept small and framework-free so any module can
// import them without circular-dependency risk.

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge class names with Tailwind conflict resolution.
export function cn(...inputs: Parameters<typeof clsx>): string {
  return twMerge(clsx(inputs));
}

// Generate a unique ID. Uses crypto.randomUUID when available (modern browsers)
// with a fallback for older environments and SSR.
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

// Shared tone classes for insight/alert cards across dashboard and stats.
export const TONE: Record<string, string> = {
  good: "border-done/30 bg-done/5 text-done",
  info: "border-accent/30 bg-accent/5 text-accent",
  warn: "border-amber-500/30 bg-amber-500/5 text-amber-500",
};
