-- ============================================================================
-- project_101 — Fix Unlocks RLS for Public Profile Achievement Display
--
-- The `unlocks` table has RLS: "Users can manage their own unlocks" which
-- restricts SELECT to user_id = auth.uid(). This prevents the public profile
-- view from displaying another user's unlocked achievements.
--
-- Fix: Add a separate SELECT policy allowing any authenticated user to view
-- achievements. The INSERT/UPDATE/DELETE policies remain restricted to the
-- row owner via the existing "manage own" policy.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'unlocks'
    AND policyname = 'Anyone can view achievements'
  ) THEN
    CREATE POLICY "Anyone can view achievements"
      ON unlocks FOR SELECT
      USING (true);
  END IF;
END
$$;
