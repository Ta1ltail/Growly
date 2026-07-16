-- Enable pgcrypto extension (needed for crypt() and gen_salt())
-- Explicit schema matches Supabase convention and the pattern in 001_schema.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================================
-- Seed 50 test users with complete data for development & testing.
-- Each user gets:
--   - Auth account (email/password = userN@example.com / test123456)
--   - Auth identity record (so login works)
--   - User settings, profile, economy state, progress seen
--   - 6-8 habits with 30 days of marks
--   - 3-5 notes
--   - 2-3 goals
--   - Some achievement unlocks
--   - Economy spend entries + freezes
--   - 2-3 suggestions
--   - 3-5 notifications
-- ============================================================================

DO $$
DECLARE
  v_user_id uuid;
  v_habit_id uuid;
  v_habit_ids uuid[] := '{}';
  v_h int;
  v_n int;
  v_g int;
  v_s int;
  v_notif int;
  v_day_offset int;
  v_mark_status text;
  v_pw_hash text;
  v_cat text;
  v_zero_uuid uuid := '00000000-0000-0000-0000-000000000000';
  v_cat_list text[] := ARRAY['Workout','Health','Studies','Work','Hobbies','Lifestyle','Personal','Finance','Chores'];
  v_habit_names text[] := ARRAY[
    'Morning run','Drink water','Meditate','Read 30 min','Study session',
    'Inbox zero','Exercise','Walk 10k steps','Stretching','Write journal',
    'Practice coding','No sugar','Sleep by 11pm','Review goals','Plan tomorrow',
    'Take vitamins','Deep breathing','Learn language','Read news','Clean workspace'
  ];
  v_habit_cats int[] := ARRAY[1,2,2,5,3,4,1,2,2,5,3,2,2,4,4,2,2,3,4,6];
  v_note_texts text[] := ARRAY[
    'Had a productive morning. Completed all my habits before 9am.',
    'Read an interesting article about neural plasticity and habit formation.',
    'Studied for 2 hours today. Making good progress on the course.',
    'Drank 8 glasses of water and feeling great.',
    'Meditated for 15 minutes. Stress levels are down.',
    'Cleared all emails and organized my task list.',
    'Went for a 5km run. New personal best!',
    'Practiced coding for an hour. Building a new feature.',
    'Called a friend to catch up. Great conversation.',
    'Reviewed and adjusted my monthly goals.',
    'Tried a new healthy recipe for dinner. Turned out great.',
    'Read 30 pages of my current book. Building a good reading habit.',
    'Did morning yoga for 20 minutes. Flexibility is improving.',
    'Organized my desk and planned the week ahead.',
    'Learned 20 new vocabulary words in Spanish.',
    'Went to bed on time last night. Feel well rested.',
    'Completed a challenging workout today.',
    'Wrote in my journal for 10 minutes.',
    'Helped a colleague with a project at work.',
    'Tracked all expenses for the week.'
  ];
  v_goal_titles text[] := ARRAY[
    'Run 100km this month',
    'Read 12 books this year',
    'Complete coding course',
    'Save $500 this quarter',
    'Meditate 30 days straight',
    'Write 50 journal entries',
    'Exercise 5 times per week',
    'Learn 500 new words',
    'Finish 12 art pieces',
    'Complete marathon training'
  ];
  v_goal_cats int[] := ARRAY[1,5,3,8,2,5,1,3,5,1];
  v_sug_texts text[] := ARRAY[
    'Would love a dark mode toggle for the dashboard.',
    'An export to CSV feature would be very helpful.',
    'The app could use more achievement types.',
    'Syncing between devices could be more seamless.',
    'A mobile app would be amazing.',
    'Pre-built habit templates would help new users.',
    'Calendar heatmap would help visualize progress.',
    'Desktop notifications for habit reminders would be great.',
    'More detailed statistics and charts on the stats page.',
    'Ability to share habits with friends for accountability.'
  ];
  v_notif_types text[] := ARRAY['achievement','system','friend_request','friend_accept'];
  v_notif_titles text[] := ARRAY['Achievement unlocked!','Welcome!','Friend request','Friend accepted'];
  v_notif_bodies text[] := ARRAY[
    'You earned a new achievement for your consistency!',
    'Welcome to the app! Start tracking your habits today.',
    'A user wants to connect with you.',
    'Your friend request was accepted!'
  ];
BEGIN
  -- Generate bcrypt password hash once
  v_pw_hash := extensions.crypt('test123456', extensions.gen_salt('bf'));

  FOR i IN 1..50 LOOP
    -- Idempotency guard: if this seed user already exists, skip the whole
    -- iteration. Without this, re-running the migration fails on auth.users'
    -- unique email index (and would otherwise insert duplicate child rows under
    -- fresh random UUIDs). Makes the seed safe to re-run against an existing DB.
    IF EXISTS (
      SELECT 1 FROM auth.users WHERE email = 'user' || i || '@example.com'
    ) THEN
      CONTINUE;
    END IF;

    v_user_id := gen_random_uuid();

    -- ── 1. auth.users ──
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token,
      is_sso_user, is_anonymous
    ) VALUES (
      v_zero_uuid,
      v_user_id,
      'authenticated',
      'authenticated',
      'user' || i || '@example.com',
      v_pw_hash,
      now() - interval '60 days',
      now() - interval '60 days',
      '{"provider":"email"}',
      jsonb_build_object(
        'display_name',
        CASE (i % 50)
          WHEN 0 THEN 'Alice Johnson'     WHEN 1 THEN 'Bob Smith'
          WHEN 2 THEN 'Charlie Brown'     WHEN 3 THEN 'Diana Ross'
          WHEN 4 THEN 'Evan Williams'     WHEN 5 THEN 'Fiona Davis'
          WHEN 6 THEN 'George Miller'     WHEN 7 THEN 'Hannah Wilson'
          WHEN 8 THEN 'Ian Taylor'        WHEN 9 THEN 'Julia Anderson'
          WHEN 10 THEN 'Kevin Thomas'     WHEN 11 THEN 'Laura Jackson'
          WHEN 12 THEN 'Mike White'       WHEN 13 THEN 'Nina Harris'
          WHEN 14 THEN 'Oscar Martin'     WHEN 15 THEN 'Patricia Lee'
          WHEN 16 THEN 'Quinn Clark'      WHEN 17 THEN 'Rachel Lewis'
          WHEN 18 THEN 'Sam Walker'       WHEN 19 THEN 'Tina Hall'
          WHEN 20 THEN 'Uma Patel'        WHEN 21 THEN 'Victor Cruz'
          WHEN 22 THEN 'Wendy Chen'        WHEN 23 THEN 'Xander Reed'
          WHEN 24 THEN 'Yara Ahmed'        WHEN 25 THEN 'Zack Brooks'
          WHEN 26 THEN 'Amber Singh'       WHEN 27 THEN 'Blake Torres'
          WHEN 28 THEN 'Chloe Kim'         WHEN 29 THEN 'Diego Rivera'
          WHEN 30 THEN 'Elena Novak'       WHEN 31 THEN 'Felix Wong'
          WHEN 32 THEN 'Grace Murphy'      WHEN 33 THEN 'Henry Park'
          WHEN 34 THEN 'Ivy Cooper'        WHEN 35 THEN 'Jake Sullivan'
          WHEN 36 THEN 'Kira Yamamoto'     WHEN 37 THEN 'Liam O''Brien'
          WHEN 38 THEN 'Maya Patel'        WHEN 39 THEN 'Noah Kim'
          WHEN 40 THEN 'Olga Petrov'       WHEN 41 THEN 'Paul Martin'
          WHEN 42 THEN 'Quinn Hughes'      WHEN 43 THEN 'Rosa Silva'
          WHEN 44 THEN 'Sean O''Connor'    WHEN 45 THEN 'Tara Singh'
          WHEN 46 THEN 'Ugo Nwosu'         WHEN 47 THEN 'Vera Kosova'
          WHEN 48 THEN 'Will Turner'       ELSE 'Zara Patel'
        END
      ),
      now() - interval '60 days',
      now(),
      '',
      false,
      false
    );

    -- ── 2. auth.identities (required for login) ──
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', 'user' || i || '@example.com'
      ),
      'email',
      'user' || i || '@example.com',
      now() - interval '1 day',
      now() - interval '60 days',
      now()
    );

    -- ── 3. user_profile (single row, trigger may already have created it) ──
    -- Each user gets a random avatar and banner from the preset lists to give
    -- every seed profile a distinct, colourful look from the start.
    INSERT INTO user_profile (
      user_id, display_name, username, bio, motto, avatar, banner
    ) VALUES (
      v_user_id,
      CASE (i % 50)
          WHEN 0 THEN 'Alice Johnson'     WHEN 1 THEN 'Bob Smith'
          WHEN 2 THEN 'Charlie Brown'     WHEN 3 THEN 'Diana Ross'
          WHEN 4 THEN 'Evan Williams'     WHEN 5 THEN 'Fiona Davis'
          WHEN 6 THEN 'George Miller'     WHEN 7 THEN 'Hannah Wilson'
          WHEN 8 THEN 'Ian Taylor'        WHEN 9 THEN 'Julia Anderson'
          WHEN 10 THEN 'Kevin Thomas'     WHEN 11 THEN 'Laura Jackson'
          WHEN 12 THEN 'Mike White'       WHEN 13 THEN 'Nina Harris'
          WHEN 14 THEN 'Oscar Martin'     WHEN 15 THEN 'Patricia Lee'
          WHEN 16 THEN 'Quinn Clark'      WHEN 17 THEN 'Rachel Lewis'
          WHEN 18 THEN 'Sam Walker'       WHEN 19 THEN 'Tina Hall'
          WHEN 20 THEN 'Uma Patel'        WHEN 21 THEN 'Victor Cruz'
          WHEN 22 THEN 'Wendy Chen'        WHEN 23 THEN 'Xander Reed'
          WHEN 24 THEN 'Yara Ahmed'        WHEN 25 THEN 'Zack Brooks'
          WHEN 26 THEN 'Amber Singh'       WHEN 27 THEN 'Blake Torres'
          WHEN 28 THEN 'Chloe Kim'         WHEN 29 THEN 'Diego Rivera'
          WHEN 30 THEN 'Elena Novak'       WHEN 31 THEN 'Felix Wong'
          WHEN 32 THEN 'Grace Murphy'      WHEN 33 THEN 'Henry Park'
          WHEN 34 THEN 'Ivy Cooper'        WHEN 35 THEN 'Jake Sullivan'
          WHEN 36 THEN 'Kira Yamamoto'     WHEN 37 THEN 'Liam O''Brien'
          WHEN 38 THEN 'Maya Patel'        WHEN 39 THEN 'Noah Kim'
          WHEN 40 THEN 'Olga Petrov'       WHEN 41 THEN 'Paul Martin'
          WHEN 42 THEN 'Quinn Hughes'      WHEN 43 THEN 'Rosa Silva'
          WHEN 44 THEN 'Sean O''Connor'    WHEN 45 THEN 'Tara Singh'
          WHEN 46 THEN 'Ugo Nwosu'         WHEN 47 THEN 'Vera Kosova'
          WHEN 48 THEN 'Will Turner'       ELSE 'Zara Patel'
        END,
      'user' || i,
      -- Bio: pick from 9 varied descriptions
      CASE (i % 9)
        WHEN 0 THEN 'Habit enthusiast on a journey of self-improvement.'
        WHEN 1 THEN 'Building better habits, one day at a time.'
        WHEN 2 THEN 'Consistency over perfection — showing up every day.'
        WHEN 3 THEN 'Small steps lead to big changes over time.'
        WHEN 4 THEN 'Tracking progress and staying accountable.'
        WHEN 5 THEN 'Turning goals into routines, one habit at a time.'
        WHEN 6 THEN 'Morning person, coffee addict, habit tracker.'
        WHEN 7 THEN 'On a mission to build an unstoppable routine.'
        ELSE 'Fitness | Learning | Growth — the full stack of life.'
      END,
      -- Motto: pick from 10 inspirational phrases
      CASE (i % 10)
        WHEN 0 THEN 'Be 1% better every day.'
        WHEN 1 THEN 'The best time to start is now.'
        WHEN 2 THEN 'Discipline equals freedom.'
        WHEN 3 THEN 'Progress, not perfection.'
        WHEN 4 THEN 'The only bad workout is the one that didn''t happen.'
        WHEN 5 THEN 'Success is the sum of small efforts repeated daily.'
        WHEN 6 THEN 'You don''t have to be extreme, just consistent.'
        WHEN 7 THEN 'Dream big. Start small. Act now.'
        WHEN 8 THEN 'Your habits shape your future.'
        ELSE 'Make today count.'
      END,
      -- Avatar: 12 presets from AVATAR_PRESETS (cosmetics.ts)
      CASE (i % 12)
        WHEN 0 THEN 'rocket'  WHEN 1 THEN 'fox'
        WHEN 2 THEN 'owl'     WHEN 3 THEN 'wolf'
        WHEN 4 THEN 'fire'    WHEN 5 THEN 'bolt'
        WHEN 6 THEN 'star'    WHEN 7 THEN 'brain'
        WHEN 8 THEN 'ninja'   WHEN 9 THEN 'crown'
        WHEN 10 THEN 'dragon' ELSE 'diamond'
      END,
      -- Banner: 6 presets from BANNER_PRESETS (cosmetics.ts)
      CASE (i % 6)
        WHEN 0 THEN 'aurora'   WHEN 1 THEN 'sunset'
        WHEN 2 THEN 'forest'   WHEN 3 THEN 'ember'
        WHEN 4 THEN 'midnight' ELSE 'candy'
      END
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      username     = EXCLUDED.username,
      bio          = EXCLUDED.bio,
      motto        = EXCLUDED.motto,
      avatar       = EXCLUDED.avatar,
      banner       = EXCLUDED.banner;

    -- ── 4. user_settings (single row, trigger may already have created it) ──
    -- Accent colors match ACCENTS from shared/src/lib/theme.ts
    INSERT INTO user_settings (user_id, theme_mode, theme_accent, grace_hours, onboarding_complete)
    VALUES (
      v_user_id,
      CASE (i % 3) WHEN 0 THEN 'light' WHEN 1 THEN 'dark' ELSE 'system' END,
      CASE (i % 6)
        WHEN 0 THEN 'blue'
        WHEN 1 THEN 'violet'
        WHEN 2 THEN 'cyan'
        WHEN 3 THEN 'emerald'
        WHEN 4 THEN 'rose'
        ELSE 'amber'
      END,
      5,
      true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      theme_mode          = EXCLUDED.theme_mode,
      theme_accent        = EXCLUDED.theme_accent,
      grace_hours         = EXCLUDED.grace_hours,
      onboarding_complete = EXCLUDED.onboarding_complete;

    -- ── 5. economy_state (single row, trigger may already have created it) ──
    INSERT INTO economy_state (user_id, bonus_coins, check_in_streak)
    VALUES (v_user_id, floor(random() * 500)::int, 0)
    ON CONFLICT (user_id) DO UPDATE SET
      bonus_coins     = EXCLUDED.bonus_coins,
      check_in_streak = EXCLUDED.check_in_streak;

    -- ── 6. progress_seen (single row, trigger may already have created it) ──
    INSERT INTO progress_seen (user_id, seeded, level, title, shop, streaks, tier_unlocks)
    VALUES (
      v_user_id,
      true,
      floor(random() * 8 + 1)::int,
      CASE (i % 5)
        WHEN 0 THEN 'Habit Enthusiast'
        WHEN 1 THEN 'Consistency King'
        WHEN 2 THEN 'Streak Master'
        WHEN 3 THEN 'Goal Crusher'
        ELSE 'Level Up'
      END,
      '{}'::text[],
      '{}'::jsonb,
      ARRAY['common']
    )
    ON CONFLICT (user_id) DO UPDATE SET
      seeded       = EXCLUDED.seeded,
      level        = EXCLUDED.level,
      title        = EXCLUDED.title,
      shop         = EXCLUDED.shop,
      streaks      = EXCLUDED.streaks,
      tier_unlocks = EXCLUDED.tier_unlocks;

    -- ── 7. user_stats_snapshots (single row, trigger may already have created it) ──
    INSERT INTO user_stats_snapshots (
      user_id, level, current_streak, best_streak,
      total_completions, consistency_14d, achievement_count,
      title_name, rank_icon
    ) VALUES (
      v_user_id,
      floor(random() * 8 + 1)::int,
      floor(random() * 5 + 1)::int,
      floor(random() * 10 + 3)::int,
      floor(random() * 150 + 20)::int,
      floor(random() * 14 + 1)::int,
      floor(random() * 3)::int,
      CASE (i % 5)
        WHEN 0 THEN 'Habit Enthusiast'
        WHEN 1 THEN 'Consistency King'
        WHEN 2 THEN 'Streak Master'
        WHEN 3 THEN 'Goal Crusher'
        ELSE 'Level Up'
      END,
      CASE (i % 4)
        WHEN 0 THEN '⬡'
        WHEN 1 THEN '⬢'
        WHEN 2 THEN '✦'
        ELSE '★'
      END
    )
    ON CONFLICT (user_id) DO UPDATE SET
      level             = EXCLUDED.level,
      current_streak    = EXCLUDED.current_streak,
      best_streak       = EXCLUDED.best_streak,
      total_completions = EXCLUDED.total_completions,
      consistency_14d   = EXCLUDED.consistency_14d,
      achievement_count = EXCLUDED.achievement_count,
      title_name        = EXCLUDED.title_name,
      rank_icon         = EXCLUDED.rank_icon;

    -- ── 8. HABITS (6-8 per user) ──
    v_habit_ids := '{}';
    FOR v_h IN 1..(6 + (i % 3)) LOOP
      v_habit_id := gen_random_uuid();
      v_cat := v_cat_list[v_habit_cats[(v_h % 20) + 1]];

      INSERT INTO habits (
        id, user_id, name, category, repeat_days,
        created_at, priority, recurrence, start_date, archived
      ) VALUES (
        v_habit_id,
        v_user_id,
        v_habit_names[(v_h % 20) + 1],
        v_cat,
        CASE WHEN random() < 0.5 THEN '{}'::int[] ELSE ARRAY[1,2,3,4,5] END,
        now() - interval '35 days',
        CASE (v_h % 3) WHEN 0 THEN 'low' WHEN 1 THEN 'med' ELSE 'high' END,
        CASE WHEN random() < 0.5
          THEN jsonb_build_object('kind', 'daily')
          ELSE jsonb_build_object('kind', 'weekly', 'weekdays', ARRAY[1,2,3,4,5])
        END,
        (now() - interval '30 days')::date,
        v_h > 6
      );

      v_habit_ids := array_append(v_habit_ids, v_habit_id);
    END LOOP;

    -- ── 9. MARKS (30 days per user) ──
    FOR v_day_offset IN 1..30 LOOP
      FOREACH v_habit_id IN ARRAY v_habit_ids LOOP
        IF random() < 0.7 THEN
          v_mark_status := CASE
            WHEN random() < 0.7 THEN 'done'
            WHEN random() < 0.85 THEN 'missed'
            ELSE 'skipped'
          END;

          INSERT INTO marks (id, user_id, date_key, habit_id, status)
          VALUES (
            gen_random_uuid(),
            v_user_id,
            (now() - (v_day_offset || ' days')::interval)::date,
            v_habit_id,
            v_mark_status
          );
        END IF;
      END LOOP;
    END LOOP;

    -- ── 10. NOTES (3-5 per user) ──
    FOR v_n IN 1..(3 + (i % 3)) LOOP
      INSERT INTO notes (id, user_id, created_at, updated_at, body, tags, links)
      VALUES (
        gen_random_uuid(),
        v_user_id,
        now() - ((v_n * 7)::text || ' days')::interval,
        now() - ((v_n * 7)::text || ' days')::interval,
        v_note_texts[(v_n % 20) + 1],
        ARRAY[v_cat_list[(v_n % 9) + 1]],
        jsonb_build_object('date', (now() - ((v_n * 7)::text || ' days')::interval)::date::text)
      );
    END LOOP;

    -- ── 11. GOALS (2-3 per user) ──
    FOR v_g IN 1..(2 + (i % 2)) LOOP
      INSERT INTO goals (
        id, user_id, title, target, current,
        created_at, category, deadline, milestones
      ) VALUES (
        gen_random_uuid(),
        v_user_id,
        v_goal_titles[(v_g % 10) + 1],
        (10 + (v_g * 10)),
        floor(random() * (10 + (v_g * 10))),
        now() - interval '30 days',
        v_cat_list[v_goal_cats[(v_g % 10) + 1]],
        (now() + interval '60 days')::date,
        jsonb_build_array(
          jsonb_build_object('id', gen_random_uuid()::text, 'title', 'Halfway', 'at', (5 + (v_g * 5)), 'done', random() < 0.3),
          jsonb_build_object('id', gen_random_uuid()::text, 'title', 'Complete', 'at', (10 + (v_g * 10)), 'done', false)
        )
      );
    END LOOP;

    -- ── 12. UNLOCKS (some achievements) — IDs match ACHIEVEMENTS from shared/src/lib/achievements.ts ──
    IF random() < 0.6 THEN
      INSERT INTO unlocks (id, user_id, achievement_id, at, seen)
      VALUES (
        gen_random_uuid(),
        v_user_id,
        CASE (i % 28)
          WHEN 0 THEN 'streak-1'
          WHEN 1 THEN 'streak-3'
          WHEN 2 THEN 'streak-7'
          WHEN 3 THEN 'streak-14'
          WHEN 4 THEN 'done-1'
          WHEN 5 THEN 'done-10'
          WHEN 6 THEN 'done-50'
          WHEN 7 THEN 'perfect-week'
          WHEN 8 THEN 'perfect-days-10'
          WHEN 9 THEN 'habit-collector'
          WHEN 10 THEN 'early-bird'
          WHEN 11 THEN 'night-owl'
          WHEN 12 THEN 'weekend-warrior'
          WHEN 13 THEN 'comeback-king'
          WHEN 14 THEN 'cat-workout'
          WHEN 15 THEN 'cat-studies'
          WHEN 16 THEN 'cat-work'
          WHEN 17 THEN 'cat-health'
          WHEN 18 THEN 'done-100'
          WHEN 19 THEN 'streak-30'
          WHEN 20 THEN 'perfect-days-50'
          WHEN 21 THEN 'streak-50'
          WHEN 22 THEN 'habit-master'
          WHEN 23 THEN 'done-500'
          WHEN 24 THEN 'perfect-month'
          WHEN 25 THEN 'streak-100'
          WHEN 26 THEN 'done-1000'
          ELSE 'streak-365'
        END,
        now() - interval '15 days',
        random() < 0.7
      );
    END IF;

    -- ── 13. ECONOMY_SPENT (3-5 entries per user) ──
    FOR v_s IN 1..(3 + (i % 3)) LOOP
      INSERT INTO economy_spent (id, user_id, at, amount, item)
      VALUES (
        gen_random_uuid(),
        v_user_id,
        now() - ((v_s * 10)::text || ' days')::interval,
        CASE (v_s % 4) WHEN 0 THEN 50 WHEN 1 THEN 100 WHEN 2 THEN 150 ELSE 200 END,
        CASE (v_s % 4)
          WHEN 0 THEN 'flame-default'
          WHEN 1 THEN 'confetti-default'
          WHEN 2 THEN 'accent-default'
          ELSE 'flame-custom'
        END
      );
    END LOOP;

    -- ── 14. SUGGESTIONS (2-3 per user) ──
    FOR v_s IN 1..(2 + (i % 2)) LOOP
      INSERT INTO suggestions (id, user_id, title, body, category, created_at, status)
      VALUES (
        gen_random_uuid(),
        v_user_id,
        split_part(v_sug_texts[(v_s % 10) + 1], '.', 1),
        v_sug_texts[(v_s % 10) + 1],
        CASE (v_s % 5) WHEN 0 THEN 'feature' WHEN 1 THEN 'bug' WHEN 2 THEN 'improvement' WHEN 3 THEN 'general' ELSE 'other' END,
        now() - ((v_s * 15)::text || ' days')::interval,
        CASE (v_s % 4) WHEN 0 THEN 'new' WHEN 1 THEN 'read' WHEN 2 THEN 'acknowledged' ELSE 'completed' END
      );
    END LOOP;

    -- ── 15. NOTIFICATIONS (3-5 per user) ──
    FOR v_notif IN 1..(3 + (i % 3)) LOOP
      INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at)
      VALUES (
        gen_random_uuid(),
        v_user_id,
        v_notif_types[(v_notif % 4) + 1],
        v_notif_titles[(v_notif % 4) + 1],
        v_notif_bodies[(v_notif % 4) + 1],
        v_notif % 3 != 0,
        now() - ((v_notif * 7)::text || ' days')::interval
      );
    END LOOP;

  END LOOP;

  RAISE NOTICE 'Seeded 50 test users with full data!';
  RAISE NOTICE 'Login: userN@example.com / test123456 (N = 1..50)';
END;
$$;
