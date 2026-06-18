// Data export/import utilities: convert habit data to/from CSV and JSON.
// Used by Settings for data portability.

import type { AppData } from "./types";
import { dateKey } from "./storage";

// CSV header for habit marks export.
const CSV_HEADERS = ["Date", "Habit", "Category", "Status", "Scheduled"];

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
      rows.push([
        key,
        escapeCSV(habit.name),
        habit.category,
        status,
        "yes",
      ]);
    }
  }

  return rows.map((row) => row.join(",")).join("\n");
}

// Export full app data as JSON (for backup/restore).
export function exportJSON(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

// Import JSON data (validates structure).
export function importJSON(text: string): { data: AppData | null; error: string | null } {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { data: null, error: "Invalid format: root must be an object" };
    }
    if (!Array.isArray(parsed.habits)) {
      return { data: null, error: "Invalid format: missing habits array" };
    }
    if (typeof parsed.marks !== "object") {
      return { data: null, error: "Invalid format: missing marks object" };
    }
    return { data: parsed as unknown as AppData, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed to parse JSON" };
  }
}

// Export notes as plain text.
export function exportNotesText(data: AppData): string {
  const sorted = [...data.notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return sorted
    .map((n) => {
      const date = n.links.date ? `[${n.links.date}]` : `[${new Date(n.createdAt).toLocaleDateString()}]`;
      return `${date} ${n.body}\n${n.tags.length > 0 ? `Tags: ${n.tags.join(", ")}` : ""}\n---`;
    })
    .join("\n\n");
}

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
