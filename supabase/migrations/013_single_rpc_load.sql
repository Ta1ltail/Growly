-- ============================================================================
-- Growly — Migration 013: Single-RPC User Data Load
-- ============================================================================
-- Replaces the 9 individual SELECT queries in loadAllUserData with a single
-- RPC call. The function uses SECURITY INVOKER so RLS policies are respected
-- (users can only see their own data). Returns a JSONB object with all tables.
--
-- SECURITY INVOKER means the function runs with the calling user's privileges,
-- so the caller must have SELECT grants on all referenced tables (which the
-- authenticated role does from migration 009).
--
-- Usage from the client:
--   const { data, error } = await supabase.rpc('load_user_data', { p_user_id: userId });
--   if (data) parseRpcResult(data);
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
      (SELECT jsonb_agg(to_jsonb(h.*))
       FROM public.habits h
       WHERE h.user_id = p_user_id
       ORDER BY h.created_at ASC),
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
      (SELECT jsonb_agg(to_jsonb(n.*))
       FROM public.notes n
       WHERE n.user_id = p_user_id
       ORDER BY n.created_at DESC),
      '[]'::jsonb
    ),
    'goals', COALESCE(
      (SELECT jsonb_agg(to_jsonb(g.*))
       FROM public.goals g
       WHERE g.user_id = p_user_id
       ORDER BY g.created_at ASC),
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
      (SELECT jsonb_agg(to_jsonb(esp.*))
       FROM public.economy_spent esp
       WHERE esp.user_id = p_user_id
       ORDER BY esp.at ASC),
      '[]'::jsonb
    ),
    'economy_freezes', COALESCE(
      (SELECT jsonb_agg(to_jsonb(ef.*))
       FROM public.economy_freezes ef
       WHERE ef.user_id = p_user_id
       ORDER BY ef.at ASC),
      '[]'::jsonb
    ),
    'economy_bonuses', COALESCE(
      (SELECT jsonb_agg(to_jsonb(eb.*))
       FROM public.economy_bonuses eb
       WHERE eb.user_id = p_user_id
       ORDER BY eb.created_at ASC),
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
