"use client";

// Templates — add a whole starter routine in one tap. Once a template is
// used it drops out of the picker (re-enable it from "Used templates").
// Fixed-size cards with a preview modal showing template details.

import { useState } from "react";
import { Plus, Check, LayoutTemplate, RotateCcw, Eye, X, Sparkles } from "lucide-react";
import { CATEGORIES, CATEGORY_COLORS } from "@/lib/categories";
import { TEMPLATES } from "@/lib/templates";
import { addHabit, markTemplateUsed, resetTemplateUsage, useAppData } from "@/lib/store";
import { dateKey } from "@/lib/storage";
import { uid } from "@/lib/util";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Template } from "@/lib/templates";

// Extended templates with more variety
const EXTENDED_TEMPLATES: (Template & {
  benefits?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
})[] = [
  ...TEMPLATES.map(t => ({
    ...t,
    benefits: t.id === "gym" ? "Build strength, improve recovery, and establish a consistent fitness routine." :
              t.id === "student" ? "Sharpen your focus, retain more information, and ace your studies." :
              t.id === "morning" ? "Start each day with purpose and set a positive tone for the hours ahead." :
              t.id === "wellbeing" ? "Reduce stress, increase mindfulness, and find calm in your daily life." : undefined,
    difficulty: t.id === "gym" ? "Intermediate" as const :
                t.id === "student" ? "Intermediate" as const :
                t.id === "morning" ? "Beginner" as const :
                t.id === "wellbeing" ? "Beginner" as const : undefined,
  })),
  {
    id: "evening-winddown",
    name: "Evening Wind-Down",
    description: "End your day with calm and reflection.",
    benefits: "Improve sleep quality, process your day, and wake up refreshed.",
    difficulty: "Beginner",
    habits: [
      { name: "No screens 1hr before bed", category: "Lifestyle", repeatDays: [] },
      { name: "Journal 5 min", category: "Personal", repeatDays: [] },
      { name: "Read fiction 20 min", category: "Hobbies", repeatDays: [] },
      { name: "Stretch / light yoga", category: "Health", repeatDays: [] },
      { name: "Plan tomorrow", category: "Personal", repeatDays: [] },
    ],
  },
  {
    id: "productivity-max",
    name: "Productivity Max",
    description: "Crush your work goals with laser focus.",
    benefits: "Eliminate distractions, maintain deep focus, and ship more work.",
    difficulty: "Advanced",
    habits: [
      { name: "Pomodoro 4x sessions", category: "Work", repeatDays: [1, 2, 3, 4, 5] },
      { name: "Inbox zero", category: "Work", repeatDays: [1, 2, 3, 4, 5] },
      { name: "Top 3 priorities list", category: "Personal", repeatDays: [] },
      { name: "No social media until noon", category: "Lifestyle", repeatDays: [1, 2, 3, 4, 5] },
      { name: "Review weekly goals", category: "Work", repeatDays: [5] },
    ],
  },
  {
    id: "mindful-living",
    name: "Mindful Living",
    description: "Cultivate presence and gratitude every day.",
    benefits: "Reduce anxiety, increase happiness, and build emotional resilience.",
    difficulty: "Beginner",
    habits: [
      { name: "Meditate 10 min", category: "Health", repeatDays: [] },
      { name: "Gratitude journal", category: "Personal", repeatDays: [] },
      { name: "Digital detox 1hr", category: "Lifestyle", repeatDays: [] },
      { name: "Mindful meal (no phone)", category: "Health", repeatDays: [] },
      { name: "Evening reflection", category: "Personal", repeatDays: [] },
    ],
  },
  {
    id: "health-optimizer",
    name: "Health Optimizer",
    description: "Transform your physical and mental well-being.",
    benefits: "More energy, better sleep, stronger body, and sharper mind.",
    difficulty: "Intermediate",
    habits: [
      { name: "Workout 45 min", category: "Workout", repeatDays: [1, 2, 4, 5] },
      { name: "Drink 8 glasses water", category: "Health", repeatDays: [] },
      { name: "Sleep 8 hours", category: "Health", repeatDays: [] },
      { name: "Meal prep / healthy eating", category: "Health", repeatDays: [0] },
      { name: "Walk 10k steps", category: "Workout", repeatDays: [] },
      { name: "Take vitamins", category: "Health", repeatDays: [] },
    ],
  },
  {
    id: "creative-spark",
    name: "Creative Spark",
    description: "Nurture your creative side and explore new passions.",
    benefits: "Unlock creativity, learn new skills, and find joy in creation.",
    difficulty: "Beginner",
    habits: [
      { name: "Create something (write/draw/build)", category: "Hobbies", repeatDays: [] },
      { name: "Learn a new skill 30 min", category: "Studies", repeatDays: [1, 3, 5] },
      { name: "Read inspiring content", category: "Hobbies", repeatDays: [] },
      { name: "Brain dump ideas", category: "Personal", repeatDays: [] },
    ],
  },
];

const CATEGORY_COLORS_MAP: Record<string, string> = {
  ...CATEGORY_COLORS,
  Lifestyle: "#F59E0B",
  Personal: "#F43F5E",
  Chores: "#94A3B8",
};

export default function TemplatesPage() {
  const data = useAppData();
  const used = new Set(data.settings.usedTemplateIds ?? []);
  const available = EXTENDED_TEMPLATES.filter((t) => !used.has(t.id));
  const usedTemplates = EXTENDED_TEMPLATES.filter((t) => used.has(t.id));
  const [preview, setPreview] = useState<(typeof EXTENDED_TEMPLATES[number]) | null>(null);

  function applyTemplate(template: typeof EXTENDED_TEMPLATES[number]) {
    const stamp = new Date().toISOString();
    const start = dateKey(new Date());
    for (const h of template.habits) {
      addHabit({
        id: uid(),
        name: h.name,
        category: h.category,
        repeatDays: h.repeatDays,
        createdAt: stamp,
        startDate: start,
        priority: "med",
        recurrence:
          h.repeatDays.length === 0 ? { kind: "daily" } : { kind: "weekly", weekdays: h.repeatDays },
      });
    }
    markTemplateUsed(template.id);
  }

  const difficultyColor = (d?: string) => {
    if (d === "Beginner") return "text-emerald-500 bg-emerald-500/10";
    if (d === "Intermediate") return "text-amber-500 bg-amber-500/10";
    if (d === "Advanced") return "text-rose-500 bg-rose-500/10";
    return "text-muted bg-surface2";
  };

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
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 flex flex-col gap-4">
        <div className="grid gap-4 stagger-children sm:grid-cols-2 lg:grid-cols-3">
          {available.map((template) => (
            <Card key={template.id} className="p-5 flex flex-col cursor-pointer" interactive>
              <button onClick={() => setPreview(template)} className="flex flex-col flex-1 text-left w-full">
                <div className="flex items-start justify-between gap-3 shrink-0">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <LayoutTemplate className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold truncate">{template.name}</h2>
                      <p className="mt-0.5 text-xs text-muted line-clamp-2">{template.description}</p>
                    </div>
                  </div>
                </div>

                {template.difficulty && (
                  <span className={`inline-flex self-start mt-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${difficultyColor(template.difficulty)}`}>
                    {template.difficulty}
                  </span>
                )}

                <div className="mt-3 flex-1 min-h-0 overflow-y-auto pointer-events-none">
                  <div className="flex flex-wrap gap-1.5">
                    {template.habits.map((h) => (
                      <span key={h.name} className="flex items-center gap-1.5 rounded-full border border-line px-2 py-1 text-[11px] text-muted">
                        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS_MAP[h.category] || "#94a3b8" }} />
                        {h.name}
                      </span>
                    ))}
                  </div>
                </div>
              </button>

              <div className="mt-4 flex items-center gap-2 shrink-0">
                <Button size="sm" className="flex-1" onClick={() => applyTemplate(template)}>
                  <Plus className="size-3.5" strokeWidth={2.5} /> Add
                </Button>
                <button
                  onClick={() => setPreview(template)}
                  className="flex size-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-surface2 hover:text-ink transition-colors"
                  aria-label="Preview template"
                >
                  <Eye className="size-3.5" />
                </button>
              </div>
            </Card>
          ))}

        </div>
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

      {/* Preview Modal */}
      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.name ?? ""}
        size="md"
      >
        {preview && (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-muted">{preview.description}</p>
              {preview.benefits && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-accent/5 p-3">
                  <Sparkles className="size-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-sm text-ink">{preview.benefits}</p>
                </div>
              )}
            </div>

            {preview.difficulty && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Difficulty:</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${difficultyColor(preview.difficulty)}`}>
                  {preview.difficulty}
                </span>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Habits ({preview.habits.length})
              </h3>
              <div className="space-y-2">
                {preview.habits.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-surface2/50 px-3 py-2">
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS_MAP[h.category] || "#94a3b8" }} />
                    <span className="flex-1 text-sm">{h.name}</span>
                    <span className="text-[11px] text-faint">
                      {h.repeatDays.length === 0 ? "Daily" : h.repeatDays.length === 5 && [1,2,3,4,5].every(d => h.repeatDays.includes(d)) ? "Weekdays" : `${h.repeatDays.length} days/wk`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={() => { applyTemplate(preview); setPreview(null); }}>
              <Plus className="size-4" strokeWidth={2.5} /> Add this template
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
