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

import type { Economy, FreezeEntry, Marks, MarkStatus, Rarity } from "./types";
import type { GameStats } from "./achievements";
import { dateKey, addDays, startOfDay } from "./storage";

/* ---------------- earning ---------------- */

export const COINS_PER_COMPLETION = 2;
export const COINS_PER_PERFECT_DAY = 10;

// Bonus coins minted the first time an achievement is unlocked, by rarity.
export const RARITY_COINS: Record<Rarity, number> = {
  common: 10,
  rare: 30,
  epic: 80,
  legendary: 200,
};

// Total lifetime coins EARNED from history-derived stats + unlocked
// achievements. Pure: same inputs always give the same number.
export function coinsEarned(stats: GameStats, unlockedRarities: Rarity[]): number {
  const base = stats.doneCount * COINS_PER_COMPLETION;
  const perfect = stats.perfectDays * COINS_PER_PERFECT_DAY;
  const fromAchievements = unlockedRarities.reduce((sum, r) => sum + RARITY_COINS[r], 0);
  return base + perfect + fromAchievements;
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
  const fromAchievements = unlockedRarities.reduce((sum, r) => sum + RARITY_COINS[r], 0);
  const earned = fromCompletions + fromPerfectDays + fromAchievements;
  const spent = coinsSpent(economy);
  return {
    completions: stats.doneCount,
    perfectDays: stats.perfectDays,
    fromCompletions,
    fromPerfectDays,
    fromAchievements,
    earned,
    spent,
    balance: Math.max(0, earned - spent),
  };
}

/* ---------------- catalog ---------------- */

export type CosmeticSlot = "flame" | "confetti" | "accent";

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
export const FLAME_SKINS: Record<string, { small: string; medium: string; large: string }> = {
  // Default ships free and is always "owned" implicitly.
  "flame-default": { small: "#fb923c", medium: "#f97316", large: "#ef4444" },
  "flame-azure": { small: "#38bdf8", medium: "#3b82f6", large: "#6366f1" },
  "flame-emerald": { small: "#34d399", medium: "#10b981", large: "#059669" },
  "flame-violet": { small: "#c084fc", medium: "#a855f7", large: "#7c3aed" },
  "flame-gold": { small: "#fde047", medium: "#facc15", large: "#f59e0b" },
};

// Confetti palettes keyed by item id (consumed by Confetti / celebrations).
export const CONFETTI_SKINS: Record<string, string[]> = {
  "confetti-default": ["#4b8bf7", "#7c3aed", "#22d3ee", "#f59e0b", "#f43f5e"],
  "confetti-mono": ["#e2e8f0", "#94a3b8", "#cbd5e1", "#f8fafc"],
  "confetti-neon": ["#22d3ee", "#a3e635", "#f472b6", "#fb923c"],
  "confetti-fire": ["#fde047", "#fb923c", "#f43f5e", "#ef4444"],
};

// App-wide accent themes keyed by item id (override --c-accent/--c-accent-glow).
// There is intentionally NO "accent-default" entry: the default clears the
// override so the per-theme (light/dark) accent from globals.css applies.
export const ACCENT_SKINS: Record<string, { accent: string; glow: string }> = {
  "accent-crimson": { accent: "#f43f5e", glow: "#fb7185" },
  "accent-emerald": { accent: "#10b981", glow: "#34d399" },
  "accent-violet": { accent: "#8b5cf6", glow: "#a78bfa" },
  "accent-amber": { accent: "#f59e0b", glow: "#fbbf24" },
};

export const SHOP_ITEMS: ShopItem[] = [
  // ---- Flame skins ----
  { id: "flame-azure", name: "Azure Flame", description: "A cool blue streak flame.", slot: "flame", price: 120, preview: "#3b82f6" },
  { id: "flame-emerald", name: "Emerald Flame", description: "A verdant green streak flame.", slot: "flame", price: 120, preview: "#10b981" },
  { id: "flame-violet", name: "Violet Flame", description: "A mystic purple streak flame.", slot: "flame", price: 200, preview: "#a855f7" },
  { id: "flame-gold", name: "Golden Flame", description: "A radiant gold flame for the dedicated.", slot: "flame", price: 400, minLevel: 10, preview: "#facc15" },
  // ---- Confetti palettes ----
  { id: "confetti-mono", name: "Monochrome Confetti", description: "Clean, minimal celebration.", slot: "confetti", price: 100, preview: "#cbd5e1" },
  { id: "confetti-neon", name: "Neon Confetti", description: "Loud, electric celebration.", slot: "confetti", price: 150, preview: "#22d3ee" },
  { id: "confetti-fire", name: "Firework Confetti", description: "Warm sparks on every unlock.", slot: "confetti", price: 250, minLevel: 5, preview: "#fb923c" },
  // ---- Accent themes (recolor the whole app's accent) ----
  { id: "accent-crimson", name: "Crimson Accent", description: "Recolor the app in bold crimson.", slot: "accent", price: 150, preview: "#f43f5e" },
  { id: "accent-emerald", name: "Emerald Accent", description: "Recolor the app in fresh emerald.", slot: "accent", price: 150, preview: "#10b981" },
  { id: "accent-violet", name: "Violet Accent", description: "Recolor the app in deep violet.", slot: "accent", price: 200, preview: "#8b5cf6" },
  { id: "accent-amber", name: "Amber Accent", description: "Recolor the app in warm amber.", slot: "accent", price: 300, minLevel: 8, preview: "#f59e0b" },
];

// Resolve the equipped accent override, or null when the default (themed) accent
// should apply.
export function equippedAccent(economy: Economy): { accent: string; glow: string } | null {
  return ACCENT_SKINS[equippedOrDefault(economy, "accent")] ?? null;
}

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

// The currently-equipped item id for a slot, falling back to the free default.
export function equippedOrDefault(economy: Economy, slot: CosmeticSlot): string {
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

export function isFrozen(frozen: Set<string>, habitId: string, key: string): boolean {
  return frozen.has(`${habitId}@${key}`);
}

// How many freezes were used within the rolling window ending at `now`.
export function freezesUsedInWindow(economy: Economy, now: Date): number {
  const cutoff = startOfDay(addDays(now, -FREEZE_WINDOW_DAYS)).getTime();
  return economy.freezes.filter((f) => new Date(f.at).getTime() >= cutoff).length;
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

export function makeFreezeEntry(habitId: string, key: string, id: string, nowIso: string): FreezeEntry {
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
    if (marks[key]?.[habitId] === "missed" && !isFrozen(frozen, habitId, key)) out.push(key);
  }
  return out;
}
