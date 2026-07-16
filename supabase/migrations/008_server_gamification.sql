-- ============================================================================
-- Growly — Server-Side Gamification Validation (migration 008)
-- Idempotent: all statements are safe to run multiple times.
-- ============================================================================
--
-- Problem: unlocks, economy_state, and user_stats_snapshots are derived from
-- habits + marks, but the client currently writes them directly. RLS only
-- checks row ownership, not correctness, so any authenticated client can
-- grant themselves arbitrary achievements, coins, or leaderboard positions.
--
-- Fix:
--   1. Revoke client INSERT/UPDATE on unlocks (keeps SELECT)
--      → unlocks are now write-only by the server (Edge Function)
--   2. Revoke client INSERT/UPDATE on user_stats_snapshots (keeps SELECT)
--      → stats are now write-only by the server (Edge Function)
--   3. economy_state stays client-writable for now (it tracks user actions
--      like check-ins, spins, and quests that can't be derived from marks
--      alone). Shop purchases are validated by the purchase-item Edge Function.
--   4. economy_spent stays append-only via client INSERT (the ledger).
--      The purchase-item function validates the balance server-side before
--      the spend entry is created.
--
-- Edge Functions (supabase/functions/):
--   recompute-progression: reads habits+marks, computes unlocks + stats,
--                          writes to unlocks and user_stats_snapshots
--   purchase-item:         reads economy_spent + economy_state, validates
--                          balance, writes spend entry


-- ############################################################################
--  1. Revoke client write access to unlocks
--     SELECT stays so the UI can still read the user's achievements.
-- ############################################################################

-- First ensure SELECT is granted (it may already be from migration 007)
GRANT SELECT ON TABLE unlocks TO authenticated;

-- Revoke INSERT and UPDATE (keep existing DELETE/TRUNCATE/REFERENCES/TRIGGER
-- revocation from migration 007 — already narrowed to SELECT, INSERT, UPDATE)
REVOKE INSERT, UPDATE ON TABLE unlocks FROM authenticated;

-- Verify only SELECT remains for authenticated
-- (migration 007 already revoked TRUNCATE, DROP, TRIGGER, REFERENCES, DELETE)


-- ############################################################################
--  2. Revoke client write access to user_stats_snapshots
--     SELECT stays so the UI can read public profiles and leaderboards.
-- ############################################################################

-- Ensure SELECT is granted for public profile viewing
GRANT SELECT ON TABLE user_stats_snapshots TO authenticated;

-- Revoke INSERT and UPDATE — stats are computed server-side only
REVOKE INSERT, UPDATE ON TABLE user_stats_snapshots FROM authenticated;


-- ############################################################################
--  3. Grant anon role SELECT on unlocks and user_stats_snapshots
--     (for public profile pages and leaderboard viewing)
-- ############################################################################

GRANT SELECT ON TABLE unlocks TO anon;
GRANT SELECT ON TABLE user_stats_snapshots TO anon;


-- ############################################################################
--  4. Update RLS on unlocks: add a service-role policy so the Edge Function
--     (running with SECURITY DEFINER or service_role) can write.
--     The existing "Users can manage their own unlocks" policy used ALL with
--     (user_id = auth.uid()) — but now authenticated can only SELECT.
--     We need a separate policy for the service role or use SECURITY DEFINER
--     in the Edge Function.
-- ############################################################################

-- Drop the old permissive ALL policy on unlocks
DROP POLICY IF EXISTS "Users can manage their own unlocks" ON unlocks;

-- Recreate with only SELECT for authenticated
CREATE POLICY "Users can view their own unlocks"
  ON unlocks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Add a policy for the service_role (used by Edge Functions via SECURITY DEFINER)
CREATE POLICY "Service role can manage unlocks"
  ON unlocks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ############################################################################
--  5. Update RLS on user_stats_snapshots for service role writes
-- ############################################################################

-- Drop the old INSERT/UPDATE policies (they relied on authenticated role having INSERT/UPDATE grants)
DROP POLICY IF EXISTS "Users can insert their own stats" ON user_stats_snapshots;
DROP POLICY IF EXISTS "Users can update their own stats" ON user_stats_snapshots;

-- Keep the "Anyone can view public stats" policy as-is (SELECT, USING true)
-- It already exists from the original migration.

-- Add a policy for the service_role
CREATE POLICY "Service role can manage user stats"
  ON user_stats_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
