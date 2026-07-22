"use client";

// Economy mutations — shop, freezes, check-in, daily quest, daily spin.
// Domain logic extracted from index.ts

import { update, audit } from "./core";
import type { AppData, CosmeticSlot } from "../types";
import { uid } from "../util";
import {
  canFreezeDay,
  canUseFreeze,
  checkInReward,
  coinBalance,
  coinsEarned,
  FREEZE_PRICE,
  frozenSet,
  generateDailyQuest,
  makeFreezeEntry,
  randomSpinReward,
  shopItem,
} from "../economy";
import { buildGameStats, evaluateAchievements } from "../achievements";
import { summarizeProgress } from "../progress";
import { dateKey, addDays } from "../date";

/* ---------------- helpers ---------------- */

// Spendable balance for the current data snapshot. Derives earned coins from
// history (same path as the UI) minus the persisted spend ledger.
function balanceOf(data: AppData, today: Date): number {
  const stats = buildGameStats(
    data.habits,
    data.marks,
    today,
    frozenSet(data.economy),
  );
  const unlockedRarities = evaluateAchievements(stats)
    .filter((a) => a.unlocked)
    .map((a) => a.def.rarity);
  return coinBalance(
    coinsEarned(stats, unlockedRarities, data.economy),
    data.economy,
  );
}

// Level for shop level gates (local helper).
function summarizeLevel(data: AppData, today: Date): number {
  return summarizeProgress(data, today).level.level;
}

/* ---------------- shop / cosmetics ---------------- */

// Buy a cosmetic: must exist, not owned, meet level gate, affordable.
// Appends immutable spend entry. No-op if any guard fails.
export function buyCosmetic(itemId: string): void {
  update((prev) => {
    const item = shopItem(itemId);
    if (!item) return prev;
    if (prev.economy.owned.includes(itemId)) return prev;
    const today = new Date();
    if (item.minLevel) {
      const level = summarizeLevel(prev, today);
      if (level < item.minLevel) return prev;
    }
    if (balanceOf(prev, today) < item.price) return prev;

    const entry = {
      id: uid(),
      at: new Date().toISOString(),
      amount: item.price,
      item: itemId,
    };
    return {
      ...prev,
      economy: {
        ...prev.economy,
        spent: [...prev.economy.spent, entry],
        owned: [...prev.economy.owned, itemId],
        // Auto-equip the freshly-bought item in its slot.
        equipped: { ...prev.economy.equipped, [item.slot]: itemId },
      },
      auditLog: audit(
        prev,
        "shop.buy",
        `Bought "${item.name}" for ${item.price} coins`,
        undefined,
        undefined,
        entry,
      ),
    };
  });
}

// Equip an owned cosmetic (or a free default) into its slot.
export function equipCosmetic(slot: CosmeticSlot, itemId: string): void {
  update((prev) => {
    const isDefault = itemId === `${slot}-default`;
    if (!isDefault) {
      const item = shopItem(itemId);
      if (!item || item.slot !== slot) return prev;
      if (!prev.economy.owned.includes(itemId)) return prev;
    }
    return {
      ...prev,
      economy: {
        ...prev.economy,
        equipped: { ...prev.economy.equipped, [slot]: itemId },
      },
    };
  });
}

// Apply streak freeze to a past miss. Costs coins, 1 per 7-day window.
export function redeemFreeze(habitId: string, dateK: string): void {
  update((prev) => {
    const today = new Date();
    if (!canUseFreeze(prev.economy, today)) return prev;
    if (!canFreezeDay(prev.economy, prev.marks, habitId, dateK)) return prev;
    if (balanceOf(prev, today) < FREEZE_PRICE) return prev;

    const nowIso = new Date().toISOString();
    const freeze = makeFreezeEntry(habitId, dateK, uid(), nowIso);
    const spend = {
      id: uid(),
      at: nowIso,
      amount: FREEZE_PRICE,
      item: "freeze" as const,
    };
    return {
      ...prev,
      economy: {
        ...prev.economy,
        spent: [...prev.economy.spent, spend],
        freezes: [...prev.economy.freezes, freeze],
      },
      auditLog: audit(
        prev,
        "freeze.use",
        `Used a streak freeze on ${dateK}`,
        habitId,
        undefined,
        freeze,
      ),
    };
  });
}

/* ---------------- engagement features ---------------- */

// Claim daily check-in bonus. Returns reward + streak (0/0 if already claimed).
// Pushes a date-scoped bonus row (UNIQUE user_id + type + date_key in DB) so
// multi-device offline sync cannot double-claim or lose rewards.
export function claimDailyCheckIn(): { reward: number; streak: number } {
  let result: { reward: number; streak: number } = { reward: 0, streak: 0 };
  update((prev) => {
    const now = new Date();
    const todayKey = dateKey(now);
    if (prev.economy.lastCheckIn === todayKey) return prev; // already claimed
    const prevStreak = prev.economy.checkInStreak;
    const yesterday = dateKey(addDays(now, -1));
    const streak = prev.economy.lastCheckIn === yesterday ? prevStreak + 1 : 1;
    const reward = checkInReward(streak);
    result = { reward, streak };
    // Check if a bonus row for today+check_in already exists (from another device)
    const existingBonus = prev.economy.bonuses.find(
      (b) => b.type === "check_in" && b.dateKey === todayKey,
    );
    const bonusEntry = existingBonus ?? {
      id: uid(),
      type: "check_in" as const,
      dateKey: todayKey,
      amount: reward,
      at: new Date().toISOString(),
    };
    return {
      ...prev,
      economy: {
        ...prev.economy,
        bonuses: existingBonus
          ? prev.economy.bonuses.map((b) =>
              b === existingBonus ? { ...b, amount: reward } : b,
            )
          : [...prev.economy.bonuses, bonusEntry],
        bonusCoins: prev.economy.bonusCoins + reward,
        lastCheckIn: todayKey,
        checkInStreak: streak,
      },
    };
  });
  return result;
}

// Refresh daily quest. Only generates if stored quest is from an older date or claimed.
export function refreshDailyQuest(): void {
  update((prev) => {
    const now = new Date();
    const todayKey = dateKey(now);
    // If today's quest already exists (claimed or unclaimed), don't regenerate
    if (prev.economy.lastQuestDate === todayKey) return prev;
    const quest = generateDailyQuest(prev.habits);
    return {
      ...prev,
      economy: {
        ...prev.economy,
        lastQuestDate: todayKey,
        currentQuest: quest ? { ...quest, current: 0 } : null,
      },
    };
  });
}

// Claim the daily quest reward. Only works if the quest is completed.
export function claimDailyQuest(): void {
  update((prev) => {
    const now = new Date();
    const q = prev.economy.currentQuest;
    if (!q || q.current < q.target || q.claimed) return prev;
    return {
      ...prev,
      economy: {
        ...prev.economy,
        bonuses: [
          ...prev.economy.bonuses,
          {
            id: uid(),
            type: "quest" as const,
            dateKey: dateKey(now),
            amount: q.reward,
            at: new Date().toISOString(),
          },
        ],
        bonusCoins: prev.economy.bonusCoins + q.reward,
        // Keep the quest around in a claimed state so the card stays visible
        // until midnight instead of vanishing the moment it's collected.
        currentQuest: { ...q, claimed: true },
        lastQuestDate: dateKey(now),
      },
    };
  });
}

// Do the daily spin. Returns the reward won, or null if already spun today.
export function doDailySpin(): {
  label: string;
  amount: number;
  isFreeze: boolean;
  originalLabel?: string;
} | null {
  let result: {
    label: string;
    amount: number;
    isFreeze: boolean;
    originalLabel?: string;
  } | null = null;
  update((prev) => {
    const now = new Date();
    const todayKey = dateKey(now);
    if (prev.economy.lastSpinDate === todayKey) return prev; // already spun
    const reward = randomSpinReward();
    const isFreeze = reward.item === "freeze";
    // When the spin lands on "Streak Freeze", give a coin consolation prize
    // since a scatter-shot freeze entry can't target a real missed day.
    const effectiveAmount = isFreeze ? 25 : reward.amount;
    const effectiveLabel = isFreeze
      ? "25 coins (freeze consolation)"
      : reward.label;
    result = {
      label: effectiveLabel,
      amount: effectiveAmount,
      isFreeze,
      originalLabel: reward.label,
    };
    return {
      ...prev,
      economy: {
        ...prev.economy,
        bonuses: [
          ...prev.economy.bonuses,
          {
            id: uid(),
            type: "spin" as const,
            dateKey: todayKey,
            amount: effectiveAmount,
            at: new Date().toISOString(),
          },
        ],
        bonusCoins: prev.economy.bonusCoins + effectiveAmount,
        lastSpinDate: todayKey,
        lastSpinResult: result,
      },
    };
  });
  return result;
}
