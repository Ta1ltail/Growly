-- ============================================================================
-- Growly — Restore Client Write Access for unlocks & user_stats_snapshots
-- Idempotent: all statements are safe to run multiple times.
-- ============================================================================
--
-- Migration 008 revoked client INSERT/UPDATE on unlocks and
-- user_stats_snapshots, expecting the recompute-progression Edge Function to
-- handle all server-side writes. However, that Edge Function is returning 503
-- errors (misconfigured env vars or deployment issues).
--
-- This migration restores client write access so the app works fully without
-- relying on the Edge Function. The client already computes all stats and
-- achievements locally (see src/lib/achievements.ts, src/lib/xp.ts) — it just
-- needs the DB grants to persist them.
--
-- The Edge Function can be fixed separately and run as a supplementary
-- server-side validator, but the client should always be able to write its
-- own derived state.

-- ############################################################################
--  1. Restore INSERT + UPDATE on unlocks for authenticated
--     (SELECT was preserved by migration 008)
-- ############################################################################

GRANT INSERT, UPDATE ON TABLE unlocks TO authenticated;

-- ############################################################################
--  2. Restore INSERT + UPDATE on user_stats_snapshots for authenticated
--     (SELECT was preserved by migration 008)
-- ############################################################################

GRANT INSERT, UPDATE ON TABLE user_stats_snapshots TO authenticated;

-- ############################################################################
--  3. Restore RLS policies for authenticated writes on unlocks
--     Migration 008 dropped "Users can manage their own unlocks" and replaced
--     it with a SELECT-only policy. We need INSERT/UPDATE policies back.
-- ############################################################################

-- Drop the SELECT-only policy created by migration 008
DROP POLICY IF EXISTS "Users can view their own unlocks" ON unlocks;

-- Restore the full management policy (SELECT + INSERT + UPDATE)
CREATE POLICY "Users can manage their own unlocks"
  ON unlocks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Keep the service_role policy (migration 008) for the Edge Function
-- The service_role policy already exists from migration 008.

-- ############################################################################
--  4. Restore INSERT/UPDATE RLS policies for user_stats_snapshots
--     Migration 008 dropped "Users can insert their own stats" and
--     "Users can update their own stats" — restore them.
-- ############################################################################

-- "Anyone can view public stats" already exists from migration 001

CREATE POLICY "Users can insert their own stats"
  ON user_stats_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stats"
  ON user_stats_snapshots
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- The service_role policy from migration 008 is kept for the Edge Function.
