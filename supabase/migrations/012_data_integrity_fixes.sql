-- ============================================================================
-- Growly — Migration 012: Data Integrity Fixes
-- ============================================================================
-- Adds columns identified as missing during the Data Integrity Audit:
--
--   1. completed_goals on progress_seen — the client saves this field but the
--      DB column never existed, so goal celebrations silently didn't sync
--      across devices (the value was dropped by PostgREST).
--
--   2. auto_freeze_threshold on user_settings — the client supports per-user
--      auto-freeze threshold but it was only stored in localStorage, never
--      synced to the DB, so the setting didn't carry across devices.
-- ============================================================================


-- ############################################################################
--  1. Add completed_goals to progress_seen
--     Client code already handles this field (fallback to [] on load). Adding
--     the column makes it persist across sync so goal completion celebrations
--     work correctly on all devices.
-- ############################################################################

ALTER TABLE progress_seen
  ADD COLUMN IF NOT EXISTS completed_goals TEXT[] NOT NULL DEFAULT '{}';


-- ############################################################################
--  2. Add auto_freeze_threshold to user_settings
--     The client stores this in localStorage but never synced it to the DB.
--     Adding the column allows it to be written/read via Supabase so the
--     setting carries across devices.
--     NULL = disabled (no auto-freeze), any positive integer = minimum streak
--     length before auto-freeze kicks in.
-- ############################################################################

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS auto_freeze_threshold INTEGER;
