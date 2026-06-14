// Theme configuration: light/dark/system mode + a customizable accent color.

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeSettings {
  mode: ThemeMode;
  accent: string; // one of ACCENTS[].id
}

export const DEFAULT_THEME: ThemeSettings = { mode: "dark", accent: "blue" };

export interface Accent {
  id: string;
  label: string;
  // base 500 shade + a lighter 400 for hovers/glows
  color: string;
  glow: string;
}

export const ACCENTS: Accent[] = [
  { id: "blue", label: "Electric", color: "#3b82f6", glow: "#60a5fa" },
  { id: "violet", label: "Violet", color: "#8b5cf6", glow: "#a78bfa" },
  { id: "cyan", label: "Cyan", color: "#06b6d4", glow: "#22d3ee" },
  { id: "emerald", label: "Emerald", color: "#10b981", glow: "#34d399" },
  { id: "rose", label: "Rose", color: "#f43f5e", glow: "#fb7185" },
  { id: "amber", label: "Amber", color: "#f59e0b", glow: "#fbbf24" },
];

export function accentById(id: string): Accent {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

// Resolve "system" to a concrete light/dark using the OS preference.
export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
