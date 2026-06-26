-- ============================================================================
-- project_101 — Friends & Suggestions Schema
-- Tables for the social system and in-app feedback.
-- ============================================================================

-- #########################################################
--  FRIENDS  (bidirectional connections with request flow)
-- #########################################################
CREATE TABLE friends (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each pair only appears once (regardless of direction)
  UNIQUE(requester, addressee)
);

CREATE INDEX idx_friends_requester ON friends(requester);
CREATE INDEX idx_friends_addressee ON friends(addressee);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friends"
  ON friends FOR SELECT
  USING (requester = auth.uid() OR addressee = auth.uid());

CREATE POLICY "Users can send friend requests"
  ON friends FOR INSERT
  WITH CHECK (requester = auth.uid());

CREATE POLICY "Users can respond to friend requests"
  ON friends FOR UPDATE
  USING (addressee = auth.uid());

CREATE POLICY "Users can delete their own friend entries"
  ON friends FOR DELETE
  USING (requester = auth.uid() OR addressee = auth.uid());

-- #########################################################
--  PUBLIC USER PROFILES VIEW (for friend lookup/search)
-- #########################################################
CREATE VIEW public_profiles AS
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

-- #########################################################
--  SUGGESTIONS / FEEDBACK
-- #########################################################
CREATE TABLE suggestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general','bug','feature','improvement','other')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','acknowledged','completed','declined'))
);

CREATE INDEX idx_suggestions_user_id ON suggestions(user_id);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own suggestions"
  ON suggestions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create suggestions"
  ON suggestions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- #########################################################
--  USER STATS SNAPSHOT (for public profile display)
-- #########################################################
CREATE TABLE user_stats_snapshots (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  level               INTEGER NOT NULL DEFAULT 1,
  current_streak      INTEGER NOT NULL DEFAULT 0,
  best_streak         INTEGER NOT NULL DEFAULT 0,
  total_completions   INTEGER NOT NULL DEFAULT 0,
  consistency_14d     INTEGER NOT NULL DEFAULT 0,
  achievement_count   INTEGER NOT NULL DEFAULT 0,
  title_name          TEXT NOT NULL DEFAULT 'Habit Newbie',
  rank_icon           TEXT NOT NULL DEFAULT '⬡',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- #########################################################
--  NOTIFICATIONS  (friend requests, friend accepts, system)
-- #########################################################
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('friend_request','friend_accept','achievement','system')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  from_user   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  link        TEXT NOT NULL DEFAULT '',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    -- Users can create notifications for themselves
    user_id = auth.uid() OR
    -- Or for system-level notifications
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can mark their own notifications as read"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());
