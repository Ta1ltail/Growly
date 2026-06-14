"use client";

// Today — hero progress ring, habits grouped by category, and a daily note.

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Flame, NotebookPen, ListChecks } from "lucide-react";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import type { Habit } from "@/lib/types";
import { dateKey } from "@/lib/storage";
import {
  addHabit,
  cycleMark,
  deleteHabit,
  setNote,
  updateHabit,
  useAppData,
} from "@/lib/store";
import { habitStreaks, isScheduled } from "@/lib/stats";
import { useToday } from "@/hooks/useToday";
import { MarkButton } from "@/components/habits/MarkButton";
import { HabitForm } from "@/components/habits/HabitForm";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressRing } from "@/components/ui/ProgressRing";

export default function TodayPage() {
  const data = useAppData();
  const today = useToday();
  const todayKey = dateKey(today);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const bestStreakToday = useMemo(() => {
    let best = 0;
    for (const h of todaysHabits) best = Math.max(best, habitStreaks(h, data.marks, today).current);
    return best;
  }, [todaysHabits, data.marks, today]);

  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 18 ? "Good afternoon" : "Good evening";

  function handleAdd(input: { name: string; category: Category; repeatDays: number[] }) {
    addHabit({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...input });
    setShowAdd(false);
  }
  function handleEdit(base: Habit, input: { name: string; category: Category; repeatDays: number[] }) {
    updateHabit({ ...base, ...input });
    setEditingId(null);
  }

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <Card className="mb-6 overflow-hidden">
        <div className="relative flex items-center gap-5 p-5 sm:p-6">
          <div
            className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--c-accent)" }}
          />
          <ProgressRing value={progress} size={104}>
            <span className="font-mono text-2xl font-bold">{progress}%</span>
            <span className="text-[10px] text-muted">done</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-accent">
              {today.toLocaleDateString(undefined, { weekday: "long" })}
            </p>
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
              {greeting}, Justin
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <ListChecks className="size-4 text-accent" />
                {doneCount}/{todaysHabits.length} habits
              </span>
              <span className="flex items-center gap-1.5">
                <Flame className="size-4 text-amber-500" />
                {bestStreakToday} day streak
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Habits */}
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Today&apos;s habits
            </h2>
            {!showAdd && todaysHabits.length > 0 && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1 rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
              >
                <Plus className="size-3.5" strokeWidth={2.5} /> Add
              </button>
            )}
          </div>

          {todaysHabits.length === 0 && !showAdd ? (
            <EmptyState
              icon={ListChecks}
              title="No habits for today"
              hint="Add your first habit, or grab a ready-made routine from Templates."
              action={
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
                >
                  <Plus className="size-4" strokeWidth={2.5} /> Add habit
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {grouped.map((group) => (
                <div key={group.category}>
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[group.category] }}
                    />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {group.category}
                    </h3>
                  </div>
                  <Card className="divide-y divide-line overflow-hidden">
                    {group.habits.map((habit) => {
                      if (editingId === habit.id) {
                        return (
                          <div key={habit.id} className="p-2">
                            <HabitForm
                              initial={habit}
                              onSave={(input) => handleEdit(habit, input)}
                              onCancel={() => setEditingId(null)}
                            />
                          </div>
                        );
                      }
                      const status = data.marks[todayKey]?.[habit.id];
                      return (
                        <div
                          key={habit.id}
                          className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface2/50"
                        >
                          <MarkButton
                            status={status}
                            onClick={() => cycleMark(todayKey, habit.id)}
                            size={26}
                          />
                          <span
                            className={`flex-1 text-sm transition-colors ${
                              status === "done"
                                ? "text-muted line-through"
                                : status === "missed"
                                  ? "text-missed"
                                  : "text-ink"
                            }`}
                          >
                            {habit.name}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => setEditingId(habit.id)}
                              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-ink"
                              aria-label="Edit"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => deleteHabit(habit.id)}
                              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-missed/10 hover:text-missed"
                              aria-label="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                </div>
              ))}

              {showAdd && (
                <HabitForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
              )}

              {!showAdd && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line py-3 text-sm font-medium text-muted transition-all hover:border-accent hover:text-accent"
                >
                  <Plus className="size-4" strokeWidth={2.5} /> Add habit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Note */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <NotebookPen className="size-4" /> Today&apos;s note
          </h2>
          <Card className="p-1">
            <textarea
              value={data.notes[todayKey] ?? ""}
              onChange={(e) => setNote(todayKey, e.target.value)}
              placeholder="How did today go? What got in the way?"
              rows={6}
              className="w-full resize-none rounded-xl bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-faint"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
