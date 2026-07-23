// Shared DB infrastructure — row types and generic upsert helper.
// Each per-table module imports from here.

import type { SupabaseClient } from "@supabase/supabase-js";

/* ─── Table row shapes ─── */

export interface DbHabit {
  id: string;
  user_id: string;
  name: string;
  category: string;
  repeat_days: number[];
  created_at: string;
  recurrence: unknown | null;
  start_date: string | null;
  time_of_day: string | null;
  priority: string | null;
  archived: boolean;
  reminder: unknown | null;
  deleted_at: string | null;
}

export interface DbMark {
  id: string;
  user_id: string;
  date_key: string;
  habit_id: string;
  status: string;
}

export interface DbNote {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  body: string;
  tags: string[];
  links: unknown;
  deleted_at: string | null;
}

export interface DbGoal {
  id: string;
  user_id: string;
  title: string;
  target: number;
  current: number;
  created_at: string;
  category: string | null;
  deadline: string | null;
  linked_habit_ids: string[];
  milestones: unknown | null;
  deleted_at: string | null;
}

export interface DbUserSettings {
  user_id: string;
  theme_mode: string;
  theme_accent: string;
  grace_hours: number;
  used_template_ids: string[];
  widget_order: string[] | null;
  onboarding_complete: boolean;
  custom_categories: string[];
  auto_freeze_threshold: number | null;
  sound_enabled: boolean | null;
  sound_volume: number | null;
  reduced_motion: boolean | null;
}

export interface DbUserProfile {
  user_id: string;
  display_name: string;
  username: string;
  bio: string | null;
  motto: string | null;
  avatar: string | null;
  banner: string | null;
  showcase_badge_id: string | null;
}

export interface DbUnlock {
  id: string;
  user_id: string;
  achievement_id: string;
  at: string;
  seen: boolean;
}

export interface DbEconomyState {
  user_id: string;
  owned: string[];
  equipped: unknown;
  bonus_coins: number;
  last_check_in: string | null;
  check_in_streak: number;
  last_quest_date: string | null;
  current_quest: unknown | null;
  last_spin_date: string | null;
  last_spin_result: unknown | null;
}

export interface DbEconomySpent {
  id: string;
  user_id: string;
  at: string;
  amount: number;
  item: string;
}

export interface DbEconomyFreeze {
  id: string;
  user_id: string;
  at: string;
  date: string;
  habit_id: string;
}

export interface DbEconomyBonus {
  id: string;
  user_id: string;
  type: string;
  date_key: string;
  amount: number;
  created_at: string;
}

export interface DbProgressSeen {
  user_id: string;
  seeded: boolean;
  level: number;
  title: string;
  shop: string[];
  streaks: unknown;
  tier_unlocks: string[];
  completed_goals: string[];
}

/* ─── Generic upsertTable helper ─── */

const BATCH_SIZE = 500;

export async function upsertTable<T>(
  supabase: SupabaseClient,
  table: string,
  rows: T[],
  rowToDb: (row: T) => object,
  onConflict: string,
): Promise<void> {
  if (rows.length === 0) return;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map(rowToDb);
    const { error } = await supabase.from(table).upsert(batch as never, { onConflict });
    if (error) throw error;
  }
}
