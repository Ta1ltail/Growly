-- ============================================================================
-- Growly — Migration 015: Notification Cleanup
-- ============================================================================
-- Adds a daily cron job that deletes seen notifications older than 90 days
-- to prevent unbounded table growth. Follows the same pattern as the
-- existing refresh-stale-snapshots cron in 001_schema.sql.
--
-- Also provides a manual cleanup function callable by admins or future
-- client-side maintenance:
--   SELECT public.cleanup_old_notifications();
-- ============================================================================

-- ── Cleanup function ────────────────────────────────────────────────────────
-- Deletes all notifications that have been seen (is_read = true) and are
-- older than 90 days. Returns the number of rows deleted.
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE is_read = TRUE
    AND created_at < now() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Revoke default PUBLIC EXECUTE (same pattern as refresh_user_stats)
REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC, anon, authenticated;

-- Schedule daily at 02:00 UTC (an hour before the snapshots refresh at 03:00)
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * *',
  $$ SELECT public.cleanup_old_notifications(); $$
);

-- Run once immediately on deploy to clean any existing backlog
SELECT public.cleanup_old_notifications();

-- ============================================================================
-- ANALYZE to update query planner statistics after potential large deletes
-- ============================================================================
ANALYZE public.notifications;
