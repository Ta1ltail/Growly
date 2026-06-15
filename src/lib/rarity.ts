// Visual styling per rarity, plus the celebration tier each rarity triggers
// (spec §5 "Achievement Unlock Experience"):
//   common          -> toast        (small)
//   rare / epic      -> popup        (medium)
//   legendary        -> full-screen  (major: confetti + particles)
// Kept separate from the achievement engine so pure logic stays UI-free.

import type { Rarity } from "./types";

export type CelebrationTier = "toast" | "popup" | "fullscreen";

export interface RarityStyle {
  label: string;
  medal: string; // spec badge glyph
  tier: CelebrationTier;
  accent: string; // primary color
  glow: string; // glow/shadow color (rgba)
  gradient: string; // CSS gradient for badge backgrounds
  ring: string; // tailwind ring class
  confettiColors: string[];
}

export const RARITY_STYLE: Record<Rarity, RarityStyle> = {
  common: {
    label: "Common",
    medal: "🥉",
    tier: "toast",
    accent: "#a98256",
    glow: "rgba(169,130,86,0.45)",
    gradient: "linear-gradient(135deg,#c79a6a,#8c6239)",
    ring: "ring-amber-700/40",
    confettiColors: ["#c79a6a", "#8c6239", "#e3c19a"],
  },
  rare: {
    label: "Rare",
    medal: "🥈",
    tier: "popup",
    accent: "#7d93b0",
    glow: "rgba(125,147,176,0.5)",
    gradient: "linear-gradient(135deg,#aebed2,#6b7e98)",
    ring: "ring-slate-400/50",
    confettiColors: ["#aebed2", "#6b7e98", "#dbe4ef"],
  },
  epic: {
    label: "Epic",
    medal: "🥇",
    tier: "popup",
    accent: "#f0b429",
    glow: "rgba(240,180,41,0.55)",
    gradient: "linear-gradient(135deg,#ffd24a,#d99211)",
    ring: "ring-amber-400/60",
    confettiColors: ["#ffd24a", "#d99211", "#fff0bf"],
  },
  legendary: {
    label: "Legendary",
    medal: "💎",
    tier: "fullscreen",
    accent: "#22d3ee",
    glow: "rgba(34,211,238,0.6)",
    gradient: "linear-gradient(135deg,#67e8f9,#7c3aed)",
    ring: "ring-cyan-300/70",
    confettiColors: ["#67e8f9", "#7c3aed", "#f0abfc", "#fde047"],
  },
};
