-- ============================================================================
-- project_101 — Initial Schema
-- Tables, Row-Level Security, and indexes for the habit tracker.
-- Apply via Supabase Dashboard SQL editor or `supabase migration up`.
-- ============================================================================

-- #########################################################
--  HABITS
-- #########################################################
CREATE TABLE habits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  repeat_days INTEGER[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Richer scheduling (optional)
  recurrence  JSONB,
  start_date  DATE,
  time_of_day TEXT,
  priority    TEXT CHECK (priority IN ('low','med','high')),
  archived    BOOLEAN NOT NULL DEFAULT FALSE,
  reminder    JSONB
);

CREATE INDEX idx_habits_user_id ON habits(user_id);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own habits"
  ON habits
  USING (user_id = auth.uid());

-- #########################################################
--  MARKS  (date_key + habit_id + status)
-- #########################################################
CREATE TABLE marks (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key  DATE NOT NULL,
  habit_id  UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  status    TEXT NOT NULL CHECK (status IN ('done','missed','skipped')),

  UNIQUE(user_id, date_key, habit_id)
);

CREATE INDEX idx_marks_user_id ON marks(user_id);
CREATE INDEX idx_marks_habit_id ON marks(habit_id);
CREATE INDEX idx_marks_date_key ON marks(date_key);

ALTER TABLE marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own marks"
  ON marks
  USING (user_id = auth.uid());

-- #########################################################
--  NOTES
-- #########################################################
CREATE TABLE notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  body       TEXT NOT NULL,
  tags       TEXT[] NOT NULL DEFAULT '{}',
  links      JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_notes_user_id ON notes(user_id);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notes"
  ON notes
  USING (user_id = auth.uid());

-- #########################################################
--  GOALS
-- #########################################################
CREATE TABLE goals (
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

CREATE INDEX idx_goals_user_id ON goals(user_id);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals"
  ON goals
  USING (user_id = auth.uid());

-- #########################################################
--  USER SETTINGS  (single row per user)
-- #########################################################
CREATE TABLE user_settings (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_mode         TEXT NOT NULL DEFAULT 'dark' CHECK (theme_mode IN ('light','dark','system')),
  theme_accent       TEXT NOT NULL DEFAULT 'blue',
  grace_hours        INTEGER NOT NULL DEFAULT 5 CHECK (grace_hours >= 0 AND grace_hours <= 24),
  used_template_ids  TEXT[] NOT NULL DEFAULT '{}',
  widget_order       TEXT[],
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  custom_categories  TEXT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
  ON user_settings
  USING (user_id = auth.uid());

-- #########################################################
--  USER PROFILE  (single row per user)
-- #########################################################
CREATE TABLE user_profile (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      TEXT NOT NULL,
  username          TEXT NOT NULL,
  bio               TEXT,
  motto             TEXT,
  avatar            TEXT,
  banner            TEXT,
  showcase_badge_id TEXT
);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile"
  ON user_profile
  USING (user_id = auth.uid());

-- #########################################################
--  UNLOCKS  (achievement unlocks)
-- #########################################################
CREATE TABLE unlocks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen           BOOLEAN NOT NULL DEFAULT FALSE,

  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_unlocks_user_id ON unlocks(user_id);

ALTER TABLE unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own unlocks"
  ON unlocks
  USING (user_id = auth.uid());

-- #########################################################
--  ECONOMY STATE  (single row per user)
-- #########################################################
CREATE TABLE economy_state (
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

ALTER TABLE economy_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own economy state"
  ON economy_state
  USING (user_id = auth.uid());

-- #########################################################
--  ECONOMY SPENT  (append-only spend ledger)
-- #########################################################
CREATE TABLE economy_spent (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount   INTEGER NOT NULL CHECK (amount > 0),
  item     TEXT NOT NULL
);

CREATE INDEX idx_economy_spent_user_id ON economy_spent(user_id);

ALTER TABLE economy_spent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own economy spent"
  ON economy_spent
  USING (user_id = auth.uid());

-- #########################################################
--  ECONOMY FREEZES  (streak-freeze log)
-- #########################################################
CREATE TABLE economy_freezes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  date      DATE NOT NULL,
  habit_id  UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE
);

CREATE INDEX idx_economy_freezes_user_id ON economy_freezes(user_id);

ALTER TABLE economy_freezes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own economy freezes"
  ON economy_freezes
  USING (user_id = auth.uid());

-- #########################################################
--  PROGRESS SEEN  (celebration seen-markers, single row)
-- #########################################################
CREATE TABLE progress_seen (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seeded        BOOLEAN NOT NULL DEFAULT FALSE,
  level         INTEGER NOT NULL DEFAULT 1,
  title         TEXT NOT NULL DEFAULT 'Habit Newbie',
  shop          TEXT[] NOT NULL DEFAULT '{}',
  streaks       JSONB NOT NULL DEFAULT '{}',
  tier_unlocks  TEXT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE progress_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own progress seen"
  ON progress_seen
  USING (user_id = auth.uid());

-- #########################################################
--  HELPER: seed default rows for a new user
--  Called after registration to ensure every user has the
--  single-row tables populated.
-- #########################################################
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);

  INSERT INTO public.user_profile (user_id, display_name, username)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
    );

  INSERT INTO public.economy_state (user_id)
    VALUES (NEW.id);

  INSERT INTO public.progress_seen (user_id)
    VALUES (NEW.id);

  INSERT INTO public.user_stats_snapshots (user_id)
    VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- Trigger fires on every new sign-up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
