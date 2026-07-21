-- ============================================================================
-- Growly — Migration 011: Economy Bonuses Table
-- ============================================================================
-- Adds a separate `economy_bonuses` table for per-day engagement rewards
-- (check-in, quest, spin, level-up, streak milestone). Each bonus is a row
-- with a UNIQUE constraint on (user_id, type, date_key), preventing
-- multi-device offline duplicate rewards.
-- ============================================================================

CREATE TABLE IF NOT EXISTS economy_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date_key TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_bonus_per_day UNIQUE (user_id, type, date_key)
);

-- RLS: users can only see/manage their own bonuses
ALTER TABLE economy_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bonuses"
  ON economy_bonuses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bonuses"
  ON economy_bonuses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bonuses"
  ON economy_bonuses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bonuses"
  ON economy_bonuses FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypasses RLS
CREATE POLICY "Service role can manage all bonuses"
  ON economy_bonuses FOR ALL
  USING (true)
  WITH CHECK (true);

-- Composite index for the common load pattern: .eq("user_id", userId)
CREATE INDEX IF NOT EXISTS idx_economy_bonuses_user
  ON economy_bonuses(user_id, date_key DESC);

ANALYZE economy_bonuses;
