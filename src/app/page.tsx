"use client";

// The Today page — add habits, mark them, see today's progress, jot a note.

import { useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import type { Habit } from "@/lib/types";
import { dateKey, prettyDate } from "@/lib/storage";
import {
  addHabit,
  cycleMark,
  deleteHabit,
  setNote,
  updateHabit,
  useAppData,
} from "@/lib/store";
import { isScheduled } from "@/lib/stats";
import { MarkButton } from "@/components/MarkButton";
import { HabitForm } from "@/components/HabitForm";

export default function TodayPage() {
  const data = useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const todaysHabits = useMemo(
    () => data.habits.filter((h) => isScheduled(h, today)),
    [data.habits, today],
  );

  const grouped = useMemo(() => {
    const map = new Map<Category, Habit[]>();
    for (const h of todaysHabits) {
      const list = map.get(h.category) ?? [];
      list.push(h);
      map.set(h.category, list);
    }
    return CATEGORIES.map((c) => ({ category: c, habits: map.get(c) ?? [] })).filter(
      (g) => g.habits.length > 0,
    );
  }, [todaysHabits]);

  const doneCount = todaysHabits.filter(
    (h) => data.marks[todayKey]?.[h.id] === "done",
  ).length;
  const progress =
    todaysHabits.length === 0 ? 0 : Math.round((doneCount / todaysHabits.length) * 100);

  function handleAdd(input: { name: string; category: Category; repeatDays: number[] }) {
    const habit: Habit = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    addHabit(habit);
    setShowAdd(false);
  }

  function handleEdit(
    base: Habit,
    input: { name: string; category: Category; repeatDays: number[] },
  ) {
    updateHabit({ ...base, ...input });
    setEditingId(null);
  }

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between pt-6 pb-4">
        <div>
          <h1 className="font-mono text-lg font-semibold tracking-tight">project_101</h1>
          <p className="text-sm text-muted">{prettyDate(today)}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
          J
        </div>
      </header>

      {/* Progress */}
      <section className="mb-6 rounded-md border border-line bg-surface p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted">Today&apos;s progress</span>
          <span className="font-mono font-semibold">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-empty">
          <div
            className="h-full rounded-full bg-done transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-xs text-muted">
          {doneCount} / {todaysHabits.length} done
        </p>
      </section>

      {/* Empty state */}
      {todaysHabits.length === 0 && !showAdd && (
        <div className="rounded-md border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
          No habits for today yet.
          <br />
          Tap <span className="font-semibold text-ink">+ Add habit</span> to start.
        </div>
      )}

      {/* Habit list grouped by category */}
      <div className="flex flex-col gap-5">
        {grouped.map((group) => (
          <section key={group.category}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: CATEGORY_COLORS[group.category] }}
              />
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {group.category}
              </h2>
            </div>
            <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
              {group.habits.map((habit) => {
                if (editingId === habit.id) {
                  return (
                    <li key={habit.id} className="p-2">
                      <HabitForm
                        initial={habit}
                        onSave={(input) => handleEdit(habit, input)}
                        onCancel={() => setEditingId(null)}
                      />
                    </li>
                  );
                }
                const status = data.marks[todayKey]?.[habit.id];
                return (
                  <li
                    key={habit.id}
                    className="group flex items-center gap-3 px-3 py-2.5"
                  >
                    <MarkButton
                      status={status}
                      onClick={() => cycleMark(todayKey, habit.id)}
                    />
                    <button
                      onClick={() => setEditingId(habit.id)}
                      className={`flex-1 text-left text-sm ${
                        status === "done"
                          ? "text-muted line-through"
                          : status === "missed"
                            ? "text-missed"
                            : "text-ink"
                      }`}
                    >
                      {habit.name}
                    </button>
                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="text-xs text-muted opacity-0 transition-opacity hover:text-missed group-hover:opacity-100"
                      aria-label="Delete habit"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Add habit */}
      {showAdd ? (
        <div className="mt-5">
          <HabitForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="mt-5 w-full rounded-md border border-dashed border-line bg-surface py-3 text-sm font-medium text-accent hover:bg-empty"
        >
          + Add habit
        </button>
      )}

      {/* Today's note */}
      <section className="mt-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
          Today&apos;s note
        </label>
        <textarea
          value={data.notes[todayKey] ?? ""}
          onChange={(e) => setNote(todayKey, e.target.value)}
          placeholder="How did today go? Why did you skip something?"
          rows={3}
          className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </section>
    </>
  );
}
