// Marks DB module — row converter + load + save.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Marks, MarkStatus } from "../../types";
import { uid } from "../../util";
import { upsertTable, type DbMark } from "./core";

export function buildMarksFromRows(rows: DbMark[]): Marks {
  const marks: Marks = {};
  for (const row of rows) {
    if (!marks[row.date_key]) marks[row.date_key] = {};
    marks[row.date_key][row.habit_id] = row.status as MarkStatus;
  }
  return marks;
}

export function marksToRows(userId: string, marks: Marks): DbMark[] {
  const rows: DbMark[] = [];
  for (const [dateKey, day] of Object.entries(marks)) {
    for (const [habitId, status] of Object.entries(day)) {
      rows.push({
        id: uid(),
        user_id: userId,
        date_key: dateKey,
        habit_id: habitId,
        status,
      });
    }
  }
  return rows;
}

export async function loadMarks(
  supabase: SupabaseClient,
  userId: string,
): Promise<Marks> {
  const { data, error } = await supabase
    .from("marks")
    .select("date_key, habit_id, status")
    .eq("user_id", userId);
  if (error) throw error;
  return buildMarksFromRows((data ?? []) as unknown as DbMark[]);
}

export async function saveMarks(
  supabase: SupabaseClient,
  userId: string,
  marks: Marks,
  dirtyMarkKeys?: string[],
): Promise<void> {
  // Only push the marks that actually changed.
  let marksToSave = marks;
  if (dirtyMarkKeys && dirtyMarkKeys.length > 0) {
    marksToSave = {};
    for (const key of dirtyMarkKeys) {
      if (marks[key]) marksToSave[key] = marks[key];
    }
  }
  const rows = marksToRows(userId, marksToSave);
  await upsertTable(
    supabase,
    "marks",
    rows,
    (r) => r,
    // Conflict on the composite unique key — not id — because id is a new
    // random UUID on every marksToRows call.
    "user_id,date_key,habit_id",
  );
}
