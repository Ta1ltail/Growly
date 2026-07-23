-- Migration 016: Add sound and animation preference columns to user_settings.
-- These were being saved to localStorage but never synced to Supabase,
-- causing settings to be lost on app refresh / cross-device sync.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS sound_enabled    BOOLEAN,
  ADD COLUMN IF NOT EXISTS sound_volume     REAL CHECK (sound_volume >= 0 AND sound_volume <= 1),
  ADD COLUMN IF NOT EXISTS reduced_motion   BOOLEAN;
