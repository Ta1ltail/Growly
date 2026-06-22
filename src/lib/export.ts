// Data export/import utilities: convert habit data to/from CSV and JSON.
// Used by Settings for data portability.

import { z } from "zod";
import type { AppData } from "./types";
import { dateKey } from "./storage";

// CSV header for habit marks export.
const CSV_HEADERS = ["Date", "Habit", "Category", "Status", "Scheduled"];

// Zod schema for validating imported JSON data.
// Mirrors the cleanup logic in storage.ts — rejects malformed records so a
// bad import can never crash the app.
const ImportSchema = z.strictObject({
  version: z.number().optional(),
  habits: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
        repeatDays: z.array(z.number()),
        createdAt: z.string(),
        recurrence: z.unknown().optional(),
        startDate: z.string().optional(),
        timeOfDay: z.string().optional(),
        priority: z.string().optional(),
        archived: z.boolean().optional(),
        reminder: z.unknown().optional(),
      }),
    )
    .optional()
    .default([]),
  marks: z
    .record(
      z.string(),
      z.record(z.string(), z.enum(["done", "missed", "skipped"])),
    )
    .optional()
    .default({}),
  notes: z.array(z.unknown()).optional(),
  goals: z.array(z.unknown()).optional(),
  auditLog: z.array(z.unknown()).optional(),
  settings: z.unknown().optional(),
  profile: z.unknown().optional(),
  unlocks: z.unknown().optional(),
  economy: z.unknown().optional(),
  progressSeen: z.unknown().optional(),
});

// Export habit marks as CSV text.
// Rows: one per habit per day for the last `days` days.
export function exportMarksCSV(data: AppData, days = 90): string {
  const active = data.habits.filter((h) => !h.archived);
  const rows: string[][] = [CSV_HEADERS];
  const today = new Date();

  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const dayMarks = data.marks[key];
    if (!dayMarks) continue;

    for (const habit of active) {
      const status = dayMarks[habit.id];
      if (!status) continue;
      rows.push([key, escapeCSV(habit.name), habit.category, status, "yes"]);
    }
  }

  return rows.map((row) => row.join(",")).join("\n");
}

// Export full app data as JSON (for backup/restore).
export function exportJSON(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

// Import JSON data (validates structure with Zod).
export function importJSON(text: string): {
  data: AppData | null;
  error: string | null;
} {
  try {
    const parsed = JSON.parse(text);
    const result = ImportSchema.safeParse(parsed);
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue.path.length > 0 ? ` at "${issue.path.join(".")}"` : "";
      return { data: null, error: `${issue.message}${path}` };
    }
    return { data: result.data as unknown as AppData, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to parse JSON",
    };
  }
}

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
