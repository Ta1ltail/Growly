"use client";

// Notes — searchable, taggable notes linked to dates, habits, and goals.
// Add/edit in a modal.

import { useMemo, useState } from "react";
import { Plus, Search, NotebookPen, Tag, CalendarDays, ListTodo, Target } from "lucide-react";
import type { Note } from "@/lib/types";
import { addNote, updateNote, deleteNote, useAppData } from "@/lib/store";
import { parseDateKey } from "@/lib/storage";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
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
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
          >
            <Plus className="size-4" strokeWidth={2.5} /> New note
          </button>
        }
      />

      {data.notes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No notes yet"
          hint="Capture reflections, missed-task reasons, or weekly reviews. Link them to habits, goals, or dates."
          action={
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
            >
              <Plus className="size-4" strokeWidth={2.5} /> Add note
            </button>
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

          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((n) => (
              <Card key={n.id} className="cursor-pointer p-4" interactive>
                <button onClick={() => setEditing(n)} className="block w-full text-left">
                  <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    {n.links.date && (
                      <Meta icon={CalendarDays}>{parseDateKey(n.links.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Meta>
                    )}
                    {n.links.habitId && habitName.has(n.links.habitId) && (
                      <Meta icon={ListTodo}>{habitName.get(n.links.habitId)}</Meta>
                    )}
                    {n.links.goalId && goalTitle.has(n.links.goalId) && (
                      <Meta icon={Target}>{goalTitle.get(n.links.goalId)}</Meta>
                    )}
                    {n.tags.map((t) => (
                      <Meta key={t} icon={Tag}>{t}</Meta>
                    ))}
                  </div>
                </button>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={adding || editing !== null}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        title={editing ? "Edit note" : "New note"}
        size="md"
      >
        <NoteEditor
          initial={editing ?? undefined}
          habits={data.habits.filter((h) => !h.archived)}
          goals={data.goals}
          onSave={save}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
          onDelete={
            editing
              ? () => {
                  deleteNote(editing.id);
                  setEditing(null);
                }
              : undefined
          }
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

function Meta({ icon: Icon, children }: { icon: typeof Tag; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-surface2 px-2 py-0.5">
      <Icon className="size-3" />
      {children}
    </span>
  );
}
