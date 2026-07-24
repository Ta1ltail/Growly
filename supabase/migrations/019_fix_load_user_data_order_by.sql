-- ============================================================================
-- Growly — Migration 019: Fix load_user_data ORDER BY / GROUP BY error
-- ============================================================================
-- The db linter flagged: column "h.created_at" must appear in the GROUP BY
-- clause or be used in an aggregate function.
--
-- Root cause: The ORDER BY clause was placed OUTSIDE the jsonb_agg() call,
-- which caused PostgreSQL to require the ordered column in a GROUP BY.
-- Fix: Move ORDER BY inside jsonb_agg() so the ordering happens during
-- aggregation and the column is no longer a bare reference.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.load_user_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'habits', COALESCE(
      (SELECT jsonb_agg(to_jsonb(h.*) ORDER BY h.created_at ASC)
       FROM public.habits h
       WHERE h.user_id = p_user_id),
      '[]'::jsonb
    ),
    'marks', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'date_key', m.date_key,
        'habit_id', m.habit_id,
        'status', m.status
      ))
       FROM public.marks m
       WHERE m.user_id = p_user_id),
      '[]'::jsonb
    ),
    'notes', COALESCE(
      (SELECT jsonb_agg(to_jsonb(n.*) ORDER BY n.created_at DESC)
       FROM public.notes n
       WHERE n.user_id = p_user_id),
      '[]'::jsonb
    ),
    'goals', COALESCE(
      (SELECT jsonb_agg(to_jsonb(g.*) ORDER BY g.created_at ASC)
       FROM public.goals g
       WHERE g.user_id = p_user_id),
      '[]'::jsonb
    ),
    'settings', (SELECT to_jsonb(us.*)
       FROM public.user_settings us
       WHERE us.user_id = p_user_id
       LIMIT 1),
    'profile', (SELECT to_jsonb(up.*)
       FROM public.user_profile up
       WHERE up.user_id = p_user_id
       LIMIT 1),
    'unlocks', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'achievement_id', u.achievement_id,
        'at', u.at,
        'seen', u.seen
      ))
       FROM public.unlocks u
       WHERE u.user_id = p_user_id),
      '[]'::jsonb
    ),
    'economy_state', (SELECT to_jsonb(es.*)
       FROM public.economy_state es
       WHERE es.user_id = p_user_id
       LIMIT 1),
    'economy_spent', COALESCE(
      (SELECT jsonb_agg(to_jsonb(esp.*) ORDER BY esp.at ASC)
       FROM public.economy_spent esp
       WHERE esp.user_id = p_user_id),
      '[]'::jsonb
    ),
    'economy_freezes', COALESCE(
      (SELECT jsonb_agg(to_jsonb(ef.*) ORDER BY ef.at ASC)
       FROM public.economy_freezes ef
       WHERE ef.user_id = p_user_id),
      '[]'::jsonb
    ),
    'economy_bonuses', COALESCE(
      (SELECT jsonb_agg(to_jsonb(eb.*) ORDER BY eb.created_at ASC)
       FROM public.economy_bonuses eb
       WHERE eb.user_id = p_user_id),
      '[]'::jsonb
    ),
    'progress_seen', (SELECT to_jsonb(ps.*)
       FROM public.progress_seen ps
       WHERE ps.user_id = p_user_id
       LIMIT 1),
    'stats_snapshot', (SELECT to_jsonb(uss.*)
       FROM public.user_stats_snapshots uss
       WHERE uss.user_id = p_user_id
       LIMIT 1)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (the only callers of this function)
GRANT EXECUTE ON FUNCTION public.load_user_data(UUID) TO authenticated;

-- ============================================================================
-- ANALYZE to update query planner statistics
-- ============================================================================

ANALYZE public.habits;
ANALYZE public.marks;
ANALYZE public.notes;
ANALYZE public.goals;
ANALYZE public.economy_spent;
ANALYZE public.economy_freezes;
ANALYZE public.economy_bonuses;
