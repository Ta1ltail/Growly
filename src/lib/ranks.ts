// Visual styling per rank (spec §7/§9 "Profile Visual Upgrades"). Drives
// rank-based avatar borders, the animated title chip, and prestige cues so
// higher-ranked users feel visually distinct. Kept UI-only and separate from
// the title logic in titles.ts (which stays pure), mirroring rarity.ts.

import type { Rank } from "./titles";

export interface RankStyle {
  label: Rank;
  icon: string; // emoji crest shown beside the title
  accent: string; // primary color
  glow: string; // rgba glow used for avatar borders / shadows
  gradient: string; // border / chip gradient
  animated: boolean; // legendary gets the shimmering title treatment
}

export const RANK_STYLE: Record<Rank, RankStyle> = {
  Beginner: {
    label: "Beginner",
    icon: "🌱",
    accent: "#94a3b8",
    glow: "rgba(148,163,184,0.45)",
    gradient: "linear-gradient(135deg,#cbd5e1,#64748b)",
    animated: false,
  },
  Intermediate: {
    label: "Intermediate",
    icon: "⚔️",
    accent: "#34d399",
    glow: "rgba(52,211,153,0.5)",
    gradient: "linear-gradient(135deg,#6ee7b7,#059669)",
    animated: false,
  },
  Advanced: {
    label: "Advanced",
    icon: "🛡️",
    accent: "#60a5fa",
    glow: "rgba(96,165,250,0.55)",
    gradient: "linear-gradient(135deg,#93c5fd,#2563eb)",
    animated: false,
  },
  Expert: {
    label: "Expert",
    icon: "👑",
    accent: "#c084fc",
    glow: "rgba(192,132,252,0.6)",
    gradient: "linear-gradient(135deg,#d8b4fe,#7c3aed)",
    animated: false,
  },
  Legendary: {
    label: "Legendary",
    icon: "🐉",
    accent: "#fbbf24",
    glow: "rgba(251,191,36,0.65)",
    gradient: "linear-gradient(135deg,#fde68a,#f59e0b,#f43f5e)",
    animated: true,
  },
};

// Ascending order — used for "rank up" comparisons / progress.
export const RANK_ORDER: Record<Rank, number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
  Expert: 3,
  Legendary: 4,
};
