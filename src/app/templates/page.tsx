"use client";

// Templates — add a whole starter routine in one tap.

import { useState } from "react";
import { Plus, Check, ArrowLeft, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { CATEGORY_COLORS } from "@/lib/categories";
import { TEMPLATES, type Template } from "@/lib/templates";
import type { Habit } from "@/lib/types";
import { addHabit, useAppData } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

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
    <div className="animate-fade-in">
      <PageHeader
        title="Templates"
        subtitle={`${data.habits.length} habit${data.habits.length === 1 ? "" : "s"} so far`}
        action={
          <Link href="/profile" className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
            <ArrowLeft className="size-4" /> Profile
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {TEMPLATES.map((template) => {
          const isAdded = added === template.id;
          return (
            <Card key={template.id} className="p-5" interactive>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <LayoutTemplate className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">{template.name}</h2>
                    <p className="mt-0.5 text-xs text-muted">{template.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => applyTemplate(template)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95 ${
                    isAdded ? "bg-done/15 text-done" : "bg-accent text-white hover:brightness-110"
                  }`}
                >
                  {isAdded ? <Check className="size-3.5" strokeWidth={2.5} /> : <Plus className="size-3.5" strokeWidth={2.5} />}
                  {isAdded ? "Added" : "Add"}
                </button>
              </div>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {template.habits.map((h) => (
                  <li
                    key={h.name}
                    className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted"
                  >
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[h.category] }} />
                    {h.name}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
