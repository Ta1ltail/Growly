-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 018 — Revoke anon/public table-level privileges
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Problem: The `public` role (which includes unauthenticated `anon` users)
-- has inherited default ALL privileges on every public table, granting
-- INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, and REFERENCES capabilities
-- to every unauthenticated visitor. While RLS policies restrict row-level
-- access (auth.uid() is NULL for anon), schema-level operations like
-- TRUNCATE and DROP are NOT blocked by RLS.
--
-- Fix:
--   1. REVOKE ALL on every public table from PUBLIC
--   2. GRANT back only what anon actually needs:
--      - Nothing on tables — all pre-auth functionality uses the
--        username_exists() function (granted in migration 001) or
--        Supabase Auth endpoints, never direct table access.
--      - The public_profiles view is only for authenticated users
--        (granted in migration 001/004).
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
--  REVOKE ALL from PUBLIC on every application table
-- ═══════════════════════════════════════════════════════════════════════════
-- REVOKE ... FROM PUBLIC removes the default grant that gives the `anon`
-- role full schema-level access. The `authenticated` role's grants are
-- preserved (they were narrowed in migration 007).

REVOKE ALL ON TABLE public.habits                FROM PUBLIC;
REVOKE ALL ON TABLE public.marks                 FROM PUBLIC;
REVOKE ALL ON TABLE public.notes                 FROM PUBLIC;
REVOKE ALL ON TABLE public.goals                 FROM PUBLIC;
REVOKE ALL ON TABLE public.unlocks               FROM PUBLIC;
REVOKE ALL ON TABLE public.user_settings         FROM PUBLIC;
REVOKE ALL ON TABLE public.user_profile          FROM PUBLIC;
REVOKE ALL ON TABLE public.economy_state         FROM PUBLIC;
REVOKE ALL ON TABLE public.economy_spent         FROM PUBLIC;
REVOKE ALL ON TABLE public.economy_freezes       FROM PUBLIC;
REVOKE ALL ON TABLE public.economy_bonuses       FROM PUBLIC;
REVOKE ALL ON TABLE public.friends               FROM PUBLIC;
REVOKE ALL ON TABLE public.notifications         FROM PUBLIC;
REVOKE ALL ON TABLE public.suggestions           FROM PUBLIC;
REVOKE ALL ON TABLE public.progress_seen         FROM PUBLIC;
REVOKE ALL ON TABLE public.user_stats_snapshots  FROM PUBLIC;

-- Also revoke from anon explicitly (belt-and-suspenders)
REVOKE ALL ON TABLE public.habits                FROM anon;
REVOKE ALL ON TABLE public.marks                 FROM anon;
REVOKE ALL ON TABLE public.notes                 FROM anon;
REVOKE ALL ON TABLE public.goals                 FROM anon;
REVOKE ALL ON TABLE public.unlocks               FROM anon;
REVOKE ALL ON TABLE public.user_settings         FROM anon;
REVOKE ALL ON TABLE public.user_profile          FROM anon;
REVOKE ALL ON TABLE public.economy_state         FROM anon;
REVOKE ALL ON TABLE public.economy_spent         FROM anon;
REVOKE ALL ON TABLE public.economy_freezes       FROM anon;
REVOKE ALL ON TABLE public.economy_bonuses       FROM anon;
REVOKE ALL ON TABLE public.friends               FROM anon;
REVOKE ALL ON TABLE public.notifications         FROM anon;
REVOKE ALL ON TABLE public.suggestions           FROM anon;
REVOKE ALL ON TABLE public.progress_seen         FROM anon;
REVOKE ALL ON TABLE public.user_stats_snapshots  FROM anon;

-- ═══════════════════════════════════════════════════════════════════════════
--  GRANT back only what anon truly needs
-- ═══════════════════════════════════════════════════════════════════════════
-- Anon needs no direct table access. The username_exists() function
-- (migration 001) is already granted via:
--   GRANT EXECUTE ON FUNCTION public.username_exists(TEXT) TO anon, authenticated;
-- And Supabase Auth endpoints handle login/registration without table reads.
--
-- If public-profile viewing or leaderboard access is needed for unauthenticated
-- users in the future, add granular SELECT grants here (one table at a time).
