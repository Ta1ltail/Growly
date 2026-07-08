-- Ensure ALL sync tables are in the Realtime publication so the SyncProvider's
-- postgres_changes subscriptions fire immediately (instead of relying on the
-- 30-second polling fallback). Only `notifications` was added previously — the
-- remaining tables were never published, meaning cross-device sync was delayed
-- by the full poll interval.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'habits', 'marks', 'notes', 'goals',
    'user_settings', 'user_profile',
    'unlocks', 'economy_state', 'economy_spent', 'economy_freezes',
    'progress_seen'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$$;
