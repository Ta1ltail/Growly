import type { Habit, HabitFormValue } from "./types";
import { uid } from "./util";

export function makeHabit(value: HabitFormValue): Habit {
  return {
    id: uid(),
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

// Apply form edits to existing habit, preserving identity & creation time.
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
