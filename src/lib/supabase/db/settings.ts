// Settings DB module — row converter + load + save.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppData } from "../../types";
import type { ThemeSettings } from "../../theme";
import type { DbUserSettings } from "./core";
import { DEFAULT_GRACE_HOURS } from "../../storage";

export function rowToSettings(row: DbUserSettings): AppData["settings"] {
  return {
    theme: {
      mode: row.theme_mode as ThemeSettings["mode"],
      accent: row.theme_accent,
    },
    graceHours: row.grace_hours,
    usedTemplateIds: row.used_template_ids ?? [],
    widgetOrder: row.widget_order ?? undefined,
    onboardingComplete: row.onboarding_complete ?? undefined,
    customCategories: row.custom_categories?.length
      ? row.custom_categories
      : undefined,
    autoFreezeThreshold:
      row.auto_freeze_threshold != null &&
      Number.isFinite(row.auto_freeze_threshold) &&
      row.auto_freeze_threshold > 0
        ? row.auto_freeze_threshold
        : undefined,
  };
}

export function settingsToRow(
  userId: string,
  s: AppData["settings"],
): DbUserSettings {
  return {
    user_id: userId,
    theme_mode: s.theme.mode,
    theme_accent: s.theme.accent,
    grace_hours: s.graceHours ?? DEFAULT_GRACE_HOURS,
    used_template_ids: s.usedTemplateIds ?? [],
    widget_order: s.widgetOrder ?? null,
    onboarding_complete: s.onboardingComplete ?? false,
    custom_categories: s.customCategories ?? [],
    auto_freeze_threshold:
      s.autoFreezeThreshold && s.autoFreezeThreshold > 0
        ? s.autoFreezeThreshold
        : null,
  };
}

export async function loadSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppData["settings"] | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data ? rowToSettings(data) : null;
}

export async function saveSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: AppData["settings"],
): Promise<void> {
  const row = settingsToRow(userId, settings);
  const { error } = await supabase
    .from("user_settings")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}
