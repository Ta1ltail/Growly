-- ============================================================================
-- Growly — Full Schema (consolidated)
-- Single file covering all tables, RLS, indexes, functions, and cron.
-- Apply via Supabase Dashboard SQL editor or `supabase db reset`.
-- ============================================================================


-- ############################################################################
--  EXTENSIONS
-- ############################################################################

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


-- ############################################################################
--  HABITS
-- ############################################################################

CREATE TABLE habits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  repeat_days INTEGER[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
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


-- ############################################################################
--  MARKS
-- ############################################################################

CREATE TABLE marks (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key  DATE NOT NULL,
  habit_id  UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  status    TEXT NOT NULL CHECK (status IN ('done','missed','skipped')),

  UNIQUE(user_id, date_key, habit_id)
);

CREATE INDEX idx_marks_user_id  ON marks(user_id);
CREATE INDEX idx_marks_habit_id ON marks(habit_id);
CREATE INDEX idx_marks_date_key ON marks(date_key);

ALTER TABLE marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own marks"
  ON marks
  USING (user_id = auth.uid());


-- ############################################################################
--  NOTES
-- ############################################################################

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


-- ############################################################################
--  GOALS
-- ############################################################################

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


-- ############################################################################
--  USER SETTINGS  (single row per user)
-- ############################################################################

CREATE TABLE user_settings (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_mode          TEXT NOT NULL DEFAULT 'dark' CHECK (theme_mode IN ('light','dark','system')),
  theme_accent        TEXT NOT NULL DEFAULT 'blue',
  grace_hours         INTEGER NOT NULL DEFAULT 5 CHECK (grace_hours >= 0 AND grace_hours <= 24),
  used_template_ids   TEXT[] NOT NULL DEFAULT '{}',
  widget_order        TEXT[],
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  custom_categories   TEXT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
  ON user_settings
  USING (user_id = auth.uid());


-- ############################################################################
--  USER PROFILE  (single row per user)
-- ############################################################################

CREATE TABLE user_profile (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      TEXT NOT NULL,
  username          TEXT NOT NULL,
  bio               TEXT,
  motto             TEXT,
  avatar            TEXT,
  banner            TEXT,
  showcase_badge_id TEXT,

  CONSTRAINT user_profile_username_key UNIQUE (username)
);

-- Note: the user_profile_username_key UNIQUE constraint already creates an
-- index on username, so no separate idx_user_profile_username is needed.

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Users can manage their own profile"
  ON user_profile
  USING (user_id = auth.uid());

-- Any authenticated user can read any profile (needed for public profiles / friend lookup)
CREATE POLICY "Anyone can view profiles"
  ON user_profile FOR SELECT
  USING (true);


-- ############################################################################
--  UNLOCKS  (achievement unlocks)
-- ############################################################################

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

-- Any authenticated user can view achievements (needed for public profiles)
CREATE POLICY "Anyone can view achievements"
  ON unlocks FOR SELECT
  USING (true);


-- ############################################################################
--  ECONOMY STATE  (single row per user)
-- ############################################################################

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


-- ############################################################################
--  ECONOMY SPENT  (spend ledger)
-- ############################################################################

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


-- ############################################################################
--  ECONOMY FREEZES  (streak-freeze log)
-- ############################################################################

CREATE TABLE economy_freezes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  date      DATE NOT NULL,
  habit_id  UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE
);

CREATE INDEX idx_economy_freezes_user_id ON economy_freezes(user_id);
-- Index the FK so deleting a habit doesn't seq-scan freezes for the cascade.
CREATE INDEX idx_economy_freezes_habit_id ON economy_freezes(habit_id);

ALTER TABLE economy_freezes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own economy freezes"
  ON economy_freezes
  USING (user_id = auth.uid());


-- ############################################################################
--  PROGRESS SEEN  (celebration seen-markers, single row per user)
-- ############################################################################

CREATE TABLE progress_seen (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seeded       BOOLEAN NOT NULL DEFAULT FALSE,
  level        INTEGER NOT NULL DEFAULT 1,
  title        TEXT NOT NULL DEFAULT 'Habit Newbie',
  shop         TEXT[] NOT NULL DEFAULT '{}',
  streaks      JSONB NOT NULL DEFAULT '{}',
  tier_unlocks TEXT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE progress_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own progress seen"
  ON progress_seen
  USING (user_id = auth.uid());


-- ############################################################################
--  FRIENDS  (bidirectional connections with request flow)
-- ############################################################################

CREATE TABLE friends (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(requester, addressee)
);

CREATE INDEX idx_friends_requester        ON friends(requester);
CREATE INDEX idx_friends_addressee        ON friends(addressee);
CREATE INDEX idx_friends_requester_status ON friends(requester, status);
CREATE INDEX idx_friends_addressee_status ON friends(addressee, status);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friends"
  ON friends FOR SELECT
  USING (requester = auth.uid() OR addressee = auth.uid());

CREATE POLICY "Users can send friend requests"
  ON friends FOR INSERT
  WITH CHECK (requester = auth.uid());

-- Only the addressee may update (to accept/decline), and WITH CHECK keeps the
-- row anchored to them afterward so they can't reassign requester/addressee.
CREATE POLICY "Users can respond to friend requests"
  ON friends FOR UPDATE
  USING (addressee = auth.uid())
  WITH CHECK (addressee = auth.uid());

CREATE POLICY "Users can delete their own friend entries"
  ON friends FOR DELETE
  USING (requester = auth.uid() OR addressee = auth.uid());


-- ############################################################################
--  SUGGESTIONS / FEEDBACK
-- ############################################################################

CREATE TABLE suggestions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general','bug','feature','improvement','other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','acknowledged','completed','declined'))
);

CREATE INDEX idx_suggestions_user_id      ON suggestions(user_id);
CREATE INDEX idx_suggestions_created_at   ON suggestions(created_at DESC);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own suggestions"
  ON suggestions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create suggestions"
  ON suggestions FOR INSERT
  WITH CHECK (user_id = auth.uid());


-- ############################################################################
--  USER STATS SNAPSHOTS  (public profile display + leaderboard)
-- ############################################################################

CREATE TABLE user_stats_snapshots (
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

-- Simple descending indexes for leaderboard ORDER BY
CREATE INDEX idx_stats_level_desc       ON user_stats_snapshots(level DESC);
CREATE INDEX idx_stats_streak_desc      ON user_stats_snapshots(current_streak DESC);
CREATE INDEX idx_stats_consistency_desc ON user_stats_snapshots(consistency_14d DESC);
CREATE INDEX idx_stats_completions_desc ON user_stats_snapshots(total_completions DESC);

-- Covering indexes for index-only scans on leaderboard queries
CREATE INDEX idx_stats_level_cover
  ON user_stats_snapshots (level DESC)
  INCLUDE (user_id, current_streak, best_streak, total_completions,
           consistency_14d, achievement_count, title_name, rank_icon);

CREATE INDEX idx_stats_streak_cover
  ON user_stats_snapshots (current_streak DESC)
  INCLUDE (user_id, level, best_streak, total_completions,
           consistency_14d, achievement_count, title_name, rank_icon);

CREATE INDEX idx_stats_consistency_cover
  ON user_stats_snapshots (consistency_14d DESC)
  INCLUDE (user_id, level, current_streak, best_streak,
           total_completions, achievement_count, title_name, rank_icon);

CREATE INDEX idx_stats_completions_cover
  ON user_stats_snapshots (total_completions DESC)
  INCLUDE (user_id, level, current_streak, best_streak,
           consistency_14d, achievement_count, title_name, rank_icon);

ALTER TABLE user_stats_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public stats"
  ON user_stats_snapshots FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own stats"
  ON user_stats_snapshots FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stats"
  ON user_stats_snapshots FOR UPDATE
  USING (user_id = auth.uid());


-- ############################################################################
--  NOTIFICATIONS
-- ############################################################################

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('friend_request','friend_accept','achievement','system')),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  from_user  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  link       TEXT NOT NULL DEFAULT '',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX idx_notifications_unread     ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- A user may create a notification addressed to anyone (needed to notify other
-- users, e.g. friend request / accept) but only when they stamp themselves as
-- the sender, so `from_user` cannot be forged to impersonate someone else.
-- Sender-less notifications (system / achievement / dev seed) are allowed only
-- for the caller's own inbox. Prevents notification spoofing and spam to others.
CREATE POLICY "Users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    from_user = auth.uid()
    OR (from_user IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Users can mark their own notifications as read"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- Add to Realtime publication so the useNotifications hook works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;


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


-- ############################################################################
--  VIEWS
-- ############################################################################

-- Public profiles view — runs with the querying user's privileges
-- (security_invoker) so it enforces user_profile's RLS instead of bypassing it
-- as the view owner. Only the authenticated role may read it; unauthenticated
-- clients can no longer enumerate every profile's name/bio/avatar. Anon username
-- availability during registration goes through username_exists() below instead.
CREATE VIEW public_profiles
WITH (security_invoker = true) AS
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

-- Username availability check for the registration screen (runs before auth).
-- SECURITY DEFINER so anon can call it without any table read grant, but it
-- returns only a boolean — never any profile data — so it can't be used to
-- enumerate profiles. Case-insensitive to match the app's lowercased usernames.
CREATE OR REPLACE FUNCTION public.username_exists(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profile
    WHERE lower(username) = lower(p_username)
  );
$$;


-- ############################################################################
--  TABLE-LEVEL GRANTS
--  RLS controls row access; these grants allow the authenticated role to
--  attempt queries in the first place.
-- ############################################################################

GRANT ALL ON TABLE habits                 TO authenticated;
GRANT ALL ON TABLE marks                  TO authenticated;
GRANT ALL ON TABLE notes                  TO authenticated;
GRANT ALL ON TABLE goals                  TO authenticated;
GRANT ALL ON TABLE unlocks                TO authenticated;
GRANT ALL ON TABLE user_settings          TO authenticated;
GRANT ALL ON TABLE user_profile           TO authenticated;
GRANT ALL ON TABLE economy_state          TO authenticated;
GRANT ALL ON TABLE progress_seen          TO authenticated;
GRANT ALL ON TABLE economy_spent          TO authenticated;
GRANT ALL ON TABLE economy_freezes        TO authenticated;
GRANT ALL ON TABLE friends                TO authenticated;
GRANT ALL ON TABLE notifications          TO authenticated;
GRANT ALL ON TABLE suggestions            TO authenticated;
GRANT ALL ON TABLE user_stats_snapshots   TO authenticated;

-- Views need their own grant — table grants don't carry over. Authenticated
-- only: anon uses username_exists() for the one thing it needs pre-auth, so it
-- has no way to read profile rows in bulk.
GRANT SELECT ON public_profiles TO authenticated;

-- Anon (and authenticated) may call the username availability check; it exposes
-- only a boolean. PUBLIC's default EXECUTE is fine here since the function is
-- deliberately non-enumerating.
GRANT EXECUTE ON FUNCTION public.username_exists(TEXT) TO anon, authenticated;


-- ############################################################################
--  NEW USER TRIGGER
--  Seeds all single-row-per-user tables on sign-up.
--  Uses the submitted username directly (or email prefix as fallback).
--  If the username is taken, appends a random suffix to make it unique.
--  display_name starts as the username; user can change it later in onboarding.
-- ############################################################################

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  base_username  TEXT;
  final_username TEXT;
  display_name   TEXT;
BEGIN
  -- Use the submitted username from registration metadata, or email prefix
  base_username := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'username'), ''),
    split_part(NEW.email, '@', 1)
  );

  -- Lowercase, strip non-alphanumeric, truncate to 20 chars
  base_username := left(regexp_replace(lower(base_username), '[^a-z0-9]', '', 'g'), 20);
  IF length(base_username) < 2 THEN
    base_username := 'user';
  END IF;

  -- Use the submitted display_name (or fall back to username/email prefix)
  display_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''),
    NEW.raw_user_meta_data ->> 'username',
    split_part(NEW.email, '@', 1)
  );

  -- Append random suffix until the username is unique
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.user_profile WHERE username = final_username) LOOP
    final_username := base_username || '_' || substring(md5(random()::text) from 1 for 6);
  END LOOP;

  INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);

  INSERT INTO public.user_profile (user_id, display_name, username)
    VALUES (NEW.id, display_name, final_username);

  INSERT INTO public.economy_state (user_id)
    VALUES (NEW.id);

  INSERT INTO public.progress_seen (user_id)
    VALUES (NEW.id);

  INSERT INTO public.user_stats_snapshots (user_id)
    VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ############################################################################
--  CRON: refresh stale user_stats_snapshots daily at 03:00 UTC
-- ############################################################################

CREATE OR REPLACE FUNCTION public.refresh_user_stats(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total_completions INT;
  v_achievement_count INT;
  v_consistency_14d   INT;
  v_current_streak    INT;
  v_best_streak       INT;
  v_level             INT;
  v_title             TEXT;
  v_rank_icon         TEXT;
BEGIN
  SELECT COUNT(*)::INT INTO v_total_completions
  FROM public.marks
  WHERE user_id = p_user_id AND status = 'done';

  SELECT COUNT(*)::INT INTO v_achievement_count
  FROM public.unlocks
  WHERE user_id = p_user_id;

  SELECT COUNT(DISTINCT date_key)::INT INTO v_consistency_14d
  FROM public.marks
  WHERE user_id = p_user_id
    AND status = 'done'
    AND date_key >= (now() - INTERVAL '13 days')::date;

  v_consistency_14d := LEAST(100, GREATEST(0, (v_consistency_14d * 100) / 14));

  -- Current streak: consecutive days with ≥1 done mark, walking back from yesterday.
  -- Freezes are excluded in this server-side approximation; corrected on next client sync.
  WITH RECURSIVE streak AS (
    SELECT (now()::date - INTERVAL '1 day')::date AS d
    WHERE EXISTS (
      SELECT 1 FROM public.marks
      WHERE user_id = p_user_id AND status = 'done'
        AND date_key = (now()::date - INTERVAL '1 day')::date
    )
    UNION ALL
    SELECT (s.d - INTERVAL '1 day')::date
    FROM streak s
    WHERE EXISTS (
      SELECT 1 FROM public.marks
      WHERE user_id = p_user_id AND status = 'done'
        AND date_key = (s.d - INTERVAL '1 day')::date
    )
  )
  SELECT COUNT(*)::INT INTO v_current_streak FROM streak WHERE d IS NOT NULL;

  -- Best streak: longest consecutive run of days with ≥1 done mark
  WITH daily AS (
    SELECT DISTINCT date_key
    FROM public.marks
    WHERE user_id = p_user_id AND status = 'done'
  ),
  grouped AS (
    SELECT date_key,
           date_key - (ROW_NUMBER() OVER (ORDER BY date_key))::INT AS grp
    FROM daily
  )
  SELECT COALESCE(MAX(cnt), 0)::INT INTO v_best_streak
  FROM (SELECT COUNT(*) AS cnt FROM grouped GROUP BY grp) g;

  SELECT COALESCE(p.level, 1), COALESCE(p.title, 'Habit Newbie')
  INTO v_level, v_title
  FROM public.progress_seen p
  WHERE p.user_id = p_user_id;

  v_rank_icon := CASE
    WHEN v_level >= 50 THEN '✦'
    WHEN v_level >= 30 THEN '◆'
    WHEN v_level >= 20 THEN '⬟'
    WHEN v_level >= 10 THEN '⬢'
    ELSE '⬡'
  END;

  INSERT INTO public.user_stats_snapshots (
    user_id, level, current_streak, best_streak,
    total_completions, consistency_14d, achievement_count,
    title_name, rank_icon, updated_at
  ) VALUES (
    p_user_id, v_level, v_current_streak, v_best_streak,
    v_total_completions, v_consistency_14d, v_achievement_count,
    v_title, v_rank_icon, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    level             = EXCLUDED.level,
    current_streak    = EXCLUDED.current_streak,
    best_streak       = EXCLUDED.best_streak,
    total_completions = EXCLUDED.total_completions,
    consistency_14d   = EXCLUDED.consistency_14d,
    achievement_count = EXCLUDED.achievement_count,
    title_name        = EXCLUDED.title_name,
    rank_icon         = EXCLUDED.rank_icon,
    updated_at        = EXCLUDED.updated_at;
END;
$$;


CREATE OR REPLACE FUNCTION public.refresh_stale_snapshots()
RETURNS TABLE(refreshed INT, total INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user      RECORD;
  v_refreshed INT := 0;
  v_total     INT := 0;
BEGIN
  FOR v_user IN
    SELECT user_id
    FROM public.user_stats_snapshots
    WHERE updated_at < now() - INTERVAL '24 hours'
    LIMIT 500
  LOOP
    v_total := v_total + 1;
    BEGIN
      PERFORM public.refresh_user_stats(v_user.user_id);
      v_refreshed := v_refreshed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'refresh_user_stats failed for %: %', v_user.user_id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_refreshed, v_total;
END;
$$;

-- These are SECURITY DEFINER maintenance functions meant to run only from the
-- pg_cron job (as the table owner). Postgres grants EXECUTE to PUBLIC by
-- default, which would let any client force-refresh arbitrary users' snapshots
-- or trigger the 500-row loop on demand — revoke that so only the owner/cron
-- can invoke them.
REVOKE ALL ON FUNCTION public.refresh_user_stats(UUID)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_stale_snapshots()    FROM PUBLIC, anon, authenticated;


SELECT cron.schedule(
  'refresh-stale-snapshots',
  '0 3 * * *',
  $$ SELECT public.refresh_stale_snapshots(); $$
);

-- Seed initial snapshots immediately
SELECT public.refresh_stale_snapshots();


-- ############################################################################
--  ANALYZE  (help query planner use the new indexes right away)
-- ############################################################################

ANALYZE public.user_profile;
ANALYZE public.user_stats_snapshots;
ANALYZE public.friends;
ANALYZE public.suggestions;
ANALYZE public.notifications;