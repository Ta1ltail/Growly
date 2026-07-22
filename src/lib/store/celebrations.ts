"use client";

// Celebration/achievement seen-tracker and acknowledgment — domain logic extracted from index.ts

import { update, getSnapshot } from "./core";
import { uid } from "../util";
import {
  baselineProgressSeen,
  type CelebrationEvent,
} from "../celebrations";
import { levelUpCoinsBetween, streakMilestoneReward } from "../economy";
import { RARITY_ORDER } from "../achievements";
import { dateKey } from "../date";
import { reconcileUnlocks } from "../progress";

/* ---------------- achievement seen-tracking ---------------- */

// One-time silent seed: record every already-earned achievement as seen so a
// returning user (or a pre-v3 save migrating to an empty unlock map) doesn't get
// a flood of celebration popups for history they earned before this session.
// Only fills GAPS — anything already recorded keeps its existing seen flag.
// Call once on app mount, before celebrations start watching.
export function seedUnlocksSeen(): void {
  const prev = getSnapshot();
  const { unlocks, newlyUnlocked } = reconcileUnlocks(
    prev,
    new Date(),
    new Date().toISOString(),
  );
  if (newlyUnlocked.length === 0) return; // nothing to seed, skip history
  update(() => {
    const seeded = { ...unlocks };
    for (const id of newlyUnlocked)
      seeded[id] = { ...seeded[id], seen: true };
    return { ...prev, unlocks: seeded };
  });
}

export function markAchievementsSeen(ids: string[]): void {
  update((prev) => {
    let changed = false;
    const unlocks = { ...prev.unlocks };
    for (const id of ids) {
      const rec = unlocks[id];
      if (rec && !rec.seen) {
        unlocks[id] = { ...rec, seen: true };
        changed = true;
      }
    }
    return changed ? { ...prev, unlocks } : prev;
  });
}

/* ---------------- celebrations (unified queue) ---------------- */

// One-time baseline: record current level/title/shop/streak progress as already
// "seen" so a returning user doesn't get flooded with celebrations for progress
// earned before this feature existed. Idempotent — a no-op once `seeded` is set.
// Call once on app mount (mirrors seedUnlocksSeen).
export function seedCelebrationsSeen(): void {
  update((prev) => {
    if (prev.progressSeen.seeded) return prev;
    return {
      ...prev,
      progressSeen: baselineProgressSeen(prev, new Date()),
    };
  });
}

// Mark a celebration as seen by advancing the matching progressSeen marker (or,
// for achievements, the unlock's seen flag). Called when the center popup is
// dismissed, which drops the event from the derived queue and reveals the next.
export function acknowledgeCelebration(event: CelebrationEvent): void {
  if (event.kind === "achievement") {
    if (event.achievementId) markAchievementsSeen([event.achievementId]);
    return;
  }
  update((prev) => {
    const ps = prev.progressSeen;
    let next: typeof ps | null = null;
    // Reward coins granted alongside advancing the seen-marker. Tied to the
    // one-time marker bump so an event can never pay out twice.
    let bonus = 0;
    if (
      event.kind === "levelup" &&
      event.level != null &&
      event.level > ps.level
    ) {
      next = { ...ps, level: event.level };
      bonus = levelUpCoinsBetween(ps.level, event.level);
    } else if (
      event.kind === "title" &&
      event.titleName &&
      event.titleName !== ps.title
    ) {
      next = { ...ps, title: event.titleName };
    } else if (
      event.kind === "shop" &&
      event.shopId &&
      !ps.shop.includes(event.shopId)
    ) {
      next = { ...ps, shop: [...ps.shop, event.shopId] };
    } else if (
      event.kind === "streak" &&
      event.habitId &&
      event.tier != null &&
      event.tier > (ps.streaks[event.habitId] ?? 0)
    ) {
      next = {
        ...ps,
        streaks: { ...ps.streaks, [event.habitId]: event.tier },
      };
      bonus = streakMilestoneReward(event.tier);
    } else if (event.kind === "tier" && event.tier != null) {
      const rarity = (
        Object.entries(RARITY_ORDER) as [string, number][]
      ).find(([, order]) => order === event.tier)?.[0];
      if (rarity && !ps.tierUnlocks.includes(rarity)) {
        next = { ...ps, tierUnlocks: [...ps.tierUnlocks, rarity] };
      }
    } else if (
      event.kind === "goal" &&
      event.goalId &&
      !ps.completedGoals.includes(event.goalId)
    ) {
      next = {
        ...ps,
        completedGoals: [...ps.completedGoals, event.goalId],
      };
    }
    if (!next) return prev;
    let economy = prev.economy;
    if (bonus > 0) {
      const now = new Date();
      const todayKey = dateKey(now);
      // Determine the bonus type for the per-row bonus entry
      const bonusType: "level_up" | "streak_milestone" =
        event.kind === "levelup" ? "level_up" : "streak_milestone";
      // Check for existing bonus row for this type+date to avoid duplication
      const existingBonus = economy.bonuses.find(
        (b) => b.type === bonusType && b.dateKey === todayKey,
      );
      const bonusEntry = existingBonus
        ? { ...existingBonus, amount: existingBonus.amount + bonus }
        : {
            id: uid(),
            type: bonusType,
            dateKey: todayKey,
            amount: bonus,
            at: new Date().toISOString(),
          };
      economy = {
        ...economy,
        bonuses: existingBonus
          ? economy.bonuses.map((b) => (b === existingBonus ? bonusEntry : b))
          : [...economy.bonuses, bonusEntry],
        bonusCoins: economy.bonusCoins + bonus,
      };
    }
    return { ...prev, progressSeen: next, economy };
  });
}

// Re-exported for backward compat — previously exported from index.ts
export type { CelebrationEvent } from "../celebrations";
