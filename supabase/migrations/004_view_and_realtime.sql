-- ============================================================================
-- Create the public_profiles view and enable Realtime for sync tables.
-- The view was defined in 001_schema.sql but was never actually applied
-- (GRANT SELECT ON public_profiles failed with "relation does not exist").
-- ============================================================================

-- ############################################################################
--  PUBLIC PROFILES VIEW
-- ############################################################################

CREATE OR REPLACE VIEW public_profiles AS
SELECT
  user_id,
  display_name,
  username,
  bio,
  motto,
  avatar,
  banner,
  showcase_badge_id
FROM user_profile;

GRANT SELECT ON public_profiles TO authenticated;

-- ############################################################################
--  ENABLE REALTIME for sync tables
--  This allows the browser client to subscribe to changes on these tables
--  via Supabase Realtime, enabling live sync across devices.
-- ############################################################################

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'habits', 'marks', 'notes', 'goals',
    'user_settings', 'user_profile', 'unlocks',
    'economy_state', 'economy_spent', 'economy_freezes',
    'progress_seen', 'suggestions',
    'user_stats_snapshots', 'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        tbl
      );
    EXCEPTION WHEN duplicate_object THEN
      -- Table already in publication, safe to ignore
      NULL;
    END;
  END LOOP;
END;
$$;

-- ############################################################################
--  ANALYZE
-- ############################################################################

ANALYZE public.user_profile;
