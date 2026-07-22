// Habits DB module — row converter + load + save.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Habit, Recurrence, Priority } from "../../types";
import { upsertTable, type DbHabit } from "./core";

export function rowToHabit(row: DbHabit): Habit {
  const h: Habit = {
    id: row.id,
    name: row.name,
    category: row.category as Habit["category"],
    repeatDays: row.repeat_days ?? [],
    createdAt: row.created_at,
  };
  if (row.recurrence) h.recurrence = row.recurrence as Recurrence;
  if (row.start_date) h.startDate = row.start_date;
  if (row.time_of_day) h.timeOfDay = row.time_of_day;
  if (row.priority) h.priority = row.priority as Priority;
  if (row.archived) h.archived = true;
  if (row.reminder)
    h.reminder = row.reminder as { enabled: boolean; time?: string };
  if (row.deleted_at) h.deletedAt = row.deleted_at;
  return h;
}

export function habitToRow(userId: string, h: Habit): DbHabit {
  return {
    id: h.id,
    user_id: userId,
    name: h.name,
    category: h.category,
    repeat_days: h.repeatDays ?? [],
    created_at: h.createdAt,
    recurrence: h.recurrence ?? null,
    start_date: h.startDate ?? null,
    time_of_day: h.timeOfDay ?? null,
    priority: h.priority ?? null,
    archived: h.archived ?? false,
    reminder: h.reminder ?? null,
    deleted_at: h.deletedAt ?? null,
  };
}

export async function loadHabits(
  supabase: SupabaseClient,
  userId: string,
): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToHabit);
}

export async function saveHabits(
  supabase: SupabaseClient,
  userId: string,
  habits: Habit[],
): Promise<void> {
  await upsertTable(
    supabase,
    "habits",
    habits,
    (h) => habitToRow(userId, h),
    "id",
  );
}
