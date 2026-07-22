"use client";

// Goal CRUD — domain logic extracted from index.ts

import { update } from "./core";
import type { Goal } from "../types";

/* ---------------- goals ---------------- */

export function addGoal(goal: Goal): void {
  update((prev) => {
    // Soft limit check: warn when approaching storage quotas
    if (prev.goals.length >= 100) {
      console.warn(`[goals] Soft limit reached: ${prev.goals.length + 1} goals`);
    }
    return { ...prev, goals: [...prev.goals, goal] };
  });
}

export function updateGoal(goal: Goal): void {
  update((prev) => ({
    ...prev,
    goals: prev.goals.map((g) => (g.id === goal.id ? goal : g)),
  }));
}

export function deleteGoal(id: string): void {
  update((prev) => ({
    ...prev,
    goals: prev.goals.map((g) =>
      g.id === id ? { ...g, deletedAt: new Date().toISOString() } : g,
    ),
  }));
}
