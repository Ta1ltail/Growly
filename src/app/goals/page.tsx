"use client";

// Goals — track bigger targets with a progress bar and +/- steppers.

import { useState } from "react";
import { Plus, Minus, Trash2, Target, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import type { Goal } from "@/lib/types";
import { addGoal, deleteGoal, updateGoal, useAppData } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";

export default function GoalsPage() {
  const data = useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(20);

  function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed || target < 1) return;
    addGoal({
      id: crypto.randomUUID(),
      title: trimmed,
      target,
      current: 0,
      createdAt: new Date().toISOString(),
    });
    setTitle("");
    setTarget(20);
    setShowAdd(false);
  }

  function step(goal: Goal, delta: number) {
    updateGoal({ ...goal, current: Math.max(0, Math.min(goal.target, goal.current + delta)) });
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Goals"
        subtitle="Bigger targets to work toward"
        action={
          <Link href="/profile" className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
            <ArrowLeft className="size-4" /> Profile
          </Link>
        }
      />

      {data.goals.length === 0 && !showAdd ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          hint="Set a target like “Workout 20 times this month” and watch the bar fill."
          action={
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
            >
              <Plus className="size-4" strokeWidth={2.5} /> Add goal
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.goals.map((goal) => {
            const pct = Math.round((goal.current / goal.target) * 100);
            const complete = goal.current >= goal.target;
            return (
              <Card key={goal.id} className="p-4" interactive>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {complete && <Check className="size-4 text-done" strokeWidth={3} />}
                    {goal.title}
                  </span>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="rounded-lg p-1 text-muted transition-colors hover:bg-missed/10 hover:text-missed"
                    aria-label="Delete goal"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <ProgressBar value={pct} color={complete ? "var(--c-done)" : undefined} />
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted">
                    {goal.current} / {goal.target} · {pct}%
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => step(goal, -1)}
                      className="flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-all hover:bg-surface2 active:scale-90"
                    >
                      <Minus className="size-4" />
                    </button>
                    <button
                      onClick={() => step(goal, 1)}
                      className="flex size-8 items-center justify-center rounded-lg bg-accent text-white transition-all hover:brightness-110 active:scale-90"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}

          {showAdd && (
            <Card className="p-4 sm:col-span-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Goal — e.g. Read 12 books this year"
                className="w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
              />
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted">
                Target number
              </label>
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowAdd(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-muted hover:text-ink">
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
                >
                  <Check className="size-4" strokeWidth={2.5} /> Add goal
                </button>
              </div>
            </Card>
          )}
        </div>
      )}

      {!showAdd && data.goals.length > 0 && (
        <button
          onClick={() => setShowAdd(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line py-3 text-sm font-medium text-muted transition-all hover:border-accent hover:text-accent"
        >
          <Plus className="size-4" strokeWidth={2.5} /> Add goal
        </button>
      )}
    </div>
  );
}
