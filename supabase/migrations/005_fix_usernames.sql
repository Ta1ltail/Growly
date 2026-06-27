-- ============================================================================
-- project_101 — Fix Username Uniqueness
--
-- The original trigger set username = display_name for every new user. Two
-- users with the same display name got identical usernames, causing profile
-- link collisions and broken routing.
--
-- Fix: Add a UNIQUE constraint on user_profile.username and update the
-- handle_new_user() trigger to generate a random 6-char suffix when the
-- display-name-based username is taken.
-- ============================================================================

-- ── Deduplicate existing usernames first ──
-- Any duplicate usernames get a random suffix so the UNIQUE constraint
-- can be added without errors.
UPDATE user_profile p1
SET username = p1.username || '_' || substring(md5(random()::text) from 1 for 6)
WHERE p1.user_id NOT IN (
  SELECT MIN(p2.user_id::text)::uuid FROM user_profile p2
  GROUP BY p2.username
);

-- Add unique constraint on username
ALTER TABLE user_profile ADD CONSTRAINT user_profile_username_key UNIQUE (username);

-- Update the trigger function to generate unique usernames
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  -- Base username from display_name or email prefix
  base_username := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    split_part(NEW.email, '@', 1)
  );

  -- Strip non-alphanumeric, lowercase, truncate to 20 chars
  base_username := regexp_replace(lower(base_username), '[^a-z0-9]', '', 'g');
  IF length(base_username) < 2 THEN
    base_username := 'user';
  END IF;
  base_username := left(base_username, 20);

  -- Try base username first; if taken, append random suffix
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.user_profile WHERE username = final_username) LOOP
    final_username := base_username || '_' || substring(md5(random()::text) from 1 for 6);
  END LOOP;

  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);

  INSERT INTO public.user_profile (user_id, display_name, username)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
      final_username
    );

  INSERT INTO public.economy_state (user_id) VALUES (NEW.id);

  INSERT INTO public.progress_seen (user_id) VALUES (NEW.id);

  INSERT INTO public.user_stats_snapshots (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;
