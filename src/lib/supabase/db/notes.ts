// Notes DB module — row converter + load + save.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Note } from "../../types";
import { upsertTable, type DbNote } from "./core";

export function rowToNote(row: DbNote): Note {
  const n: Note = {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    body: row.body,
    tags: row.tags ?? [],
    links: (row.links ?? {}) as Note["links"],
  };
  if (row.deleted_at) n.deletedAt = row.deleted_at;
  return n;
}

export function noteToRow(userId: string, n: Note): DbNote {
  return {
    id: n.id,
    user_id: userId,
    created_at: n.createdAt,
    updated_at: n.updatedAt,
    body: n.body,
    tags: n.tags ?? [],
    links: n.links ?? {},
    deleted_at: n.deletedAt ?? null,
  };
}

export async function loadNotes(
  supabase: SupabaseClient,
  userId: string,
): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToNote);
}

export async function saveNotes(
  supabase: SupabaseClient,
  userId: string,
  notes: Note[],
): Promise<void> {
  await upsertTable(
    supabase,
    "notes",
    notes,
    (n) => noteToRow(userId, n),
    "id",
  );
}
