-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 017 — Complete pending schema changes from 014 & 016
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Migration 014_scalability_indexes.sql could not be fully tracked via
-- supabase db push because both 014 files share version "014" and the
-- cleanup migration occupied the slot first. These indexes were already
-- created (the SQL executed), but the schema_migrations entry for them
-- was never recorded. This migration re-runs the CREATE INDEX statements
-- with IF NOT EXISTS so they're idempotent on the remote.
--
-- Migration 016 (sound/animation columns) was also never tracked in the
-- remote schema_migrations table. The ALTER TABLE is re-run here with
-- IF NOT EXISTS for idempotency.

-- ── Composite indexes for query performance (from 014_scalability_indexes) ──
CREATE INDEX IF NOT EXISTS idx_marks_user_date
  ON public.marks (user_id, date_key);

CREATE INDEX IF NOT EXISTS idx_notes_user_updated
  ON public.notes (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_goals_user_created
  ON public.goals (user_id, created_at);

-- ── Sound and animation preference columns (from 016_add_sound_settings) ──
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS sound_enabled    BOOLEAN,
  ADD COLUMN IF NOT EXISTS sound_volume     REAL CHECK (sound_volume >= 0 AND sound_volume <= 1),
  ADD COLUMN IF NOT EXISTS reduced_motion   BOOLEAN;
