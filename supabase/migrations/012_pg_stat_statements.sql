-- ============================================================================
-- project_101 — Enable pg_stat_statements for query monitoring
--
-- pg_stat_statements tracks execution statistics for all SQL statements.
-- Useful for identifying slow queries, index misses, and performance trends.
-- Query it via:
--   SELECT query, calls, mean_exec_time, rows
--   FROM pg_stat_statements
--   WHERE query NOT LIKE '%pg_%'
--   ORDER BY mean_exec_time DESC
--   LIMIT 20;
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
