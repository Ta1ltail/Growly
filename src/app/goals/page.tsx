"use client";

// Goals — bigger targets with progress, milestones, deadlines, linked habits.
// Add/edit happen in a modal.

import { useState } from "react";
import { Plus, Minus, Trash2, Target, Check, Pencil, Flag, CircleDot } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/categories";
import type { Goal } from "@/lib/types";
import { addGoal, deleteGoal, updateGoal, useAppData } from "@/lib/store";
import { parseDateKey } from "@/lib/storage";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { GoalForm } from "@/components/goals/GoalForm";

export default function GoalsPage() {
  const data = useAppData();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  function step(goal: Goal, delta: number) {
    const current = Math.max(0, Math.min(goal.target, goal.current + delta));
    const milestones = goal.milestones?.map((m) => ({ ...m, done: current >= m.at }));
    updateGoal({ ...goal, current, milestones });
  }

  function save(goal: Goal) {
    if (editing) updateGoal(goal);
    else addGoal(goal);
    setAdding(false);
    setEditing(null);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Goals"
        subtitle="Bigger targets to work toward"
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" strokeWidth={2.5} /> New goal
          </Button>
        }
      />

      {data.goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          hint="Set a target like “Workout 20 times this month” and watch the bar fill."
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" strokeWidth={2.5} /> Add goal
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 stagger-children sm:grid-cols-2">
          {data.goals.map((goal) => {
            const pct = Math.round((goal.current / goal.target) * 100);
            const complete = goal.current >= goal.target;
            return (
              <Card key={goal.id} className="p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {complete && <Check className="size-4 text-done" strokeWidth={3} />}
                      {goal.title}
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      {goal.category && (
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[goal.category] }} />
                          {goal.category}
                        </span>
                      )}
                      {goal.deadline && (
                        <span className="flex items-center gap-1">
                          <Flag className="size-3" />
                          {parseDateKey(goal.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => setEditing(goal)} className="rounded-lg p-1 text-muted transition-colors hover:bg-surface2 hover:text-ink" aria-label="Edit goal">
                      <Pencil className="size-3.5" />
                    </button>
                    <button onClick={() => deleteGoal(goal.id)} className="rounded-lg p-1 text-muted transition-colors hover:bg-missed/10 hover:text-missed" aria-label="Delete goal">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <ProgressBar value={pct} color={complete ? "var(--c-done)" : undefined} />

                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted">{goal.current} / {goal.target} · {pct}%</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => step(goal, -1)} aria-label={`Decrease ${goal.title} progress`} className="flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-all hover:bg-surface2 active:scale-90">
                      <Minus className="size-4" />
                    </button>
                    <button onClick={() => step(goal, 1)} aria-label={`Increase ${goal.title} progress`} className="flex size-8 items-center justify-center rounded-lg bg-accent text-white transition-all hover:brightness-110 active:scale-90">
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                {goal.milestones && goal.milestones.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
                    {goal.milestones.map((m) => (
                      <li key={m.id} className={`flex items-center gap-2 text-xs ${m.done ? "text-done" : "text-muted"}`}>
                        {m.done ? <Check className="size-3.5" strokeWidth={3} /> : <CircleDot className="size-3.5" />}
                        <span className={m.done ? "line-through" : ""}>{m.title}</span>
                        <span className="ml-auto font-mono text-faint">@ {m.at}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={adding || editing !== null}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        title={editing ? "Edit goal" : "Add goal"}
        size="lg"
      >
        <GoalForm
          initial={editing ?? undefined}
          habits={data.habits.filter((h) => !h.archived)}
          onSave={save}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      </Modal>
    </div>
  );
}
