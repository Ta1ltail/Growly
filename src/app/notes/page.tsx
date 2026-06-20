"use client";

// Notes — searchable, taggable notes linked to dates, habits, and goals.
// Vertical scroll list with fixed-height cards — like a real notepad.

import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  NotebookPen,
  Tag,
  CalendarDays,
  ListTodo,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Note } from "@/lib/types";
import { addNote, updateNote, deleteNote, useAppData } from "@/lib/store";
import { parseDateKey } from "@/lib/storage";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { NoteEditor, type NoteDraft } from "@/components/notes/NoteEditor";

function NoteCardContent({
  note,
  habitName,
  goalTitle,
}: {
  note: Note;
  habitName: Map<string, string>;
  goalTitle: Map<string, string>;
}) {
  const lines = note.body.split("\n").filter(Boolean);
  const maxVisibleLines = 2;
  const [expanded, setExpanded] = useState(false);
  const showExpandToggle = lines.length > maxVisibleLines;

  const visibleText = expanded
    ? note.body
    : lines.slice(0, maxVisibleLines).join("\n");

  return (
    <>
      <div className="flex items-start justify-between gap-2 shrink-0 mb-1.5">
        {note.links.date && (
          <span className="flex items-center gap-1 text-[10px] text-faint">
            <CalendarDays className="size-3" />
            {parseDateKey(note.links.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {visibleText}
          {!expanded && showExpandToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
              className="ml-1 text-accent text-xs font-medium hover:underline"
            >
              ...more
            </button>
          )}
        </p>
      </div>
      {expanded && showExpandToggle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="shrink-0 text-[10px] text-faint hover:text-muted mt-1"
        >
          Show less
        </button>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[10px] text-faint border-t border-line/40 pt-2 shrink-0">
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
    </>
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
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [data.notes, query, tagFilter]);

  // Pagination for the notes list
  const NOTES_PER_PAGE = 8;
  const [listPage, setListPage] = useState(0);
  const pageCount = Math.ceil(filtered.length / NOTES_PER_PAGE);
  // Clamp page when items are deleted from the last page — safePage is the
  // authoritative page for display; listPage catches up on next user click.
  const safePage = Math.min(listPage, Math.max(0, pageCount - 1));
  const pageItems = filtered.slice(
    safePage * NOTES_PER_PAGE,
    (safePage + 1) * NOTES_PER_PAGE,
  );

  function save(draft: NoteDraft) {
    if (editing) updateNote(editing.id, draft);
    else addNote(draft);
    setAdding(false);
    setEditing(null);
  }

  return (
    <div className="animate-fade-in flex flex-col min-h-0 h-[calc(100vh-110px)]">
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
        <div className="flex flex-col min-h-0 flex-1">
          <div className="mb-4 flex flex-col gap-3 shrink-0">
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
                <TagChip
                  label="All"
                  active={tagFilter === null}
                  onClick={() => {
                    setTagFilter(null);
                    setListPage(0);
                  }}
                />
                {allTags.map((t) => (
                  <TagChip
                    key={t}
                    label={t}
                    active={tagFilter === t}
                    onClick={() => {
                      setTagFilter(t);
                      setListPage(0);
                    }}
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
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Vertical scroll list — like a real notepad */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                {pageItems.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setEditing(n)}
                    className="w-full text-left rounded-2xl border border-line bg-surface p-3.5 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col h-[110px]"
                  >
                    <NoteCardContent
                      note={n}
                      habitName={habitName}
                      goalTitle={goalTitle}
                    />
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="mt-4 flex items-center justify-between shrink-0">
                  <span className="font-mono text-xs text-muted">
                    {safePage * NOTES_PER_PAGE + 1}–
                    {Math.min(filtered.length, (safePage + 1) * NOTES_PER_PAGE)}{" "}
                    of {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setListPage((p) => Math.max(0, p - 1))}
                      disabled={safePage === 0}
                      className="flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-surface2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <span className="px-2 font-mono text-xs text-muted">
                      {safePage + 1} / {pageCount}
                    </span>
                    <button
                      onClick={() =>
                        setListPage((p) => Math.min(pageCount - 1, p + 1))
                      }
                      disabled={safePage >= pageCount - 1}
                      className="flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-surface2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                      aria-label="Next page"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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
