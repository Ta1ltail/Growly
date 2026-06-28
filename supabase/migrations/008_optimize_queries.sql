-- ============================================================================
-- project_101 — Query performance optimization
-- Adds missing indexes for common query patterns and enables Realtime
-- publication for the notifications table (used by useNotifications hook).
-- Apply via `supabase migration up` or Supabase SQL editor.
-- ============================================================================

-- #########################################################
--  USER PROFILE: username lookup (public profiles)
--  The public_profiles view selects from user_profile.
--  Profile pages look up by username — this index makes
--  that O(log n) instead of a full sequential scan.
-- #########################################################
CREATE INDEX IF NOT EXISTS idx_user_profile_username
  ON public.user_profile (username);

-- #########################################################
--  USER STATS SNAPSHOTS: leaderboard sort columns
--  The leaderboard sorts by level, current_streak,
--  consistency_14d, and total_completions. Each needs a
--  descending index for ORDER BY ... DESC performance.
-- #########################################################
CREATE INDEX IF NOT EXISTS idx_stats_level_desc
  ON public.user_stats_snapshots (level DESC);
CREATE INDEX IF NOT EXISTS idx_stats_current_streak_desc
  ON public.user_stats_snapshots (current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_stats_consistency_desc
  ON public.user_stats_snapshots (consistency_14d DESC);
CREATE INDEX IF NOT EXISTS idx_stats_completions_desc
  ON public.user_stats_snapshots (total_completions DESC);

-- #########################################################
--  FRIENDS: composite indexes for friend-list queries
--  The leaderboard and friends pages use queries like
--    WHERE (requester = $1 OR addressee = $1) AND status = 'accepted'
--  A composite index on (requester, status) and
--  (addressee, status) makes this a single index seek.
-- #########################################################
CREATE INDEX IF NOT EXISTS idx_friends_requester_status
  ON public.friends (requester, status);
CREATE INDEX IF NOT EXISTS idx_friends_addressee_status
  ON public.friends (addressee, status);

-- #########################################################
--  SUGGESTIONS: created_at sort
--  The suggestions page orders by created_at DESC.
-- #########################################################
CREATE INDEX IF NOT EXISTS idx_suggestions_created_at_desc
  ON public.suggestions (created_at DESC);

-- #########################################################
--  NOTIFICATIONS: created_at sort + Realtime publication
--  The notification feed loads sorted by created_at DESC.
--  Also add the table to supabase_realtime so the
--  useNotifications Realtime subscription works.
-- #########################################################
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_desc
  ON public.notifications (created_at DESC);

-- Add notifications to Realtime publication (for the
-- useNotifications hook's Realtime subscription)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;
