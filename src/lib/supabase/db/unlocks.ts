// Unlocks DB module — row converter + load + save.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Unlocks } from "../../types";
import { uid } from "../../util";
import { upsertTable, type DbUnlock } from "./core";

export function rowToUnlocks(rows: DbUnlock[]): Unlocks {
  const unlocks: Unlocks = {};
  for (const row of rows) {
    unlocks[row.achievement_id] = { at: row.at, seen: row.seen };
  }
  return unlocks;
}

export async function loadUnlocks(
  supabase: SupabaseClient,
  userId: string,
): Promise<Unlocks> {
  const { data, error } = await supabase
    .from("unlocks")
    .select("achievement_id, at, seen")
    .eq("user_id", userId);
  if (error) throw error;
  return rowToUnlocks((data ?? []) as unknown as DbUnlock[]);
}

export async function saveUnlocks(
  supabase: SupabaseClient,
  userId: string,
  unlocks: Unlocks,
): Promise<void> {
  const rows = Object.entries(unlocks).map(([achievementId, rec]) => ({
    id: uid(),
    user_id: userId,
    achievement_id: achievementId,
    at: rec.at,
    seen: rec.seen,
  }));
  await upsertTable(
    supabase,
    "unlocks",
    rows,
    (r) => r,
    "user_id,achievement_id",
  );
}
