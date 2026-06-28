-- ============================================================================
-- project_101 — Daily cron: refresh stale user_stats_snapshots
--
-- Creates a PL/pgSQL function that recalculates stats for users whose
-- snapshot hasn't been updated in ≥24 hours, then schedules it daily
-- at 03:00 UTC via pg_cron.
--
-- This is purely server-side — no Edge Function, no HTTP calls.
-- The exact streak values are best-effort; they get corrected to the
-- precise value when the user syncs from their client.
-- ============================================================================

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- ####################################################
--  Helper: refresh a single user's stats snapshot
-- ####################################################
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
  -- ── Total completions ─────────────────────────────
  SELECT COUNT(*)::INT INTO v_total_completions
  FROM public.marks
  WHERE user_id = p_user_id AND status = 'done';

  -- ── Achievement count ─────────────────────────────
  SELECT COUNT(*)::INT INTO v_achievement_count
  FROM public.unlocks
  WHERE user_id = p_user_id;

  -- ── 14-day consistency (% of days with ≥1 done) ───
  SELECT COUNT(DISTINCT date_key)::INT INTO v_consistency_14d
  FROM public.marks
  WHERE user_id = p_user_id
    AND status = 'done'
    AND date_key >= (now() - INTERVAL '13 days')::date;

  v_consistency_14d := LEAST(100, GREATEST(0, (v_consistency_14d * 100) / 14));

  -- ── Current streak (walk backwards from yesterday) ─
  -- Simplified: count consecutive days (excluding today) with at least one
  -- 'done' mark. Freezes are excluded in this server-side approximation;
  -- the exact value is restored on the next client sync.
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
  SELECT COUNT(*)::INT INTO v_current_streak FROM streak
  WHERE d IS NOT NULL;

  -- ── Best streak (longest consecutive run) ──────────
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
  FROM (
    SELECT COUNT(*) AS cnt
    FROM grouped
    GROUP BY grp
  ) g;

  -- ── Level & title ─────────────────────────────────
  SELECT COALESCE(p.level, 1), COALESCE(p.title, 'Habit Newbie')
  INTO v_level, v_title
  FROM public.progress_seen p
  WHERE p.user_id = p_user_id;

  -- ── Rank icon (simplified) ────────────────────────
  v_rank_icon := CASE
    WHEN v_level >= 50 THEN '✦'
    WHEN v_level >= 30 THEN '◆'
    WHEN v_level >= 20 THEN '⬟'
    WHEN v_level >= 10 THEN '⬢'
    ELSE '⬡'
  END;

  -- ── Upsert snapshot ───────────────────────────────
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
    level               = EXCLUDED.level,
    current_streak      = EXCLUDED.current_streak,
    best_streak         = EXCLUDED.best_streak,
    total_completions   = EXCLUDED.total_completions,
    consistency_14d     = EXCLUDED.consistency_14d,
    achievement_count   = EXCLUDED.achievement_count,
    title_name          = EXCLUDED.title_name,
    rank_icon           = EXCLUDED.rank_icon,
    updated_at          = EXCLUDED.updated_at;
END;
$$;

-- ####################################################
--  Master function: refresh all stale snapshots
-- ####################################################
CREATE OR REPLACE FUNCTION public.refresh_stale_snapshots()
RETURNS TABLE(refreshed INT, total INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user RECORD;
  v_refreshed INT := 0;
  v_total INT := 0;
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
      -- Log and skip errored users
      RAISE WARNING 'refresh_user_stats failed for %: %', v_user.user_id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_refreshed, v_total;
END;
$$;

-- ####################################################
--  Schedule: run daily at 03:00 UTC
-- ####################################################
SELECT cron.schedule(
  'refresh-stale-snapshots',   -- job name
  '0 3 * * *',                 -- every day at 03:00 UTC
  $$ SELECT public.refresh_stale_snapshots(); $$
);

-- Run once immediately to seed initial data for any stale snapshots
SELECT public.refresh_stale_snapshots();
