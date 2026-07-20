// Normalize progression events into CelebrationEvent descriptors that drive the
// celebration UI. Like the rest of the app, the queue is DERIVED: it diffs
// current history-derived progress against persisted seen-markers — no event
// objects stored, only markers. baselineProgressSeen prevents re-celebrating
// existing history on first run.

import type { AchievementDef, AppData, ProgressSeen, Rarity } from "./types";
import { ACHIEVEMENTS, RARITY_LABEL, RARITY_ORDER } from "./achievements";
import { RARITY_STYLE } from "./rarity";
import { RARITY_XP } from "./xp";
import { RANK_STYLE } from "./ranks";
import {
  RARITY_COINS,
  SHOP_ITEMS,
  frozenSet,
  levelUpCoinsBetween,
  streakMilestoneReward,
} from "./economy";
import { habitStreaks } from "./stats";
import { summarizeProgress } from "./progress";

type CelebrationKind =
  | "achievement"
  | "levelup"
  | "title"
  | "shop"
  | "streak"
  | "tier";

// Per-habit streak milestones that earn a celebration. Includes the same
// thresholds as streak achievements so progression always feels recognized.
const STREAK_MILESTONES = [7, 14, 30, 50, 100, 365] as const;

// Highest milestone <= streak (0 if none reached yet).
export function streakTier(streak: number): number {
  let tier = 0;
  for (const m of STREAK_MILESTONES) if (streak >= m) tier = m;
  return tier;
}

// One normalized celebration. The kind-specific payload fields (achievementId,
// level, titleName, shopId, habitId, tier) are what `acknowledgeCelebration`
// advances in progressSeen.
export interface CelebrationEvent {
  key: string; // stable render/de-dupe key
  kind: CelebrationKind;
  eyebrow: string; // small label above the headline
  name: string; // headline
  description: string;
  accent: string;
  glow: string;
  reward?: string; // "+75 XP", "Lv 7", "🔥 30 days", "150 🪙"…
  badgeDef?: AchievementDef; // achievement → render an AchievementBadge
  emoji?: string; // other kinds → an emoji glyph
  confetti?: boolean; // legendary achievement gets the confetti burst
  // acknowledge payload:
  achievementId?: string;
  level?: number;
  titleName?: string;
  shopId?: string;
  habitId?: string;
  tier?: number;
}

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

// Rarity tier unlock — emoji, accent, and description for each tier milestone.
const TIER_INFO: Record<
  string,
  { emoji: string; accent: string; glow: string; description: string }
> = {
  common: {
    emoji: "🥉",
    accent: "#a98256",
    glow: "rgba(169,130,86,0.45)",
    description:
      "You unlocked your first Common achievement. Every journey starts somewhere!",
  },
  rare: {
    emoji: "🥈",
    accent: "#7d93b0",
    glow: "rgba(125,147,176,0.5)",
    description:
      "You unlocked your first Rare achievement. Your dedication is growing!",
  },
  epic: {
    emoji: "🥇",
    accent: "#f0b429",
    glow: "rgba(240,180,41,0.55)",
    description:
      "You unlocked your first Epic achievement. A significant milestone!",
  },
  legendary: {
    emoji: "💎",
    accent: "#22d3ee",
    glow: "rgba(34,211,238,0.6)",
    description:
      "You unlocked your first Legendary achievement. Truly legendary!",
  },
};

// Color cues for the non-achievement kinds (lib stays framework-free, so these
// are literal colors, mirroring rarity.ts/ranks.ts).
const LEVEL_ACCENT = "#f59e0b";
const LEVEL_GLOW = "rgba(245,158,11,0.5)";
const STREAK_ACCENT = "#f97316";
const STREAK_GLOW = "rgba(249,115,42,0.5)";

// Achievement celebrations come from the unseen unlock records (the existing
// mechanism), most prestigious first.
export function achievementEvents(data: AppData): CelebrationEvent[] {
  const out: { ev: CelebrationEvent; def: AchievementDef }[] = [];
  for (const [id, rec] of Object.entries(data.unlocks)) {
    if (rec.seen) continue;
    const def = BY_ID.get(id);
    if (!def) continue;
    const r = RARITY_STYLE[def.rarity];
    out.push({
      def,
      ev: {
        key: `achievement:${id}`,
        kind: "achievement",
        eyebrow: `${RARITY_LABEL[def.rarity]} Achievement`,
        name: def.name,
        description: def.description,
        accent: r.accent,
        glow: r.glow,
        reward: `+${RARITY_XP[def.rarity]} XP · +${RARITY_COINS[def.rarity]} 🪙`,
        badgeDef: def,
        confetti: def.rarity === "legendary",
        achievementId: id,
      },
    });
  }
  out.sort((a, b) => RARITY_ORDER[b.def.rarity] - RARITY_ORDER[a.def.rarity]);
  return out.map((o) => o.ev);
}

// Level / title / shop / streak celebrations: diff current derived progress vs
// the persisted seen-markers.
export function progressEvents(data: AppData, today: Date): CelebrationEvent[] {
  const seen = data.progressSeen;
  const summary = summarizeProgress(data, today);
  const out: CelebrationEvent[] = [];

  // Level up — one event for the current (highest) level.
  if (summary.level.level > seen.level) {
    const coins = levelUpCoinsBetween(seen.level, summary.level.level);
    out.push({
      key: `level:${summary.level.level}`,
      kind: "levelup",
      eyebrow: "Level Up",
      name: `Level ${summary.level.level}`,
      description: "Your XP just pushed you to a new level.",
      accent: LEVEL_ACCENT,
      glow: LEVEL_GLOW,
      reward:
        coins > 0
          ? `Lv ${summary.level.level} · +${coins} 🪙`
          : `Lv ${summary.level.level}`,
      emoji: "⭐",
      level: summary.level.level,
    });
  }

  // New title.
  const title = summary.title.current;
  if (title.name !== seen.title) {
    const rank = RANK_STYLE[title.rank];
    out.push({
      key: `title:${title.name}`,
      kind: "title",
      eyebrow: "New Title",
      name: title.name,
      description: `You earned the ${title.rank} title.`,
      accent: rank.accent,
      glow: rank.glow,
      reward: title.rank,
      emoji: rank.icon,
      titleName: title.name,
    });
  }

  // Shop unlocks — level-gated items whose level requirement just became met.
  for (const item of SHOP_ITEMS) {
    if (!item.minLevel) continue;
    if (summary.level.level < item.minLevel) continue;
    if (seen.shop.includes(item.id)) continue;
    out.push({
      key: `shop:${item.id}`,
      kind: "shop",
      eyebrow: "Shop Unlocked",
      name: item.name,
      description: `Reached level ${item.minLevel} — now available in the shop.`,
      accent: item.preview,
      glow: `${item.preview}99`,
      reward: `${item.price} 🪙`,
      emoji: "🛍️",
      shopId: item.id,
    });
  }

  // Per-habit streak milestones.
  const frozen = frozenSet(data.economy);
  for (const h of data.habits) {
    if (h.archived) continue;
    const current = habitStreaks(h, data.marks, today, frozen).current;
    const tier = streakTier(current);
    if (tier > (seen.streaks[h.id] ?? 0)) {
      const coins = streakMilestoneReward(tier);
      out.push({
        key: `streak:${h.id}:${tier}`,
        kind: "streak",
        eyebrow: "Streak",
        name: `${tier}-day streak`,
        description: h.name,
        accent: STREAK_ACCENT,
        glow: STREAK_GLOW,
        reward: coins > 0 ? `🔥 ${tier} · +${coins} 🪙` : `🔥 ${tier}`,
        emoji: "🔥",
        habitId: h.id,
        tier,
      });
    }
  }

  return out;
}

// Tier unlock events: detect when the user has unlocked their first achievement
// of each rarity tier. Compared against the persisted seen-tierUnlocks.
function tierUnlockEvents(data: AppData): CelebrationEvent[] {
  const seen = data.progressSeen.tierUnlocks;
  const seenSet = new Set(seen);
  const out: CelebrationEvent[] = [];

  // Which rarity tiers does the user currently have at least one unlock for?
  const tiers: Rarity[] = ["common", "rare", "epic", "legendary"];
  // Collect all unlocked rarities
  const unlockedRarities = new Set<Rarity>();
  for (const id of Object.keys(data.unlocks)) {
    const def = BY_ID.get(id);
    if (def) unlockedRarities.add(def.rarity);
  }

  for (const rarity of tiers) {
    if (!unlockedRarities.has(rarity)) continue;
    if (seenSet.has(rarity)) continue;
    const info = TIER_INFO[rarity];
    // Count how many achievements of this tier are unlocked
    const count = Object.keys(data.unlocks).filter((id) => {
      const def = BY_ID.get(id);
      return def?.rarity === rarity;
    }).length;
    out.push({
      key: `tier:${rarity}`,
      kind: "tier",
      eyebrow: "Tier Unlocked",
      name: `First ${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Achievement`,
      description: info.description,
      accent: info.accent,
      glow: info.glow,
      reward: `${count} ${rarity} · ${info.emoji}`,
      emoji: info.emoji,
      confetti: rarity === "legendary",
      tier: RARITY_ORDER[rarity],
    });
  }

  // Insert tier unlocks right after achievements, sorted by rarity order
  // so the most prestigious tier fires last
  out.sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0));
  return out;
}

// The full ordered queue: achievements (by rarity) first, then tier unlocks,
// then level, title, shop, streaks.
export function buildCelebrationQueue(
  data: AppData,
  today: Date,
): CelebrationEvent[] {
  return [
    ...achievementEvents(data),
    ...tierUnlockEvents(data),
    ...progressEvents(data, today),
  ];
}

// Current progress as a fully-"seen" baseline — written once so an existing
// history doesn't re-fire celebrations on first run.
export function baselineProgressSeen(data: AppData, today: Date): ProgressSeen {
  const summary = summarizeProgress(data, today);
  const shop = SHOP_ITEMS.filter(
    (i) => i.minLevel != null && summary.level.level >= i.minLevel,
  ).map((i) => i.id);

  const frozen = frozenSet(data.economy);
  const streaks: Record<string, number> = {};
  for (const h of data.habits) {
    if (h.archived) continue;
    const tier = streakTier(habitStreaks(h, data.marks, today, frozen).current);
    if (tier > 0) streaks[h.id] = tier;
  }

  // Record already-unlocked rarity tiers so they don't re-fire.
  const tierUnlocks: string[] = [];
  const tiers: Rarity[] = ["common", "rare", "epic", "legendary"];
  for (const rarity of tiers) {
    const hasUnlock = Object.keys(data.unlocks).some((id) => {
      const def = BY_ID.get(id);
      return def?.rarity === rarity;
    });
    if (hasUnlock) tierUnlocks.push(rarity);
  }

  return {
    seeded: true,
    level: summary.level.level,
    title: summary.title.current.name,
    shop,
    streaks,
    tierUnlocks,
  };
}
