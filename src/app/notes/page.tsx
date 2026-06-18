"use client";

// Notes — searchable, taggable notes linked to dates, habits, and goals.
// Simple box-style cards with consistent sizing. Long content scrolls internally.

import { useMemo, useState } from "react";
import { Plus, Search, NotebookPen, Tag, CalendarDays, ListTodo, Target } from "lucide-react";
import type { Note } from "@/lib/types";
import { addNote, updateNote, deleteNote, useAppData } from "@/lib/store";
import { parseDateKey } from "@/lib/storage";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { NoteEditor, type NoteDraft } from "@/components/notes/NoteEditor";

export default function NotesPage() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const habitName = useMemo(() => new Map(data.habits.map((h) => [h.id, h.name])), [data.habits]);
  const goalTitle = useMemo(() => new Map(data.goals.map((g) => [g.id, g.title])), [data.goals]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of data.notes) for (const t of n.tags) set.add(t);
    return [...set].sort();
  }, [data.notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.notes
      .filter((n) => (tagFilter ? n.tags.includes(tagFilter) : true))
      .filter((n) => (q ? n.body.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)) : true))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [data.notes, query, tagFilter]);

  function save(draft: NoteDraft) {
    if (editing) updateNote(editing.id, draft);
    else addNote(draft);
    setAdding(false);
    setEditing(null);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Notes"
        subtitle={`${data.notes.length} note${data.notes.length === 1 ? "" : "s"}`}
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" strokeWidth={2.5} /> New note
          </Button>
        }
      />

      {data.notes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No notes yet"
          hint="Capture reflections, missed-task reasons, or weekly reviews. Link them to habits, goals, or dates."
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" strokeWidth={2.5} /> Add note
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes…"
                className="w-full rounded-xl border border-line bg-surface2 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-faint focus:border-accent"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <TagChip label="All" active={tagFilter === null} onClick={() => setTagFilter(null)} />
                {allTags.map((t) => (
                  <TagChip key={t} label={t} active={tagFilter === t} onClick={() => setTagFilter(t)} />
                ))}
              </div>
            )}
          </div>

          {/* Simple vertical scroll list of note cards */}
          {filtered.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted">No notes match your filters.</Card>
          ) : (
            <div className="flex flex-col gap-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filtered.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setEditing(n)}
                  className="w-full text-left rounded-2xl border border-line bg-surface p-3 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer shrink-0"
                >
                  <div className="flex items-start justify-between gap-2 shrink-0 mb-1.5">
                    {n.links.date && (
                      <span className="flex items-center gap-1 text-[10px] text-faint">
                        <CalendarDays className="size-3" />
                        {parseDateKey(n.links.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                  <div className="line-clamp-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{n.body}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-faint border-t border-line/40 pt-2 shrink-0">
                    {n.links.habitId && habitName.has(n.links.habitId) && (
                      <span className="flex items-center gap-1 rounded-full bg-surface2/60 px-1.5 py-0.5">
                        <ListTodo className="size-2.5" />
                        {habitName.get(n.links.habitId)}
                      </span>
                    )}
                    {n.links.goalId && goalTitle.has(n.links.goalId) && (
                      <span className="flex items-center gap-1 rounded-full bg-surface2/60 px-1.5 py-0.5">
                        <Target className="size-2.5" />
                        {goalTitle.get(n.links.goalId)}
                      </span>
                    )}
                    {n.tags.map((t) => (
                      <span key={t} className="flex items-center gap-1 rounded-full bg-surface2/60 px-1.5 py-0.5">
                        <Tag className="size-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={adding || editing !== null}
        onClose={() => { setAdding(false); setEditing(null); }}
        title={editing ? "Edit note" : "New note"}
        size="md"
      >
        <NoteEditor
          initial={editing ?? undefined}
          habits={data.habits.filter((h) => !h.archived)}
          goals={data.goals}
          onSave={save}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onDelete={editing ? () => { deleteNote(editing.id); setEditing(null); } : undefined}
        />
      </Modal>
    </div>
  );
}

function TagChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
