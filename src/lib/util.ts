import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Parameters<typeof clsx>): string {
  return twMerge(clsx(inputs));
}

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
