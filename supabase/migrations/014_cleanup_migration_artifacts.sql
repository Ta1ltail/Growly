-- ============================================================================
-- Growly — Migration 014: Clean Up Migration Artifacts
-- ============================================================================
-- Removes orphaned RLS policies and grants left over from the migration
-- 008/009 server-gamification churn:
--
--   1. DROP orphaned service_role policies on unlocks and user_stats_snapshots
--      (created in migration 008, preserved in 009 — the Edge Function they
--      were designed for never became stable, and the client writes directly).
--
--   2. REVOKE anon SELECT on unlocks (migration 008 temporarily granted it for
--      public profiles, but achievement data doesn't need to be public).
--
--   3. REVOKE anon SELECT on user_stats_snapshots (the leaderboard and public
--      profiles should require authentication).
-- ============================================================================


-- ############################################################################
--  1. Drop orphaned service_role policies on unlocks
--     These were created in migration 008 for the Edge Function and preserved
--     in migration 009. The client writes directly to unlocks now.
-- ############################################################################

DROP POLICY IF EXISTS "Service role can manage unlocks" ON public.unlocks;


-- ############################################################################
--  2. Drop orphaned service_role policies on user_stats_snapshots
--     Same story — created in migration 008 for the Edge Function.
-- ############################################################################

DROP POLICY IF EXISTS "Service role can manage user stats" ON public.user_stats_snapshots;


-- ############################################################################
--  3. Revoke anon SELECT on unlocks
--     Migration 008 granted anon SELECT on unlocks for public profiles, but
--     this exposes achievement data to unauthenticated users unnecessarily.
--     Authenticated users can still read their own unlocks via RLS.
-- ############################################################################

REVOKE SELECT ON TABLE public.unlocks FROM anon;


-- ############################################################################
--  4. Revoke anon SELECT on user_stats_snapshots
--     The leaderboard and public profiles require authentication. Migration 008
--     granted anon SELECT but this is unnecessary for the current app design.
-- ############################################################################

REVOKE SELECT ON TABLE public.user_stats_snapshots FROM anon;
