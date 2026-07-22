-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 014 — Scalability: composite indexes for query performance
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. marks(user_id, date_key) — composite index for loadAllUserData queries
--    The existing single-column idx_marks_user_id requires a filter on date_key
--    after the index scan. This composite index enables index-only scans for
--    date-range queries and full-table loads per user.
--
-- 2. notes(user_id, updated_at) — composite index for sync polling's hash
--    comparison, which sorts notes by updated_at.
--
-- 3. goals(user_id, created_at) — composite index for load order consistency.

-- ── 1. Composite index on marks for user data loads ──
-- The loadAllUserData RPC loads all marks for a user. With only a single-column
-- user_id index, Postgres must filter date_key after the index scan. This
-- composite index covers both columns so the query planner can use an
-- index-only scan, reducing IO at scale (10K+ users, millions of marks).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marks_user_date
  ON public.marks (user_id, date_key);

-- ── 2. Composite index on notes for sync ordering ──
-- The sync data hash (computeDataHash) sorts notes by updated_at during
-- comparison. This index supports that ordering efficiently.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_user_updated
  ON public.notes (user_id, updated_at DESC);

-- ── 3. Composite index on goals for consistent load order ──
-- Goals are loaded ordered by created_at. Composite index enables index-only
-- scans rather than sorting after a seq scan.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_user_created
  ON public.goals (user_id, created_at);
