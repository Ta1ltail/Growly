"use client";

// Notes — a Google Keep–style board: searchable, taggable notes shown as a
// responsive masonry of cards that size to their content. Click a card to edit
// it in a modal. Notes can link to dates, habits, and goals.

import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  NotebookPen,
  Tag,
  CalendarDays,
  ListTodo,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import type { Note } from "@/lib/types";
import { addNote, updateNote, deleteNote, useAppData } from "@/lib/store";
import { parseDateKey } from "@/lib/storage";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { NoteEditor, type NoteDraft } from "@/components/notes/NoteEditor";

function NoteCard({
  note,
  habitName,
  goalTitle,
  onClick,
}: {
  note: Note;
  habitName: Map<string, string>;
  goalTitle: Map<string, string>;
  onClick: () => void;
}) {
  const hasMeta =
    note.links.date ||
    (note.links.habitId && habitName.has(note.links.habitId)) ||
    (note.links.goalId && goalTitle.has(note.links.goalId)) ||
    note.tags.length > 0;

  return (
    <button
      onClick={onClick}
      className="mb-3 block w-full break-inside-avoid text-left"
    >
      <div className="rounded-2xl border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
        {note.links.date && (
          <span className="mb-2 flex items-center gap-1 text-[10px] font-medium text-faint">
            <CalendarDays className="size-3" />
            {parseDateKey(note.links.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}

        <p className="whitespace-pre-wrap text-sm leading-relaxed line-clamp-[12]">
          {note.body || <span className="italic text-faint">Empty note</span>}
        </p>

        {hasMeta && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line/40 pt-2.5 text-[10px] text-faint">
            {note.links.habitId && habitName.has(note.links.habitId) && (
              <span className="flex items-center gap-1 rounded-full bg-surface2/60 px-1.5 py-0.5">
                <ListTodo className="size-2.5" />
                {habitName.get(note.links.habitId)}
              </span>
            )}
            {note.links.goalId && goalTitle.has(note.links.goalId) && (
              <span className="flex items-center gap-1 rounded-full bg-surface2/60 px-1.5 py-0.5">
                <Target className="size-2.5" />
                {goalTitle.get(note.links.goalId)}
              </span>
            )}
            {note.tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full bg-surface2/60 px-1.5 py-0.5"
              >
                <Tag className="size-2.5" />
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export default function NotesPage() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const habitName = useMemo(
    () => new Map(data.habits.map((h) => [h.id, h.name])),
    [data.habits],
  );
  const goalTitle = useMemo(
    () => new Map(data.goals.map((g) => [g.id, g.title])),
    [data.goals],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of data.notes) for (const t of n.tags) set.add(t);
    return [...set].sort();
  }, [data.notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.notes
      .filter((n) => (tagFilter ? n.tags.includes(tagFilter) : true))
      .filter((n) =>
        q
          ? n.body.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q))
          : true,
      )
      .sort((a, b) =>
        a.updatedAt < b.updatedAt ? 1 : b.updatedAt < a.updatedAt ? -1 : 0,
      );
  }, [data.notes, query, tagFilter]);

  function save(draft: NoteDraft) {
    if (editing) updateNote(editing.id, draft);
    else addNote(draft);
    setAdding(false);
    setEditing(null);
    toast.success(editing ? "Note updated" : "Note saved");
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
          illustration="notes"
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" strokeWidth={2.5} /> Add note
            </Button>
          }
        />
      ) : (
        <>
          {/* Search + tag filters */}
          <div className="mb-5 flex flex-col gap-3">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes…"
                aria-label="Search notes"
                className="w-full rounded-xl border border-line bg-surface2 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-faint focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <TagChip
                  label="All"
                  active={tagFilter === null}
                  onClick={() => setTagFilter(null)}
                />
                {allTags.map((t) => (
                  <TagChip
                    key={t}
                    label={t}
                    active={tagFilter === t}
                    onClick={() => setTagFilter(t)}
                  />
                ))}
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted">
              No notes match your filters.
            </Card>
          ) : (
            // Masonry board — column count auto-adjusts to screen width.
            <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4">
              {filtered.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  habitName={habitName}
                  goalTitle={goalTitle}
                  onClick={() => setEditing(n)}
                />
              ))}
            </div>
          )}
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

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-line text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
