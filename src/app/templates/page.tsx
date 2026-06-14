"use client";

// Templates — add a whole starter routine in one tap.

import { useState } from "react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { TEMPLATES, type Template } from "@/lib/templates";
import type { Habit } from "@/lib/types";
import { addHabit, useAppData } from "@/lib/store";

export default function TemplatesPage() {
  const data = useAppData();
  const [added, setAdded] = useState<string | null>(null);

  function applyTemplate(template: Template) {
    const stamp = new Date().toISOString();
    for (const h of template.habits) {
      const habit: Habit = {
        id: crypto.randomUUID(),
        name: h.name,
        category: h.category,
        repeatDays: h.repeatDays,
        createdAt: stamp,
      };
      addHabit(habit);
    }
    setAdded(template.id);
  }

  return (
    <>
      <header className="flex items-center justify-between pt-6 pb-4">
        <h1 className="font-mono text-lg font-semibold tracking-tight">Templates</h1>
        <a href="/profile" className="text-sm text-muted hover:text-ink">
          ‹ Profile
        </a>
      </header>

      <p className="mb-4 text-sm text-muted">
        Tap a template to add its habits. You currently have{" "}
        <span className="font-semibold text-ink">{data.habits.length}</span> habit
        {data.habits.length === 1 ? "" : "s"}.
      </p>

      <div className="flex flex-col gap-3">
        {TEMPLATES.map((template) => (
          <div key={template.id} className="rounded-md border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">{template.name}</h2>
                <p className="text-xs text-muted">{template.description}</p>
              </div>
              <button
                onClick={() => applyTemplate(template)}
                className="shrink-0 rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                {added === template.id ? "Added ✓" : "+ Add"}
              </button>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {template.habits.map((h) => (
                <li
                  key={h.name}
                  className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs"
                >
                  <span
                    className="size-2 rounded-sm"
                    style={{ backgroundColor: CATEGORY_COLORS[h.category] }}
                  />
                  {h.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
