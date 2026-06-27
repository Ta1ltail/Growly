-- ============================================================================
-- project_101 — Fix public_profiles RLS
--
-- The user_profile table has RLS: "Users can manage their own profile" which
-- only allows reading YOUR OWN row (USING user_id = auth.uid()).
-- The public_profiles VIEW inherits this policy, so querying it for other
-- users returns empty results.
--
-- Fix: Add a separate SELECT policy that allows any authenticated user to
-- read all profiles. The existing INSERT/UPDATE/DELETE policies remain
-- restricted to the row owner.
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view profiles" ON user_profile;

CREATE POLICY "Anyone can view profiles"
  ON user_profile FOR SELECT
  USING (true);
