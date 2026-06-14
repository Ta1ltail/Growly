"use client";

// Goals — track bigger targets with a progress bar and +/- buttons.

import { useState } from "react";
import type { Goal } from "@/lib/types";
import { addGoal, deleteGoal, updateGoal, useAppData } from "@/lib/store";

export default function GoalsPage() {
  const data = useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(20);

  function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed || target < 1) return;
    const goal: Goal = {
      id: crypto.randomUUID(),
      title: trimmed,
      target,
      current: 0,
      createdAt: new Date().toISOString(),
    };
    addGoal(goal);
    setTitle("");
    setTarget(20);
    setShowAdd(false);
  }

  function step(goal: Goal, delta: number) {
    const current = Math.max(0, Math.min(goal.target, goal.current + delta));
    updateGoal({ ...goal, current });
  }

  return (
    <>
      <header className="flex items-center justify-between pt-6 pb-4">
        <h1 className="font-mono text-lg font-semibold tracking-tight">Goals</h1>
        <a href="/profile" className="text-sm text-muted hover:text-ink">
          ‹ Profile
        </a>
      </header>

      {data.goals.length === 0 && !showAdd && (
        <div className="rounded-md border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
          No goals yet. Set a target like “Workout 20 times this month”.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {data.goals.map((goal) => {
          const pct = Math.round((goal.current / goal.target) * 100);
          const complete = goal.current >= goal.target;
          return (
            <div key={goal.id} className="rounded-md border border-line bg-surface p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{goal.title}</span>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="text-xs text-muted hover:text-missed"
                  aria-label="Delete goal"
                >
                  ✕
                </button>
              </div>
              <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-empty">
                <div
                  className={`h-full rounded-full transition-all ${
                    complete ? "bg-done" : "bg-accent"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted">
                  {goal.current} / {goal.target} ({pct}%)
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => step(goal, -1)}
                    className="size-7 rounded border border-line text-sm hover:bg-empty"
                  >
                    −
                  </button>
                  <button
                    onClick={() => step(goal, 1)}
                    className="size-7 rounded border border-line text-sm hover:bg-empty"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd ? (
        <div className="mt-4 rounded-md border border-line bg-surface p-4">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal (e.g. Read 12 books this year)"
            className="w-full rounded border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <label className="mt-3 block text-xs font-medium text-muted">Target number</label>
          <input
            type="number"
            min={1}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="rounded px-3 py-1.5 text-sm text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Add goal
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="mt-4 w-full rounded-md border border-dashed border-line bg-surface py-3 text-sm font-medium text-accent hover:bg-empty"
        >
          + Add goal
        </button>
      )}
    </>
  );
}
