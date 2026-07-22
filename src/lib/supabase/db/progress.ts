// ProgressSeen DB module — row converter + load + save.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgressSeen } from "../../types";
import { DEFAULT_PROGRESS_SEEN } from "../../types";
import type { DbProgressSeen } from "./core";

export function rowToProgressSeen(row: DbProgressSeen): ProgressSeen {
  let streaks: Record<string, number> = {};
  if (row.streaks && typeof row.streaks === "object") {
    streaks = row.streaks as Record<string, number>;
  }
  return {
    seeded: row.seeded ?? false,
    level: row.level ?? DEFAULT_PROGRESS_SEEN.level,
    title: row.title ?? DEFAULT_PROGRESS_SEEN.title,
    shop: row.shop ?? [],
    streaks,
    tierUnlocks: row.tier_unlocks ?? [],
    completedGoals: row.completed_goals ?? [],
  };
}

export function progressSeenToRow(
  userId: string,
  ps: ProgressSeen,
): DbProgressSeen {
  return {
    user_id: userId,
    seeded: ps.seeded ?? false,
    level: ps.level,
    title: ps.title,
    shop: ps.shop ?? [],
    streaks: ps.streaks ?? {},
    tier_unlocks: ps.tierUnlocks ?? [],
    completed_goals: ps.completedGoals ?? [],
  };
}

export async function loadProgressSeen(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProgressSeen | null> {
  const { data, error } = await supabase
    .from("progress_seen")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data ? rowToProgressSeen(data) : null;
}

export async function saveProgressSeen(
  supabase: SupabaseClient,
  userId: string,
  progressSeen: ProgressSeen,
): Promise<void> {
  const row = progressSeenToRow(userId, progressSeen);
  const { error } = await supabase
    .from("progress_seen")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}
