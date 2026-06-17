"use client";

// Templates — add a whole starter routine in one tap. Once a template is
// used it drops out of the picker (re-enable it from "Used templates").

import { Plus, Check, LayoutTemplate, RotateCcw } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { TEMPLATES, type Template } from "@/lib/templates";
import type { Habit } from "@/lib/types";
import { addHabit, markTemplateUsed, resetTemplateUsage, useAppData } from "@/lib/store";
import { dateKey } from "@/lib/storage";
import { uid } from "@/lib/util";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function TemplatesPage() {
  const data = useAppData();
  const used = new Set(data.settings.usedTemplateIds ?? []);
  const available = TEMPLATES.filter((t) => !used.has(t.id));
  const usedTemplates = TEMPLATES.filter((t) => used.has(t.id));

  function applyTemplate(template: Template) {
    const stamp = new Date().toISOString();
    const start = dateKey(new Date());
    for (const h of template.habits) {
      const habit: Habit = {
        id: uid(),
        name: h.name,
        category: h.category,
        repeatDays: h.repeatDays,
        createdAt: stamp,
        startDate: start,
        priority: "med",
        recurrence:
          h.repeatDays.length === 0 ? { kind: "daily" } : { kind: "weekly", weekdays: h.repeatDays },
      };
      addHabit(habit);
    }
    markTemplateUsed(template.id);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Templates"
        subtitle={`${data.habits.filter((h) => !h.archived).length} active habits`}
      />

      {available.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="All templates used"
          hint="You've applied every starter routine. Re-enable one below to add it again."
        />
      ) : (
        <div className="grid gap-4 stagger-children sm:grid-cols-2">
          {available.map((template) => (
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
                <Button size="sm" className="shrink-0" onClick={() => applyTemplate(template)}>
                  <Plus className="size-3.5" strokeWidth={2.5} /> Add
                </Button>
              </div>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {template.habits.map((h) => (
                  <li key={h.name} className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[h.category] }} />
                    {h.name}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {usedTemplates.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wide text-faint">Used templates</h2>
          <Card className="divide-y divide-line overflow-hidden">
            {usedTemplates.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <Check className="size-4 text-done" strokeWidth={2.5} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="truncate text-xs text-muted">{t.description}</p>
                </div>
                <button
                  onClick={() => resetTemplateUsage(t.id)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
                >
                  <RotateCcw className="size-3.5" /> Re-enable
                </button>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
