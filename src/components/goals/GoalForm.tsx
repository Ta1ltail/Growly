"use client";

// Goal editor used inside a Modal: title, target, category, deadline,
// linked habits, and milestones.

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import type { Goal, Habit, Milestone } from "@/lib/types";
import { uid } from "@/lib/util";

export function GoalForm({
  initial,
  habits,
  onSave,
  onCancel,
}: {
  initial?: Goal;
  habits: Habit[];
  onSave: (goal: Goal) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [target, setTarget] = useState(initial?.target ?? 20);
  const [category, setCategory] = useState<Category | "">(initial?.category ?? "");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [linked, setLinked] = useState<string[]>(initial?.linkedHabitIds ?? []);
  const [milestones, setMilestones] = useState<Milestone[]>(initial?.milestones ?? []);
  const [msTitle, setMsTitle] = useState("");
  const [msAt, setMsAt] = useState(0);

  function toggleLinked(id: string) {
    setLinked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addMilestone() {
    if (!msTitle.trim() || msAt <= 0) return;
    setMilestones((prev) =>
      [...prev, { id: uid(), title: msTitle.trim(), at: msAt, done: false }].sort((a, b) => a.at - b.at),
    );
    setMsTitle("");
    setMsAt(0);
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || target < 1) return;
    onSave({
      id: initial?.id ?? uid(),
      title: trimmed,
      target,
      current: initial?.current ?? 0,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      category: category || undefined,
      deadline: deadline || undefined,
      linkedHabitIds: linked.length ? linked : undefined,
      milestones: milestones.length ? milestones : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Goal</Label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Read 12 books this year"
          className="w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Target number</Label>
          <input
            type="number"
            min={1}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <Label>Deadline</Label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <Label>Category</Label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
              category === "" ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-ink"
            }`}
          >
            None
          </button>
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                type="button"
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
      </div>

      {habits.length > 0 && (
        <div>
          <Label>Linked habits</Label>
          <div className="flex flex-wrap gap-1.5">
            {habits.map((h) => {
              const active = linked.includes(h.id);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => toggleLinked(h.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                    active ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {h.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <Label>Milestones</Label>
        {milestones.length > 0 && (
          <ul className="mb-2 flex flex-col gap-1.5">
            {milestones.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-line bg-surface2 px-3 py-1.5 text-xs"
              >
                <span>
                  {m.title} <span className="font-mono text-muted">@ {m.at}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMilestones((prev) => prev.filter((x) => x.id !== m.id))}
                  className="text-muted hover:text-missed"
                  aria-label="Remove milestone"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            value={msTitle}
            onChange={(e) => setMsTitle(e.target.value)}
            placeholder="Milestone title"
            className="flex-1 rounded-xl border border-line bg-surface2 px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent"
          />
          <input
            type="number"
            min={1}
            value={msAt || ""}
            onChange={(e) => setMsAt(Number(e.target.value))}
            placeholder="at"
            className="w-16 rounded-xl border border-line bg-surface2 px-2 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={addMilestone}
            className="flex items-center justify-center rounded-xl border border-line px-3 text-muted transition-colors hover:bg-surface2 hover:text-ink"
            aria-label="Add milestone"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
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
          disabled={!title.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
        >
          <Check className="size-4" strokeWidth={2.5} /> {initial ? "Save goal" : "Add goal"}
        </button>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </label>
  );
}
