// Stats snapshot DB module — load + save user stats snapshots.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatsSnapshotData } from "../../storage";

export async function loadUserStatsSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<StatsSnapshotData | null> {
  const { data, error } = await supabase
    .from("user_stats_snapshots")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  if (!data) return null;

  const d = data as Record<string, unknown>;
  return {
    level: d.level as number,
    currentStreak: d.current_streak as number,
    bestStreak: d.best_streak as number,
    totalCompletions: d.total_completions as number,
    consistency14d: d.consistency_14d as number,
    achievementCount: d.achievement_count as number,
    titleName: d.title_name as string,
    rankIcon: d.rank_icon as string,
    updatedAt:
      (d.updated_at as string) ?? new Date().toISOString(),
  };
}

export async function saveUserStatsSnapshot(
  supabase: SupabaseClient,
  userId: string,
  stats: StatsSnapshotData,
): Promise<void> {
  const { error } = await supabase.from("user_stats_snapshots").upsert(
    {
      user_id: userId,
      level: stats.level,
      current_streak: stats.currentStreak,
      best_streak: stats.bestStreak,
      total_completions: stats.totalCompletions,
      consistency_14d: stats.consistency14d,
      achievement_count: stats.achievementCount,
      title_name: stats.titleName,
      rank_icon: stats.rankIcon,
      updated_at: stats.updatedAt,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
