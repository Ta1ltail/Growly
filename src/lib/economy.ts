// Coin economy — earnings are DERIVED from the immutable history (mirrors XP in
// xp.ts), so they can never be granted or inflated. The store persists only an
// append-only spend ledger + owned/equipped cosmetics + a freeze log; the
// spendable balance is the difference:
//
//   balance = coinsEarned(history) − Σ ledger.amount
//
// This is the anti-cheat-safe way to add a spendable currency on top of the
// Honest Tracking model: you can spend what the record proves you earned, and
// nothing more.

import type {
  CosmeticSlot,
  DailyQuest,
  Economy,
  FreezeEntry,
  Marks,
  MarkStatus,
  Rarity,
} from "./types";
import type { GameStats } from "./achievements";
import { dateKey, addDays, startOfDay } from "./date";
import type { Category } from "./categories";

/* ---------------- earning ---------------- */

export const COINS_PER_COMPLETION = 2;
export const COINS_PER_PERFECT_DAY = 10;

/* ---------------- engagement rewards ---------------- */

// Level-up bonus: coins granted each time the user levels up.
const LEVEL_UP_COINS = [
  0, // level 1 (starting, no bonus)
  5, // level 2
  10, // level 3
  15, // level 4
  25, // level 5
  35, // level 6
  50, // level 7
  65, // level 8
  85, // level 9
  100, // level 10
];
// For levels beyond 10: 100 + (level - 10) * 25
function levelUpBonus(level: number): number {
  if (level <= 1) return 0;
  if (level <= LEVEL_UP_COINS.length) return LEVEL_UP_COINS[level - 1];
  return 100 + (level - 10) * 25;
}

// Total level-up coins for advancing from `fromLevel` to `toLevel` — sums every
// level crossed, so jumping several levels in one go still pays out in full.
export function levelUpCoinsBetween(
  fromLevel: number,
  toLevel: number,
): number {
  let total = 0;
  for (let lvl = fromLevel + 1; lvl <= toLevel; lvl++)
    total += levelUpBonus(lvl);
  return total;
}

// Streak milestone rewards: one-time bonus coins for reaching a per-habit streak
// milestone. Keyed to the celebration tiers in celebrations.ts (streakTier); an
// unknown tier pays 0 so the two lists can never silently double-grant.
const STREAK_MILESTONE_REWARDS: Record<number, number> = {
  7: 25,
  14: 50,
  30: 100,
  50: 200,
  100: 400,
  365: 1000,
};
export function streakMilestoneReward(tier: number): number {
  return STREAK_MILESTONE_REWARDS[tier] ?? 0;
}

// Daily check-in bonus: scales with streak.
export function checkInReward(streak: number): number {
  if (streak < 2) return 3; // first check-in
  if (streak < 5) return 5;
  if (streak < 10) return 8;
  if (streak < 21) return 12;
  if (streak < 30) return 18;
  if (streak < 60) return 25;
  if (streak < 100) return 35;
  return 50; // 100+ day check-in streak
}

// Daily quest reward.
const QUEST_REWARD_MIN = 15;
const QUEST_REWARD_MAX = 40;

// Daily spin possible rewards.
const SPIN_REWARDS = [
  { weight: 20, label: "10 coins", amount: 10 },
  { weight: 20, label: "15 coins", amount: 15 },
  { weight: 18, label: "20 coins", amount: 20 },
  { weight: 15, label: "30 coins", amount: 30 },
  { weight: 10, label: "50 coins", amount: 50 },
  { weight: 8, label: "75 coins", amount: 75 },
  { weight: 5, label: "100 coins", amount: 100 },
  { weight: 3, label: "Streak Freeze", amount: 0, item: "freeze" },
  { weight: 1, label: "200 coins", amount: 200 },
];
export interface SpinReward {
  weight: number;
  label: string;
  amount: number;
  item?: string;
}

// Pick a random reward weighted by probability.
export function randomSpinReward(): SpinReward {
  const totalWeight = SPIN_REWARDS.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const reward of SPIN_REWARDS) {
    roll -= reward.weight;
    if (roll <= 0) return reward;
  }
  return SPIN_REWARDS[0];
}

// Generate a random daily quest based on the user's habits. Expects unarchived
// habits — the caller (store.refreshDailyQuest) passes the full list from AppData.
export function generateDailyQuest(
  habits: { id: string; category: Category; archived?: boolean }[],
): DailyQuest | null {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) return null;

  const questTypes = [
    () => {
      // Complete X habits today
      const count = Math.max(
        3,
        Math.min(active.length, Math.floor(active.length * 0.6) + 1),
      );
      return {
        description: `Complete ${count} habits today`,
        target: count,
        reward: QUEST_REWARD_MIN + count * 3,
      };
    },
    () => {
      // Perfect day (all habits done)
      return {
        description: "Complete every scheduled habit today",
        target: 1,
        reward: QUEST_REWARD_MAX,
      };
    },
    () => {
      // Focus on a specific category
      const categories = [...new Set(active.map((h) => h.category))];
      if (categories.length === 0) return null;
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const catHabits = active.filter((h) => h.category === cat);
      const count = Math.max(
        1,
        Math.min(catHabits.length, Math.ceil(catHabits.length / 2)),
      );
      return {
        description: `Complete ${count} ${cat} habits`,
        target: count,
        reward: QUEST_REWARD_MIN + count * 4,
        category: cat,
      };
    },
  ];

  const pick = questTypes[Math.floor(Math.random() * questTypes.length)]();
  if (!pick) return generateDailyQuest(habits); // retry
  return {
    ...pick,
    current: 0,
  };
}

// Bonus coins minted the first time an achievement is unlocked, by rarity.
export const RARITY_COINS: Record<Rarity, number> = {
  common: 10,
  rare: 30,
  epic: 80,
  legendary: 200,
};

// Total lifetime coins EARNED from history-derived stats + unlocked
// achievements + engagement bonuses. Pure history-derived base + stored bonuses.
export function coinsEarned(
  stats: GameStats,
  unlockedRarities: Rarity[],
  economy?: Economy,
): number {
  const base = stats.doneCount * COINS_PER_COMPLETION;
  const perfect = stats.perfectDays * COINS_PER_PERFECT_DAY;
  const fromAchievements = unlockedRarities.reduce(
    (sum, r) => sum + RARITY_COINS[r],
    0,
  );
  const fromBonuses = economy?.bonusCoins ?? 0;
  return base + perfect + fromAchievements + fromBonuses;
}

// Coins already committed via the spend ledger.
export function coinsSpent(economy: Economy): number {
  return economy.spent.reduce((sum, e) => sum + Math.max(0, e.amount), 0);
}

// Spendable balance — clamped at 0 so a corrupted ledger can never go negative.
export function coinBalance(earned: number, economy: Economy): number {
  return Math.max(0, earned - coinsSpent(economy));
}

// Itemized derivation of the balance, for the "where do coins come from" UI.
// Same math as coinsEarned/coinBalance, just kept broken out by source.
export interface CoinBreakdown {
  completions: number; // # of completions
  perfectDays: number; // # of perfect days
  fromCompletions: number;
  fromPerfectDays: number;
  fromAchievements: number;
  fromBonuses: number; // check-ins, quests, spins, level-ups, streak milestones
  earned: number;
  spent: number;
  balance: number;
}

export function coinBreakdown(
  stats: GameStats,
  unlockedRarities: Rarity[],
  economy: Economy,
): CoinBreakdown {
  const fromCompletions = stats.doneCount * COINS_PER_COMPLETION;
  const fromPerfectDays = stats.perfectDays * COINS_PER_PERFECT_DAY;
  const fromAchievements = unlockedRarities.reduce(
    (sum, r) => sum + RARITY_COINS[r],
    0,
  );
  const fromBonuses = economy.bonusCoins ?? 0;
  const earned =
    fromCompletions + fromPerfectDays + fromAchievements + fromBonuses;
  const spent = coinsSpent(economy);
  return {
    completions: stats.doneCount,
    perfectDays: stats.perfectDays,
    fromCompletions,
    fromPerfectDays,
    fromAchievements,
    fromBonuses,
    earned,
    spent,
    balance: Math.max(0, earned - spent),
  };
}

/* ---------------- catalog ---------------- */

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  slot: CosmeticSlot;
  price: number;
  // Optional minimum level before the item can be purchased (prestige gating).
  minLevel?: number;
  preview: string; // a color / emoji used to render a swatch in the shop
}

// Cosmetic flame color ramps keyed by item id (consumed by StreakFlame).
export const FLAME_SKINS: Record<
  string,
  { small: string; medium: string; large: string }
> = {
  // Default ships free and is always "owned" implicitly.
  "flame-default": { small: "#fb923c", medium: "#f97316", large: "#ef4444" },
  "flame-azure": { small: "#38bdf8", medium: "#3b82f6", large: "#6366f1" },
  "flame-emerald": { small: "#34d399", medium: "#10b981", large: "#059669" },
  "flame-violet": { small: "#c084fc", medium: "#a855f7", large: "#7c3aed" },
  "flame-gold": { small: "#fde047", medium: "#facc15", large: "#f59e0b" },
  "flame-ice": { small: "#99f6e4", medium: "#5eead4", large: "#2dd4bf" },
  "flame-lava": { small: "#fca5a5", medium: "#f87171", large: "#dc2626" },
  "flame-rainbow": { small: "#f472b6", medium: "#a78bfa", large: "#60a5fa" },
  "flame-solar": { small: "#fde68a", medium: "#fbbf24", large: "#f59e0b" },
};

// Confetti palettes keyed by item id (consumed by Confetti / celebrations).
export const CONFETTI_SKINS: Record<string, string[]> = {
  "confetti-default": ["#4b8bf7", "#7c3aed", "#22d3ee", "#f59e0b", "#f43f5e"],
  "confetti-mono": ["#e2e8f0", "#94a3b8", "#cbd5e1", "#f8fafc"],
  "confetti-neon": ["#22d3ee", "#a3e635", "#f472b6", "#fb923c"],
  "confetti-fire": ["#fde047", "#fb923c", "#f43f5e", "#ef4444"],
  "confetti-pastel": ["#fbcfe8", "#c4b5fd", "#a7f3d0", "#fde68a", "#bfdbfe"],
  "confetti-gold": ["#fef08a", "#fde047", "#facc15", "#eab308", "#ca8a04"],
  "confetti-ocean": ["#99f6e4", "#67e8f9", "#22d3ee", "#06b6d4", "#0891b2"],
};

// App-wide accent themes keyed by item id (override --c-accent/--c-accent-glow).
// There is intentionally NO "accent-default" entry: the default clears the
// override so the per-theme (light/dark) accent from globals.css applies.
const ACCENT_SKINS: Record<string, { accent: string; glow: string }> = {
  "accent-crimson": { accent: "#f43f5e", glow: "#fb7185" },
  "accent-emerald": { accent: "#10b981", glow: "#34d399" },
  "accent-violet": { accent: "#8b5cf6", glow: "#a78bfa" },
  "accent-amber": { accent: "#f59e0b", glow: "#fbbf24" },
  "accent-pink": { accent: "#ec4899", glow: "#f472b6" },
  "accent-ocean": { accent: "#06b6d4", glow: "#22d3ee" },
  "accent-lime": { accent: "#84cc16", glow: "#a3e635" },
};

export const SHOP_ITEMS: ShopItem[] = [
  // ---- Flame skins ----
  {
    id: "flame-azure",
    name: "Azure Flame",
    description: "A cool blue streak flame.",
    slot: "flame",
    price: 120,
    preview: "#3b82f6",
  },
  {
    id: "flame-emerald",
    name: "Emerald Flame",
    description: "A verdant green streak flame.",
    slot: "flame",
    price: 120,
    preview: "#10b981",
  },
  {
    id: "flame-violet",
    name: "Violet Flame",
    description: "A mystic purple streak flame.",
    slot: "flame",
    price: 200,
    preview: "#a855f7",
  },
  {
    id: "flame-gold",
    name: "Golden Flame",
    description: "A radiant gold flame for the dedicated.",
    slot: "flame",
    price: 400,
    minLevel: 10,
    preview: "#facc15",
  },
  {
    id: "flame-ice",
    name: "Ice Flame",
    description: "A frosty blue-cyan streak flame.",
    slot: "flame",
    price: 180,
    preview: "#5eead4",
  },
  {
    id: "flame-lava",
    name: "Lava Flame",
    description: "A blazing red-hot streak flame.",
    slot: "flame",
    price: 250,
    minLevel: 6,
    preview: "#f87171",
  },
  {
    id: "flame-rainbow",
    name: "Rainbow Flame",
    description: "A prismatic, color-shifting flame.",
    slot: "flame",
    price: 500,
    minLevel: 15,
    preview: "#a78bfa",
  },
  {
    id: "flame-solar",
    name: "Solar Flame",
    description: "A brilliant golden-white streak flame.",
    slot: "flame",
    price: 350,
    minLevel: 12,
    preview: "#fbbf24",
  },
  // ---- Confetti palettes ----
  {
    id: "confetti-mono",
    name: "Monochrome Confetti",
    description: "Clean, minimal celebration.",
    slot: "confetti",
    price: 100,
    preview: "#cbd5e1",
  },
  {
    id: "confetti-neon",
    name: "Neon Confetti",
    description: "Loud, electric celebration.",
    slot: "confetti",
    price: 150,
    preview: "#22d3ee",
  },
  {
    id: "confetti-fire",
    name: "Firework Confetti",
    description: "Warm sparks on every unlock.",
    slot: "confetti",
    price: 250,
    minLevel: 5,
    preview: "#fb923c",
  },
  {
    id: "confetti-pastel",
    name: "Pastel Confetti",
    description: "Soft, dreamy celebration colors.",
    slot: "confetti",
    price: 120,
    preview: "#fbcfe8",
  },
  {
    id: "confetti-gold",
    name: "Gold Confetti",
    description: "Luxurious golden shower.",
    slot: "confetti",
    price: 300,
    minLevel: 8,
    preview: "#fde047",
  },
  {
    id: "confetti-ocean",
    name: "Ocean Confetti",
    description: "Deep blue-teal celebration.",
    slot: "confetti",
    price: 200,
    preview: "#22d3ee",
  },
  // ---- Accent themes (recolor the whole app's accent) ----
  {
    id: "accent-crimson",
    name: "Crimson Accent",
    description: "Recolor the app in bold crimson.",
    slot: "accent",
    price: 150,
    preview: "#f43f5e",
  },
  {
    id: "accent-emerald",
    name: "Emerald Accent",
    description: "Recolor the app in fresh emerald.",
    slot: "accent",
    price: 150,
    preview: "#10b981",
  },
  {
    id: "accent-violet",
    name: "Violet Accent",
    description: "Recolor the app in deep violet.",
    slot: "accent",
    price: 200,
    preview: "#8b5cf6",
  },
  {
    id: "accent-amber",
    name: "Amber Accent",
    description: "Recolor the app in warm amber.",
    slot: "accent",
    price: 300,
    minLevel: 8,
    preview: "#f59e0b",
  },
  {
    id: "accent-pink",
    name: "Pink Accent",
    description: "Recolor the app in vibrant pink.",
    slot: "accent",
    price: 180,
    preview: "#ec4899",
  },
  {
    id: "accent-ocean",
    name: "Ocean Accent",
    description: "Recolor the app in deep teal.",
    slot: "accent",
    price: 220,
    preview: "#06b6d4",
  },
  {
    id: "accent-lime",
    name: "Lime Accent",
    description: "Recolor the app in fresh lime.",
    slot: "accent",
    price: 280,
    minLevel: 6,
    preview: "#84cc16",
  },
];

// Resolve the equipped accent override, or null when the default (themed) accent
// should apply.
export function equippedAccent(
  economy: Economy,
): { accent: string; glow: string } | null {
  return ACCENT_SKINS[equippedOrDefault(economy, "accent")] ?? null;
}

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

// The currently-equipped item id for a slot, falling back to the free default.
export function equippedOrDefault(
  economy: Economy,
  slot: CosmeticSlot,
): string {
  return economy.equipped[slot] ?? `${slot}-default`;
}

/* ---------------- freezes (anti-cheat-limited consumable) ---------------- */

export const FREEZE_PRICE = 75;
export const FREEZE_WINDOW_DAYS = 7; // rolling window for the usage cap
export const FREEZE_MAX_PER_WINDOW = 1; // at most one freeze per window

// Set of "habitId@dateKey" strings that are currently freeze-protected, for the
// streak walk to treat as neutral. O(1) lookup.
export function frozenSet(economy: Economy): Set<string> {
  return new Set(economy.freezes.map((f) => `${f.habitId}@${f.date}`));
}

export function isFrozen(
  frozen: Set<string>,
  habitId: string,
  key: string,
): boolean {
  return frozen.has(`${habitId}@${key}`);
}

// How many freezes were used within the rolling window ending at `now`.
export function freezesUsedInWindow(economy: Economy, now: Date): number {
  const cutoff = startOfDay(addDays(now, -FREEZE_WINDOW_DAYS)).getTime();
  return economy.freezes.filter((f) => {
    const ts = new Date(f.at).getTime();
    return Number.isFinite(ts) && ts >= cutoff;
  }).length;
}

export function canUseFreeze(economy: Economy, now: Date): boolean {
  return freezesUsedInWindow(economy, now) < FREEZE_MAX_PER_WINDOW;
}

// A freeze may only protect a day that is a GENUINE recorded miss (status
// "missed") and isn't already frozen — you can't freeze a day you didn't miss,
// so history stays honest.
export function canFreezeDay(
  economy: Economy,
  marks: Marks,
  habitId: string,
  key: string,
): boolean {
  const status: MarkStatus | undefined = marks[key]?.[habitId];
  if (status !== "missed") return false;
  return !isFrozen(frozenSet(economy), habitId, key);
}

export function makeFreezeEntry(
  habitId: string,
  key: string,
  id: string,
  nowIso: string,
): FreezeEntry {
  return { id, at: nowIso, date: key, habitId };
}

// Days within the last `lookback` days that are eligible to be frozen for a
// habit (genuine misses, not already frozen) — used to populate the shop's
// freeze picker. Newest first.
export function freezableDays(
  economy: Economy,
  marks: Marks,
  habitId: string,
  today: Date,
  lookback = 30,
): string[] {
  const frozen = frozenSet(economy);
  const out: string[] = [];
  for (let i = 1; i <= lookback; i++) {
    const key = dateKey(addDays(today, -i));
    if (marks[key]?.[habitId] === "missed" && !isFrozen(frozen, habitId, key))
      out.push(key);
  }
  return out;
}
