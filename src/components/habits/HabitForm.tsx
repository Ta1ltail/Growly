"use client";

// Full add/edit habit form (used inside a Modal). Supports category,
// recurrence (daily / weekly / monthly), start date, time of day, priority,
// and a stored reminder. Pass `initial` to edit; omit to create.

import { useState } from "react";
import { Check, LayoutTemplate } from "lucide-react";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import type { Habit, HabitFormValue, Priority, Recurrence } from "@/lib/types";
import { effectiveRecurrence } from "@/lib/stats";
import { dateKey } from "@/lib/date";
import { PRIORITY_LABEL } from "@/lib/format";
import { WeekdayPicker } from "./WeekdayPicker";

type Kind = Recurrence["kind"];
const KINDS: { value: Kind; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
const PRIORITIES: Priority[] = ["low", "med", "high"];

export function HabitForm({
  initial,
  onSave,
  onCancel,
  onViewTemplates,
}: {
  initial?: Habit;
  onSave: (value: HabitFormValue) => void;
  onCancel: () => void;
  onViewTemplates?: () => void;
}) {
  const initRec = initial
    ? effectiveRecurrence(initial)
    : { kind: "daily" as const };
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<Category>(
    initial?.category ?? "Workout",
  );
  const [kind, setKind] = useState<Kind>(initRec.kind);
  const [weekdays, setWeekdays] = useState<number[]>(
    initRec.kind === "weekly" ? initRec.weekdays : (initial?.repeatDays ?? []),
  );
  const [monthDays, setMonthDays] = useState<number[]>(
    initRec.kind === "monthly" ? initRec.monthDays : [],
  );
  const [startDate, setStartDate] = useState(
    initial?.startDate ?? dateKey(new Date()),
  );
  const [timeOfDay, setTimeOfDay] = useState(initial?.timeOfDay ?? "");
  const [priority, setPriority] = useState<Priority>(
    initial?.priority ?? "med",
  );
  const [reminderOn, setReminderOn] = useState(
    initial?.reminder?.enabled ?? false,
  );
  const [reminderTime, setReminderTime] = useState(
    initial?.reminder?.time ?? "08:00",
  );

  function buildRecurrence(): Recurrence {
    if (kind === "daily") return { kind: "daily" };
    if (kind === "weekly") return { kind: "weekly", weekdays };
    return { kind: "monthly", monthDays };
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const recurrence = buildRecurrence();
    onSave({
      name: trimmed,
      category,
      recurrence,
      // Keep repeatDays in sync for back-compat (weekly mirrors it; else empty).
      repeatDays: recurrence.kind === "weekly" ? weekdays : [],
      startDate,
      timeOfDay: timeOfDay || undefined,
      priority,
      reminder: reminderOn ? { enabled: true, time: reminderTime } : undefined,
    });
  }

  function toggleMonthDay(d: number) {
    setMonthDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Name */}
      <div>
        <Label>Name</Label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. Morning run"
          aria-label="Habit name"
          maxLength={100}
          className="w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent"
        />
      </div>

      {/* Category */}
      <div>
        <Label>Category</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                  active
                    ? "border-transparent text-white"
                    : "border-line text-muted hover:text-ink"
                }`}
                style={
                  active ? { backgroundColor: CATEGORY_COLORS[c] } : undefined
                }
              >
                <span
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor: active ? "#fff" : CATEGORY_COLORS[c],
                  }}
                />
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recurrence */}
      <div>
        <Label>Repeat</Label>
        <div className="inline-flex gap-1 rounded-xl border border-line bg-surface2 p-1">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                kind === k.value
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        {kind === "weekly" && (
          <div className="mt-3">
            <WeekdayPicker value={weekdays} onChange={setWeekdays} />
          </div>
        )}
        {kind === "monthly" && (
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
              const active = monthDays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleMonthDay(d)}
                  className={`flex h-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                    active
                      ? "bg-accent text-white"
                      : "bg-surface2 text-muted hover:text-ink"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule details */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Start date</Label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Start date"
            className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <Label>Time of day</Label>
          <input
            type="time"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
            aria-label="Time of day"
            className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Priority */}
      <div>
        <Label>Priority</Label>
        <div className="inline-flex gap-1 rounded-xl border border-line bg-surface2 p-1">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                priority === p
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              {PRIORITY_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Reminder */}
      <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 px-3.5 py-2.5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={reminderOn}
            onChange={(e) => setReminderOn(e.target.checked)}
            className="size-4 accent-[var(--c-accent)]"
          />
          Reminder
        </label>
        {reminderOn && (
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            aria-label="Reminder time"
            className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        {!initial && onViewTemplates ? (
          <button
            type="button"
            onClick={onViewTemplates}
            className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
          >
            <LayoutTemplate className="size-3.5" /> View templates
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            <Check className="size-4" strokeWidth={2.5} />
            {initial ? "Save changes" : "Add habit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </label>
  );
}
