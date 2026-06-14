"use client";

// A tiny shared store for the app's data, backed by localStorage.
// Uses React's useSyncExternalStore so every screen (Today, Tracker, ...)
// reads the same data and updates together — no prop drilling, and it is
// hydration-safe for Next.js server rendering.
//
// All mutations go through the action functions below so persistence and
// notifications happen in one place.

import { useSyncExternalStore } from "react";
import type { AppData, Goal, Habit, ThemeMode } from "./types";
import { emptyData, loadData, saveData } from "./storage";
import { nextStatus } from "./marks";

let cache: AppData | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): AppData {
  if (cache === null) cache = loadData(); // read localStorage once, then reuse
  return cache;
}

// On the server there is no localStorage, so start empty.
function getServerSnapshot(): AppData {
  return emptyData;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Update the data, persist it, and notify every subscribed component.
function update(updater: (prev: AppData) => AppData): void {
  cache = updater(getSnapshot());
  saveData(cache);
  for (const listener of listeners) listener();
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ---------------- actions ---------------- */

export function addHabit(habit: Habit): void {
  update((prev) => ({ ...prev, habits: [...prev.habits, habit] }));
}

export function updateHabit(habit: Habit): void {
  update((prev) => ({
    ...prev,
    habits: prev.habits.map((h) => (h.id === habit.id ? habit : h)),
  }));
}

export function deleteHabit(id: string): void {
  update((prev) => ({ ...prev, habits: prev.habits.filter((h) => h.id !== id) }));
}

export function cycleMark(dateK: string, habitId: string): void {
  update((prev) => {
    const day = { ...(prev.marks[dateK] ?? {}) };
    const next = nextStatus(day[habitId]);
    if (next === undefined) delete day[habitId];
    else day[habitId] = next;
    return { ...prev, marks: { ...prev.marks, [dateK]: day } };
  });
}

export function setNote(dateK: string, text: string): void {
  update((prev) => {
    const notes = { ...prev.notes };
    if (text.trim() === "") delete notes[dateK];
    else notes[dateK] = text;
    return { ...prev, notes };
  });
}

export function addGoal(goal: Goal): void {
  update((prev) => ({ ...prev, goals: [...prev.goals, goal] }));
}

export function updateGoal(goal: Goal): void {
  update((prev) => ({
    ...prev,
    goals: prev.goals.map((g) => (g.id === goal.id ? goal : g)),
  }));
}

export function deleteGoal(id: string): void {
  update((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
}

export function setTheme(theme: ThemeMode): void {
  update((prev) => ({ ...prev, settings: { ...prev.settings, theme } }));
}

export function clearAllData(): void {
  update((prev) => ({ ...emptyData, settings: prev.settings }));
}
