"use client";

// Reusable add/edit habit form. Pass `initial` to edit; omit to create.

import { useState } from "react";
import { Check } from "lucide-react";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
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
    onSave({ name: trimmed, category, repeatDays: days.length === 7 ? [] : days });
  }

  return (
    <div className="animate-rise rounded-2xl border border-line bg-surface p-4">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Habit name — e.g. Morning run"
        className="w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent"
      />

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
        Category
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const active = c === category;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                active ? "border-transparent text-white" : "border-line text-muted hover:text-ink"
              }`}
              style={active ? { backgroundColor: CATEGORY_COLORS[c] } : undefined}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: active ? "#fff" : CATEGORY_COLORS[c] }}
              />
              {c}
            </button>
          );
        })}
      </div>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
        Repeat on
      </label>
      <div className="mt-2 flex gap-1.5">
        {WEEKDAYS.map((d, i) => {
          const active = days.includes(d.value);
          return (
            <button
              key={i}
              onClick={() => toggleDay(d.value)}
              className={`size-9 rounded-xl text-xs font-semibold transition-all active:scale-90 ${
                active ? "bg-accent text-white" : "bg-surface2 text-muted hover:text-ink"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
        >
          <Check className="size-4" strokeWidth={2.5} />
          {initial ? "Save changes" : "Add habit"}
        </button>
      </div>
    </div>
  );
}
