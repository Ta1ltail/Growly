"use client";

// Templates — add a whole starter routine in one tap. Once a template is
// used it drops out of the picker (re-enable it from "Used templates").
// Fixed 3x2 grid with pagination — no page-level scrolling.

import { useState } from "react";
import {
  Plus,
  Check,
  LayoutTemplate,
  RotateCcw,
  Eye,
  Sparkles,
} from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { TEMPLATES } from "@/lib/templates";
import {
  addHabit,
  markTemplateUsed,
  resetTemplateUsage,
  useAppDataSelector,
} from "@/lib/store";
import { dateKey } from "@/lib/date";
import { uid } from "@/lib/util";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { AppPageShell } from "@/components/layout/AppPageShell";


const TEMPLATES_PER_PAGE = 6; // 3x2 grid

export default function TemplatesPage() {
  const habits = useAppDataSelector((d) => d.habits);
  const usedTemplateIds = useAppDataSelector((d) => d.settings.usedTemplateIds);
  const activeHabits = habits.filter((h) => !h.archived && !h.deletedAt);
  const used = new Set(usedTemplateIds ?? []);
  const available = TEMPLATES.filter((t) => !used.has(t.id));
  const usedTemplates = TEMPLATES.filter((t) => used.has(t.id));
  const [preview, setPreview] = useState<
    (typeof TEMPLATES)[number] | null
  >(null);
  const [page, setPage] = useState(0);

  const pageCount = Math.ceil(available.length / TEMPLATES_PER_PAGE);
  const pageItems = available.slice(
    page * TEMPLATES_PER_PAGE,
    (page + 1) * TEMPLATES_PER_PAGE,
  );

  function applyTemplate(template: (typeof TEMPLATES)[number]) {
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
          h.repeatDays.length === 0
            ? { kind: "daily" }
            : { kind: "weekly", weekdays: h.repeatDays },
      });
    }
    markTemplateUsed(template.id);
    // Reset page if needed after template removal
    const remaining = available.length - 1;
    const newPageCount = Math.ceil(remaining / TEMPLATES_PER_PAGE);
    if (page >= newPageCount && newPageCount > 0) {
      setPage(newPageCount - 1);
    }
  }

  const difficultyColor = (d?: string) => {
    if (d === "Beginner") return "text-emerald-500 bg-emerald-500/10";
    if (d === "Intermediate") return "text-amber-500 bg-amber-500/10";
    if (d === "Advanced") return "text-rose-500 bg-rose-500/10";
    return "text-muted bg-surface2";
  };

  return (
    <AppPageShell>
      <PageHeader
        title="Templates"
        subtitle={`${activeHabits.length} active habits`}
      />

      {available.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="All templates used"
          hint="You've applied every starter routine. Re-enable one below to add it again."
          illustration="templates"
        />
      ) : (
        <div>
          {/* Responsive auto-height grid — cards in a row stretch to equal
              height; the page scrolls naturally so stacking never collapses or
              overlaps a card. */}
          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((template) => (
              <Card
                key={template.id}
                className="flex h-full flex-col p-5"
                interactive
              >
                <button
                  onClick={() => setPreview(template)}
                  className="flex w-full flex-1 flex-col text-left"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <LayoutTemplate className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-semibold">{template.name}</h2>
                      <p className="mt-0.5 text-xs text-muted line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    {template.difficulty && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${difficultyColor(template.difficulty)}`}
                      >
                        {template.difficulty}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 pointer-events-none">
                    {template.habits.map((h) => (
                      <span
                        key={h.name}
                        className="flex items-center gap-1.5 rounded-full border border-line px-2 py-1 text-[11px] text-muted"
                      >
                        <span
                          className="size-1.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              CATEGORY_COLORS[h.category] || "#94a3b8",
                          }}
                        />
                        {h.name}
                      </span>
                    ))}
                  </div>
                </button>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => applyTemplate(template)}
                  >
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

          {/* Pagination below the grid */}
          {pageCount > 1 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              total={available.length}
              pageSize={TEMPLATES_PER_PAGE}
              onChange={setPage}
            />
          )}
        </div>
      )}

      {usedTemplates.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-faint">
            Used templates
          </h2>
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
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${difficultyColor(preview.difficulty)}`}
                >
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
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg bg-surface2/50 px-3 py-2"
                  >
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[h.category] || "#94a3b8",
                      }}
                    />
                    <span className="flex-1 text-sm">{h.name}</span>
                    <span className="text-[11px] text-faint">
                      {h.repeatDays.length === 0
                        ? "Daily"
                        : h.repeatDays.length === 5 &&
                            [1, 2, 3, 4, 5].every((d) =>
                              h.repeatDays.includes(d),
                            )
                          ? "Weekdays"
                          : `${h.repeatDays.length} days/wk`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                applyTemplate(preview);
                setPreview(null);
              }}
            >
              <Plus className="size-4" strokeWidth={2.5} /> Add this template
            </Button>
          </div>
        )}
      </Modal>
    </AppPageShell>
  );
}
