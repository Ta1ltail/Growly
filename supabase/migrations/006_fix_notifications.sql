-- ============================================================================
-- project_101 — Fix Notifications RLS
--
-- The original INSERT policy used a subquery (SELECT 1 FROM auth.users)
-- which can behave inconsistently in certain Supabase configurations.
-- Simplify to a straightforward auth.role() check.
-- ============================================================================

DROP POLICY IF EXISTS "Users can create notifications" ON notifications;

CREATE POLICY "Users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
