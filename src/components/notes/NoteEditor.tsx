"use client";

// Note editor used inside a Modal. Supports body text, tags, and linking the
// note to a date, a habit, and/or a goal.

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import type { Habit, Goal, Note, NoteLinks } from "@/lib/types";

export interface NoteDraft {
  body: string;
  tags: string[];
  links: NoteLinks;
}

export function NoteEditor({
  initial,
  habits,
  goals,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: Note;
  habits: Habit[];
  goals: Goal[];
  onSave: (draft: NoteDraft) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [body, setBody] = useState(initial?.body ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [habitId, setHabitId] = useState(initial?.links.habitId ?? "");
  const [goalId, setGoalId] = useState(initial?.links.goalId ?? "");

  function submit() {
    if (!body.trim()) return;
    onSave({
      body: body.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      links: {
        ...(initial?.links.date ? { date: initial.links.date } : {}),
        ...(habitId ? { habitId } : {}),
        ...(goalId ? { goalId } : {}),
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a note… what happened, how you felt, what to change."
        rows={6}
        className="w-full resize-none rounded-xl border border-line bg-surface2 px-3.5 py-3 text-sm outline-none placeholder:text-faint focus:border-accent"
      />

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Tags
        </label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="comma, separated, tags"
          className="w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Link habit
          </label>
          <select
            value={habitId}
            onChange={(e) => setHabitId(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="">None</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Link goal
          </label>
          <select
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="">None</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-missed transition-colors hover:bg-missed/10"
          >
            <Trash2 className="size-4" /> Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!body.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            <Check className="size-4" strokeWidth={2.5} /> Save note
          </button>
        </div>
      </div>
    </div>
  );
}
