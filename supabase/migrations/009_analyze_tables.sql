-- ============================================================================
-- project_101 — Update query planner statistics after new indexes
-- Run ANALYZE on tables that received new indexes in migration 008 so the
-- PostgreSQL query planner uses them correctly from the start.
-- ============================================================================

ANALYZE public.user_profile;
ANALYZE public.user_stats_snapshots;
ANALYZE public.friends;
ANALYZE public.suggestions;
ANALYZE public.notifications;
