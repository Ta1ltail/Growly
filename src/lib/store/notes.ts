"use client";

// Note CRUD + daily note upsert — domain logic extracted from index.ts

import { update } from "./core";
import type { Note, NoteLinks } from "../types";
import { uid } from "../util";

/* ---------------- notes ---------------- */

export function addNote(input: {
  body: string;
  tags?: string[];
  links?: NoteLinks;
}): Note {
  const now = new Date().toISOString();
  const note: Note = {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    body: input.body,
    tags: input.tags ?? [],
    links: input.links ?? {},
  };
  update((prev) => {
    // Soft limit check: warn when approaching storage quotas
    if (prev.notes.length >= 500) {
      console.warn(`[notes] Soft limit reached: ${prev.notes.length + 1} notes`);
    }
    return { ...prev, notes: [note, ...prev.notes] };
  });
  return note;
}

export function updateNote(
  id: string,
  patch: Partial<Omit<Note, "id" | "createdAt">>,
): void {
  update((prev) => ({
    ...prev,
    notes: prev.notes.map((n) =>
      n.id === id
        ? { ...n, ...patch, updatedAt: new Date().toISOString() }
        : n,
    ),
  }));
}

export function deleteNote(id: string): void {
  update((prev) => ({
    ...prev,
    notes: prev.notes.map((n) =>
      n.id === id ? { ...n, deletedAt: new Date().toISOString() } : n,
    ),
  }));
}

// Upsert the single "daily note" for a date (used by Today's quick note box).
export function setDailyNote(dateK: string, text: string): void {
  update((prev) => {
    const existing = prev.notes.find(
      (n) => n.links.date === dateK && !n.links.habitId && !n.links.goalId,
    );
    const trimmed = text.trim();
    if (existing) {
      if (trimmed === "") {
        return {
          ...prev,
          notes: prev.notes.map((n) =>
            n.id === existing.id
              ? { ...n, deletedAt: new Date().toISOString() }
              : n,
          ),
        };
      }
      return {
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === existing.id
            ? {
                ...n,
                body: text,
                updatedAt: new Date().toISOString(),
                deletedAt: undefined,
              }
            : n,
        ),
      };
    }
    if (trimmed === "") return prev;
    const now = new Date().toISOString();
    const note: Note = {
      id: uid(),
      createdAt: now,
      updatedAt: now,
      body: text,
      tags: [],
      links: { date: dateK },
    };
    return { ...prev, notes: [note, ...prev.notes] };
  });
}
