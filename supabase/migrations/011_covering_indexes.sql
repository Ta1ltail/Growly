-- ============================================================================
-- project_101 — Covering indexes for index-only scans
--
-- The leaderboard queries user_stats_snapshots sorted by various columns
-- and selects user_id, level, current_streak, best_streak, total_completions,
-- consistency_14d, achievement_count, title_name, rank_icon.
--
-- A covering index (with INCLUDE) lets PostgreSQL answer the query entirely
-- from the index, without touching the table at all.
-- ============================================================================

-- Level sort (most common leaderboard default)
CREATE INDEX IF NOT EXISTS idx_stats_level_cover
  ON public.user_stats_snapshots (level DESC)
  INCLUDE (user_id, current_streak, best_streak, total_completions,
           consistency_14d, achievement_count, title_name, rank_icon);

-- Current streak sort
CREATE INDEX IF NOT EXISTS idx_stats_streak_cover
  ON public.user_stats_snapshots (current_streak DESC)
  INCLUDE (user_id, level, best_streak, total_completions,
           consistency_14d, achievement_count, title_name, rank_icon);

-- Consistency sort
CREATE INDEX IF NOT EXISTS idx_stats_consistency_cover
  ON public.user_stats_snapshots (consistency_14d DESC)
  INCLUDE (user_id, level, current_streak, best_streak,
           total_completions, achievement_count, title_name, rank_icon);

-- Total completions sort
CREATE INDEX IF NOT EXISTS idx_stats_completions_cover
  ON public.user_stats_snapshots (total_completions DESC)
  INCLUDE (user_id, level, current_streak, best_streak,
           consistency_14d, achievement_count, title_name, rank_icon);
