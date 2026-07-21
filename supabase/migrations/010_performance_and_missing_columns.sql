-- ============================================================================
-- Growly — Migration 010: Performance Optimizations & Missing Columns
-- ============================================================================
-- Adds:
--  - deleted_at columns to habits, notes, goals (for soft-delete sync)
--  - Composite indexes for common query patterns (user_id + created_at)
--  - Composite indexes for marks user_id + date_key (daily query pattern)
-- ============================================================================


-- ############################################################################
--  SOFT-DELETE COLUMNS
--  The client code supports soft-delete with deleted_at timestamps, but the
--  original schema only had it on habits. Add it to all relevant tables.
-- ############################################################################

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;


-- ############################################################################
--  COMPOSITE INDEXES
--  Add (user_id, created_at) composite indexes for the common query pattern:
--    .eq("user_id", userId).order("created_at", ...)
--  These enable index-only scans and avoid sorting, improving query performance
--  as the number of users grows.
-- ############################################################################

CREATE INDEX IF NOT EXISTS idx_habits_user_created
  ON habits(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_notes_user_created
  ON notes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_goals_user_created
  ON goals(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_marks_user_date
  ON marks(user_id, date_key DESC);

CREATE INDEX IF NOT EXISTS idx_economy_spent_user_at
  ON economy_spent(user_id, at DESC);

CREATE INDEX IF NOT EXISTS idx_economy_freezes_user_date
  ON economy_freezes(user_id, date DESC);


-- ############################################################################
--  ANALYZE to update query planner statistics
-- ############################################################################

ANALYZE habits;
ANALYZE notes;
ANALYZE goals;
ANALYZE marks;
ANALYZE economy_spent;
ANALYZE economy_freezes;
