// Goals DB module — row converter + load + save.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Goal } from "../../types";
import { upsertTable, type DbGoal } from "./core";

export function rowToGoal(row: DbGoal): Goal {
  const g: Goal = {
    id: row.id,
    title: row.title,
    target: row.target,
    current: row.current,
    createdAt: row.created_at,
  };
  if (row.category) g.category = row.category as Goal["category"];
  if (row.deadline) g.deadline = row.deadline;
  if (row.linked_habit_ids?.length) g.linkedHabitIds = row.linked_habit_ids;
  if (row.milestones) g.milestones = row.milestones as Goal["milestones"];
  if (row.deleted_at) g.deletedAt = row.deleted_at;
  return g;
}

export function goalToRow(userId: string, g: Goal): DbGoal {
  return {
    id: g.id,
    user_id: userId,
    title: g.title,
    target: g.target,
    current: g.current,
    created_at: g.createdAt,
    category: g.category ?? null,
    deadline: g.deadline ?? null,
    linked_habit_ids: g.linkedHabitIds ?? [],
    milestones: g.milestones ?? null,
    deleted_at: g.deletedAt ?? null,
  };
}

export async function loadGoals(
  supabase: SupabaseClient,
  userId: string,
): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToGoal);
}

export async function saveGoals(
  supabase: SupabaseClient,
  userId: string,
  goals: Goal[],
): Promise<void> {
  await upsertTable(
    supabase,
    "goals",
    goals,
    (g) => goalToRow(userId, g),
    "id",
  );
}
