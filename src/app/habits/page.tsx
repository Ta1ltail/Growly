"use client";

// Manage Habits — the single place to edit, delete, archive, duplicate, and
// reschedule habits (kept out of Today so daily tracking stays focused).
// Search + category filter; add/edit happen in a modal.

import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  Search,
  ListTodo,
} from "lucide-react";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import type { Habit } from "@/lib/types";
import { toast } from "sonner";
import {
  addHabit,
  updateHabit,
  deleteHabit,
  duplicateHabit,
  setHabitArchived,
  useAppData,
  undoAction,
} from "@/lib/store";
import { makeHabit, applyHabitForm } from "@/lib/habits";
import { habitStreaks } from "@/lib/stats";
import { frozenSet } from "@/lib/economy";
import { StreakFlame } from "@/components/habits/StreakFlame";
import {
  habitScheduleText,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
} from "@/lib/format";
import { useToday } from "@/hooks/useToday";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/StaggerContainer";
import { HabitForm } from "@/components/habits/HabitForm";
import { IconBtn } from "@/components/ui/IconBtn";
import { AppPageShell } from "@/components/layout/AppPageShell";

const PAGE_SIZE = 7;
const SCROLL_AFTER = 12;
const ROW_PX = 64; // approx active-habit row height incl. gap

export default function HabitsPage() {
  const data = useAppData();
  const today = useToday();
  const [filter, setFilter] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Habit | null>(null);
  const [page, setPage] = useState(0);

  // Listen for keyboard shortcut to add habit
  useEffect(() => {
    const handler = () => setAdding((prev) => !prev);
    window.addEventListener("kb:add-habit", handler);
    return () => window.removeEventListener("kb:add-habit", handler);
  }, []);

  const usedCategories = useMemo(
    () => CATEGORIES.filter((c) => data.habits.some((h) => h.category === c)),
    [data.habits],
  );
  const filterOptions = useMemo(
    () => [
      { value: "All" as const, label: "All" },
      ...usedCategories.map((c) => ({ value: c, label: c })),
    ],
    [usedCategories],
  );

  const frozen = useMemo(() => frozenSet(data.economy), [data.economy]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.habits.filter(
      (h) =>
        (filter === "All" || h.category === filter) &&
        (q === "" || h.name.toLowerCase().includes(q)),
    );
  }, [data.habits, filter, query]);

  const activeHabits = filtered.filter((h) => !h.archived && !h.deletedAt);
  const archivedHabits = filtered.filter((h) => h.archived && !h.deletedAt);

  // Pagination over the active list. Clamp displayed page to valid range;
  // out-of-range page numbers from a previous filter silently resolve on the
  // next user navigation.
  const pageCount = Math.max(1, Math.ceil(activeHabits.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageHabits = activeHabits.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );
  // Cap the visible list to ~12 rows; the rest scrolls within the page.
  const listScrolls = pageHabits.length > SCROLL_AFTER;

  function save(value: Parameters<typeof makeHabit>[0]) {
    if (editing) updateHabit(applyHabitForm(editing, value));
    else addHabit(makeHabit(value));
    setAdding(false);
    setEditing(null);
  }

  return (
    <AppPageShell>
      <PageHeader
        title="Manage Habits"
        subtitle={`${data.habits.filter((h) => !h.archived).length} active`}
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" strokeWidth={2.5} /> New habit
          </Button>
        }
      />

      {data.habits.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No habits yet"
          hint="Create a habit with a schedule and it will show up across the app."
          illustration="habits"
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" strokeWidth={2.5} /> Add habit
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search habits…"
                aria-label="Search habits"
                className="w-full rounded-xl border border-line bg-surface2 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-faint focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
              />
            </div>
            <Segmented
              options={filterOptions}
              value={filter}
              onChange={setFilter}
            />
          </div>

          <StaggerContainer
            className={`flex flex-col gap-2 ${listScrolls ? "overflow-y-auto pr-1" : ""}`}
            style={
              listScrolls ? { maxHeight: SCROLL_AFTER * ROW_PX } : undefined
            }
          >
            {pageHabits.map((h) => (
              <StaggerItem key={h.id}>
                <HabitRow
                  habit={h}
                  streak={habitStreaks(h, data.marks, today, frozen).current}
                  onEdit={() => setEditing(h)}
                  onDuplicate={() => duplicateHabit(h.id)}
                  onArchive={() => setHabitArchived(h.id, true)}
                  onDelete={() => setConfirmDelete(h)}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>

          <Pagination
            page={safePage}
            pageCount={pageCount}
            total={activeHabits.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />

          {archivedHabits.length > 0 && (
            <>
              <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-faint">
                Archived
              </h2>
              <div className="flex flex-col gap-2">
                {archivedHabits.map((h) => (
                  <HabitRow
                    key={h.id}
                    habit={h}
                    streak={0}
                    archived
                    onEdit={() => setEditing(h)}
                    onDuplicate={() => duplicateHabit(h.id)}
                    onArchive={() => setHabitArchived(h.id, false)}
                    onDelete={() => setConfirmDelete(h)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Add / edit modal */}
      <Modal
        open={adding || editing !== null}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        title={editing ? "Edit habit" : "Add habit"}
      >
        <HabitForm
          initial={editing ?? undefined}
          onSave={save}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete habit?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) {
                  const name = confirmDelete.name;
                  deleteHabit(confirmDelete.id);
                  toast("Deleted habit", {
                    description: name,
                    action: {
                      label: "Undo",
                      onClick: () => undoAction(),
                    },
                    duration: 5000,
                  });
                }
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Delete “{confirmDelete?.name}”? Its past marks stay in your history
          (Honest Tracking), but it will no longer be scheduled. This cannot be
          undone.
        </p>
      </Modal>
    </AppPageShell>
  );
}

function HabitRow({
  habit,
  streak,
  archived = false,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  habit: Habit;
  streak: number;
  archived?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const priority = habit.priority ?? "med";
  return (
    <Card
      className={`flex items-center gap-3 px-4 py-3 ${archived ? "opacity-60" : ""}`}
    >
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: CATEGORY_COLORS[habit.category] }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{habit.name}</span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              color: PRIORITY_COLOR[priority],
              backgroundColor: `${PRIORITY_COLOR[priority]}1a`,
            }}
          >
            {PRIORITY_LABEL[priority]}
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
          <span className="truncate">
            {habit.category} · {habitScheduleText(habit)}
          </span>
          {streak > 0 && (
            <>
              <span aria-hidden>·</span>
              <StreakFlame streak={streak} size={14} />
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-0.5">
        <IconBtn label="Edit" onClick={onEdit}>
          <Pencil className="size-4" />
        </IconBtn>
        <IconBtn label="Duplicate" onClick={onDuplicate}>
          <Copy className="size-4" />
        </IconBtn>
        <IconBtn label={archived ? "Restore" : "Archive"} onClick={onArchive}>
          {archived ? (
            <ArchiveRestore className="size-4" />
          ) : (
            <Archive className="size-4" />
          )}
        </IconBtn>
        <IconBtn label="Delete" danger onClick={onDelete}>
          <Trash2 className="size-4" />
        </IconBtn>
      </div>
    </Card>
  );
}
