-- ============================================================================
-- Fix missing GRANTs on all public tables for the authenticated role.
-- The 001_schema.sql included these GRANTs, but if tables were recreated by
-- a later migration (002) the privileges were lost.
-- ============================================================================

GRANT ALL ON TABLE habits                TO authenticated;
GRANT ALL ON TABLE marks                 TO authenticated;
GRANT ALL ON TABLE notes                 TO authenticated;
GRANT ALL ON TABLE goals                 TO authenticated;
GRANT ALL ON TABLE unlocks               TO authenticated;
GRANT ALL ON TABLE user_settings         TO authenticated;
GRANT ALL ON TABLE user_profile          TO authenticated;
GRANT ALL ON TABLE economy_state         TO authenticated;
GRANT ALL ON TABLE progress_seen         TO authenticated;
GRANT ALL ON TABLE economy_spent         TO authenticated;
GRANT ALL ON TABLE economy_freezes       TO authenticated;
GRANT ALL ON TABLE friends               TO authenticated;
GRANT ALL ON TABLE notifications         TO authenticated;
GRANT ALL ON TABLE suggestions           TO authenticated;
GRANT ALL ON TABLE user_stats_snapshots  TO authenticated;

-- View needed its own grant — table grants don't carry over
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'public_profiles' AND relkind = 'v') THEN
    GRANT SELECT ON public_profiles TO authenticated;
  END IF;
END $$;
