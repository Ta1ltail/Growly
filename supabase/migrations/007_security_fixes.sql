-- ============================================================================
-- Growly — Security Hardening (migration 007)
-- Idempotent: all statements are safe to run multiple times.
-- ============================================================================
--
-- Fixes:
-- 1. Add security_invoker = true to public_profiles view
--    (was missing, causing view to bypass RLS and run with owner privileges)
-- 2. Narrow GRANT ALL to GRANT SELECT, INSERT, UPDATE on all tables
--    (least-privilege — removes TRUNCATE, DROP, TRIGGER, REFERENCES, DELETE)
-- 3. friends and notifications keep DELETE (they have explicit DELETE RLS policies)
-- 4. suggestions only gets SELECT, INSERT (no UPDATE/DELETE policies exist)


-- ############################################################################
--  1. FIX: public_profiles view — security_invoker = true
--  The original 001_schema.sql defined the view with security_invoker = true,
--  but 004_view_and_realtime.sql overwrote it without the option. This fix
--  restores it so the view runs with the querying user's privileges (respecting
--  the user_profile RLS) instead of the view owner's privileges.
-- ############################################################################

ALTER VIEW public_profiles SET (security_invoker = true);


-- ############################################################################
--  2. FIX: Narrow table-level grants to least privilege
--  Previously GRANT ALL gave every authenticated user TRUNCATE, DROP, TRIGGER,
--  and REFERENCES capabilities on all tables — far more than needed. RLS
--  prevents reading/writing other users' rows, but can't prevent schema-level
--  operations. These narrowed grants only allow the operations the app
--  actually performs through the Supabase client.
-- ############################################################################

-- ── Revoke the overly broad ALL grants first ──
REVOKE ALL ON TABLE habits                 FROM authenticated;
REVOKE ALL ON TABLE marks                  FROM authenticated;
REVOKE ALL ON TABLE notes                  FROM authenticated;
REVOKE ALL ON TABLE goals                  FROM authenticated;
REVOKE ALL ON TABLE unlocks                FROM authenticated;
REVOKE ALL ON TABLE user_settings          FROM authenticated;
REVOKE ALL ON TABLE user_profile           FROM authenticated;
REVOKE ALL ON TABLE economy_state          FROM authenticated;
REVOKE ALL ON TABLE progress_seen          FROM authenticated;
REVOKE ALL ON TABLE economy_spent          FROM authenticated;
REVOKE ALL ON TABLE economy_freezes        FROM authenticated;
REVOKE ALL ON TABLE friends                FROM authenticated;
REVOKE ALL ON TABLE notifications          FROM authenticated;
REVOKE ALL ON TABLE suggestions            FROM authenticated;
REVOKE ALL ON TABLE user_stats_snapshots   FROM authenticated;

-- ── Grant minimum required privileges ──
-- Most tables: upsert pattern (SELECT + INSERT + UPDATE)
GRANT SELECT, INSERT, UPDATE ON TABLE habits               TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE marks                TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE notes                TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE goals                TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE unlocks              TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE user_settings        TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE user_profile         TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE economy_state        TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE progress_seen        TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE economy_spent        TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE economy_freezes      TO authenticated;

-- friends: +DELETE (has explicit DELETE RLS policy)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE friends      TO authenticated;

-- notifications: +DELETE (has explicit DELETE RLS policy)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE notifications TO authenticated;

-- suggestions: no UPDATE/DELETE policies — SELECT + INSERT only
GRANT SELECT, INSERT ON TABLE suggestions                  TO authenticated;

-- user_stats_snapshots: upsert pattern from sync
GRANT SELECT, INSERT, UPDATE ON TABLE user_stats_snapshots TO authenticated;
