"use client";

// Reusable add/edit form for a habit. Used by Today and Tracker.
// Pass `initial` to edit an existing habit; omit it to create a new one.

import { useState } from "react";
import { CATEGORIES, type Category } from "@/lib/categories";
import type { Habit } from "@/lib/types";

const WEEKDAYS = [
  { label: "M", value: 1 },
  { label: "T", value: 2 },
  { label: "W", value: 3 },
  { label: "T", value: 4 },
  { label: "F", value: 5 },
  { label: "S", value: 6 },
  { label: "S", value: 0 },
];

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function HabitForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Habit;
  onSave: (data: { name: string; category: Category; repeatDays: number[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "Workout");
  const [days, setDays] = useState<number[]>(
    initial && initial.repeatDays.length > 0 ? initial.repeatDays : ALL_DAYS,
  );

  function toggleDay(value: number) {
    setDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      name: trimmed,
      category,
      repeatDays: days.length === 7 ? [] : days,
    });
  }

  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Habit name (e.g. Morning run)"
        className="w-full rounded border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <label className="mt-3 block text-xs font-medium text-muted">Category</label>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as Category)}
        className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label className="mt-3 block text-xs font-medium text-muted">Repeat on</label>
      <div className="mt-1 flex gap-1.5">
        {WEEKDAYS.map((d, i) => {
          const active = days.includes(d.value);
          return (
            <button
              key={i}
              onClick={() => toggleDay(d.value)}
              className={`size-8 rounded text-xs font-semibold transition-colors ${
                active ? "bg-accent text-white" : "bg-bg text-muted hover:bg-empty"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded px-3 py-1.5 text-sm text-muted hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          {initial ? "Save changes" : "Save"}
        </button>
      </div>
    </div>
  );
}
