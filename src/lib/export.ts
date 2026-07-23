// Data export/import utilities: convert habit data to/from CSV and JSON.
// Used by Settings for data portability.

import { z } from "zod";
import type { AppData } from "./types";
import { dateKey } from "./date";
import { isScheduled } from "./stats";

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
  // Default the array fields so a valid-but-partial backup (e.g. only habits +
  // marks) still yields concrete arrays. Consumers read imported.notes/.goals
  // directly, so leaving these undefined would crash on import.
  notes: z.array(z.unknown()).optional().default([]),
  goals: z.array(z.unknown()).optional().default([]),
  auditLog: z.array(z.unknown()).optional().default([]),
  settings: z.unknown().optional(),
  profile: z.unknown().optional(),
  unlocks: z.unknown().optional(),
  economy: z.unknown().optional(),
  progressSeen: z.unknown().optional(),
});

// Export habit marks as CSV text.
// Rows: one per habit per day for the last `days` days.
export function exportMarksCSV(data: AppData, days = 90): string {
  const active = data.habits.filter((h) => !h.archived && !h.deletedAt);
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
      const scheduled = isScheduled(habit, d) ? "yes" : "no";
      rows.push([
        key,
        escapeCSV(habit.name),
        escapeCSV(habit.category),
        status,
        scheduled,
      ]);
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
  // Guard against CSV formula injection: a leading =, +, -, @, tab or CR makes
  // spreadsheet apps evaluate the cell as a formula. Prefix with a single quote
  // to neutralize it, then apply standard quoting for delimiters/quotes.
  let out = val;
  if (/^[=+\-@\t\r]/.test(out)) out = `'${out}`;
  if (out.includes(",") || out.includes('"') || out.includes("\n")) {
    return `"${out.replace(/"/g, '""')}"`;
  }
  return out;
}
