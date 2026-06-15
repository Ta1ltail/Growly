// Bridge between the habit form and stored Habit records.

import type { Habit, HabitFormValue } from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}`;
}

// Create a brand-new Habit from form input.
export function makeHabit(value: HabitFormValue): Habit {
  return {
    id: newId(),
    name: value.name,
    category: value.category,
    repeatDays: value.repeatDays,
    createdAt: new Date().toISOString(),
    recurrence: value.recurrence,
    startDate: value.startDate,
    timeOfDay: value.timeOfDay,
    priority: value.priority,
    reminder: value.reminder,
  };
}

// Apply form edits onto an existing Habit, preserving identity & creation time.
export function applyHabitForm(base: Habit, value: HabitFormValue): Habit {
  return {
    ...base,
    name: value.name,
    category: value.category,
    repeatDays: value.repeatDays,
    recurrence: value.recurrence,
    startDate: value.startDate,
    timeOfDay: value.timeOfDay,
    priority: value.priority,
    reminder: value.reminder,
  };
}
