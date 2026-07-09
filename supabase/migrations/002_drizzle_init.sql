-- ============================================================================
-- Growly — Drizzle ORM Schema Migration
-- Idempotent: uses IF NOT EXISTS for tables, safe PL/pgSQL for constraints.
-- Tables/constraints that already exist from 001_schema.sql are skipped.
-- ============================================================================

-- ############################################################################
--  HABITS
-- ############################################################################
CREATE TABLE IF NOT EXISTS habits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  repeat_days INTEGER[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  recurrence  JSONB,
  start_date  DATE,
  time_of_day TEXT,
  priority    TEXT,
  archived    BOOLEAN NOT NULL DEFAULT FALSE,
  reminder    JSONB
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_priority_check') THEN
    ALTER TABLE habits ADD CONSTRAINT habits_priority_check CHECK (priority IN ('low','med','high'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);

-- ############################################################################
--  MARKS
-- ############################################################################
CREATE TABLE IF NOT EXISTS marks (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key  DATE NOT NULL,
  habit_id  UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  status    TEXT NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marks_status_check') THEN
    ALTER TABLE marks ADD CONSTRAINT marks_status_check CHECK (status IN ('done','missed','skipped'));
  END IF;
END $$;

-- Only create the standalone unique index if 001's UNIQUE constraint (which
-- already backs it with an index) isn't present — avoids a duplicate unique
-- index on the hot marks table when running the canonical 001→005 sequence.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marks_user_id_date_key_habit_id_key') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS marks_user_date_habit_key ON marks(user_id, date_key, habit_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_marks_user_id ON marks(user_id);
CREATE INDEX IF NOT EXISTS idx_marks_habit_id ON marks(habit_id);
CREATE INDEX IF NOT EXISTS idx_marks_date_key ON marks(date_key);

-- ############################################################################
--  NOTES
-- ############################################################################
CREATE TABLE IF NOT EXISTS notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  body       TEXT NOT NULL,
  tags       TEXT[] NOT NULL DEFAULT '{}',
  links      JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

-- ############################################################################
--  GOALS
-- ############################################################################
CREATE TABLE IF NOT EXISTS goals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  target           INTEGER NOT NULL,
  current          INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  category         TEXT,
  deadline         DATE,
  linked_habit_ids UUID[] DEFAULT '{}',
  milestones       JSONB
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- ############################################################################
--  USER SETTINGS
-- ############################################################################
CREATE TABLE IF NOT EXISTS user_settings (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_mode          TEXT NOT NULL DEFAULT 'dark',
  theme_accent        TEXT NOT NULL DEFAULT 'blue',
  grace_hours         INTEGER NOT NULL DEFAULT 5,
  used_template_ids   TEXT[] NOT NULL DEFAULT '{}',
  widget_order        TEXT[],
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  custom_categories   TEXT[] NOT NULL DEFAULT '{}'
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_grace_hours_check') THEN
    ALTER TABLE user_settings ADD CONSTRAINT user_settings_grace_hours_check CHECK (grace_hours >= 0 AND grace_hours <= 24);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_theme_mode_check') THEN
    ALTER TABLE user_settings ADD CONSTRAINT user_settings_theme_mode_check CHECK (theme_mode IN ('light','dark','system'));
  END IF;
END $$;

-- ############################################################################
--  USER PROFILE
-- ############################################################################
CREATE TABLE IF NOT EXISTS user_profile (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      TEXT NOT NULL,
  username          TEXT NOT NULL,
  bio               TEXT,
  motto             TEXT,
  avatar            TEXT,
  banner            TEXT,
  showcase_badge_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS user_profile_username_key ON user_profile(username);
CREATE INDEX IF NOT EXISTS idx_user_profile_username ON user_profile(username);

-- ############################################################################
--  UNLOCKS
-- ############################################################################
CREATE TABLE IF NOT EXISTS unlocks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen           BOOLEAN NOT NULL DEFAULT FALSE
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unlocks_user_id_achievement_id_key') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS unlocks_user_achievement_key ON unlocks(user_id, achievement_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_unlocks_user_id ON unlocks(user_id);

-- ############################################################################
--  ECONOMY STATE
-- ############################################################################
CREATE TABLE IF NOT EXISTS economy_state (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  owned            TEXT[] NOT NULL DEFAULT '{}',
  equipped         JSONB NOT NULL DEFAULT '{}',
  bonus_coins      INTEGER NOT NULL DEFAULT 0,
  last_check_in    DATE,
  check_in_streak  INTEGER NOT NULL DEFAULT 0,
  last_quest_date  DATE,
  current_quest    JSONB,
  last_spin_date   DATE,
  last_spin_result JSONB
);

-- ############################################################################
--  ECONOMY SPENT
-- ############################################################################
CREATE TABLE IF NOT EXISTS economy_spent (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount   INTEGER NOT NULL,
  item     TEXT NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'economy_spent_amount_check') THEN
    ALTER TABLE economy_spent ADD CONSTRAINT economy_spent_amount_check CHECK (amount > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_economy_spent_user_id ON economy_spent(user_id);

-- ############################################################################
--  ECONOMY FREEZES
-- ############################################################################
CREATE TABLE IF NOT EXISTS economy_freezes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  date      DATE NOT NULL,
  habit_id  UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_economy_freezes_user_id ON economy_freezes(user_id);

-- ############################################################################
--  PROGRESS SEEN
-- ############################################################################
CREATE TABLE IF NOT EXISTS progress_seen (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seeded       BOOLEAN NOT NULL DEFAULT FALSE,
  level        INTEGER NOT NULL DEFAULT 1,
  title        TEXT NOT NULL DEFAULT 'Habit Newbie',
  shop         TEXT[] NOT NULL DEFAULT '{}',
  streaks      JSONB NOT NULL DEFAULT '{}',
  tier_unlocks TEXT[] NOT NULL DEFAULT '{}'
);

-- ############################################################################
--  FRIENDS
-- ############################################################################
CREATE TABLE IF NOT EXISTS friends (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friends_status_check') THEN
    ALTER TABLE friends ADD CONSTRAINT friends_status_check CHECK (status IN ('pending','accepted','blocked'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friends_requester_addressee_key') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS friends_pair_key ON friends(requester, addressee);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_friends_requester ON friends(requester);
CREATE INDEX IF NOT EXISTS idx_friends_addressee ON friends(addressee);
CREATE INDEX IF NOT EXISTS idx_friends_requester_status ON friends(requester, status);
CREATE INDEX IF NOT EXISTS idx_friends_addressee_status ON friends(addressee, status);

-- ############################################################################
--  SUGGESTIONS
-- ############################################################################
CREATE TABLE IF NOT EXISTS suggestions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status     TEXT NOT NULL DEFAULT 'new'
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suggestions_category_check') THEN
    ALTER TABLE suggestions ADD CONSTRAINT suggestions_category_check CHECK (category IN ('general','bug','feature','improvement','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suggestions_status_check') THEN
    ALTER TABLE suggestions ADD CONSTRAINT suggestions_status_check CHECK (status IN ('new','read','acknowledged','completed','declined'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON suggestions(created_at);

-- ############################################################################
--  USER STATS SNAPSHOTS
-- ############################################################################
CREATE TABLE IF NOT EXISTS user_stats_snapshots (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  level             INTEGER NOT NULL DEFAULT 1,
  current_streak    INTEGER NOT NULL DEFAULT 0,
  best_streak       INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,
  consistency_14d   INTEGER NOT NULL DEFAULT 0,
  achievement_count INTEGER NOT NULL DEFAULT 0,
  title_name        TEXT NOT NULL DEFAULT 'Habit Newbie',
  rank_icon         TEXT NOT NULL DEFAULT '⬡',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stats_level_desc ON user_stats_snapshots(level DESC);
CREATE INDEX IF NOT EXISTS idx_stats_streak_desc ON user_stats_snapshots(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_stats_consistency_desc ON user_stats_snapshots(consistency_14d DESC);
CREATE INDEX IF NOT EXISTS idx_stats_completions_desc ON user_stats_snapshots(total_completions DESC);

-- ############################################################################
--  NOTIFICATIONS
-- ############################################################################
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  from_user  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  link       TEXT NOT NULL DEFAULT '',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('friend_request','friend_accept','achievement','system'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
