-- ============================================================================
-- project_101 — Fix Database Permissions
--
-- The original migrations created tables with RLS policies but never granted
-- table-level permissions to the `authenticated` role. In Supabase/Postgres,
-- this causes "permission denied for table" errors (code 42501) for all
-- data operations.
--
-- Fix: Grant ALL privileges on every app table to the authenticated role.
-- RLS policies then control row-level access.
-- ============================================================================

-- ── Core data tables ──────────────────────────────────────────────────────
GRANT ALL ON TABLE habits                    TO authenticated;
GRANT ALL ON TABLE marks                     TO authenticated;
GRANT ALL ON TABLE notes                     TO authenticated;
GRANT ALL ON TABLE goals                     TO authenticated;
GRANT ALL ON TABLE unlocks                   TO authenticated;

-- ── Single-row-per-user tables ───────────────────────────────────────────
GRANT ALL ON TABLE user_settings             TO authenticated;
GRANT ALL ON TABLE user_profile              TO authenticated;
GRANT ALL ON TABLE economy_state             TO authenticated;
GRANT ALL ON TABLE progress_seen             TO authenticated;

-- ── Economy ledger tables ────────────────────────────────────────────────
GRANT ALL ON TABLE economy_spent             TO authenticated;
GRANT ALL ON TABLE economy_freezes           TO authenticated;

-- ── Social tables ────────────────────────────────────────────────────────
GRANT ALL ON TABLE friends                   TO authenticated;
GRANT ALL ON TABLE notifications             TO authenticated;
GRANT ALL ON TABLE suggestions               TO authenticated;

-- ── Public profile snapshots ─────────────────────────────────────────────
GRANT ALL ON TABLE user_stats_snapshots      TO authenticated;

-- ── Views ─────────────────────────────────────────────────────────────────
-- Views need their own GRANT in PostgreSQL -- table grants don't carry over.
GRANT SELECT ON TABLE public_profiles        TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
--  Fix: public_profiles VIEW SELECT policy
--
--  The user_profile table has RLS: "Users can manage their own profile" which
--  only allows reading YOUR OWN row (USING user_id = auth.uid()).
--  The public_profiles VIEW inherits this policy, so querying it for other
--  users returns empty results.
--
--  Fix: Add a separate SELECT policy that allows any authenticated user to
--  read all profiles. The existing INSERT/UPDATE/DELETE policies remain
--  restricted to the row owner.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Anyone can view profiles" ON user_profile;

CREATE POLICY "Anyone can view profiles"
  ON user_profile FOR SELECT
  USING (true);
