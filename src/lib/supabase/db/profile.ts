// Profile DB module — row converter + load + save.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../../types";
import type { DbUserProfile } from "./core";

export function rowToProfile(row: DbUserProfile): Profile {
  return {
    displayName: row.display_name,
    username: row.username,
    bio: row.bio ?? undefined,
    motto: row.motto ?? undefined,
    avatar: row.avatar ?? undefined,
    banner: row.banner ?? undefined,
    showcaseBadgeId: row.showcase_badge_id ?? undefined,
  };
}

export function profileToRow(userId: string, p: Profile): DbUserProfile {
  return {
    user_id: userId,
    display_name: p.displayName,
    username: p.username,
    bio: p.bio ?? null,
    motto: p.motto ?? null,
    avatar: p.avatar ?? null,
    banner: p.banner ?? null,
    showcase_badge_id: p.showcaseBadgeId ?? null,
  };
}

export async function loadProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data ? rowToProfile(data) : null;
}

export async function saveProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
): Promise<void> {
  const row = profileToRow(userId, profile);
  const { error } = await supabase
    .from("user_profile")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}
