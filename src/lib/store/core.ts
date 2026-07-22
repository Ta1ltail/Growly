"use client";

// Store core — cache, listeners, update loop, and the public useAppData hooks.
// Domain modules (habits.ts, notes.ts, etc.) import { update, audit, getSnapshot }
// from this file and register their mutation functions as re-exports in index.ts.

import { useSyncExternalStore } from "react";
import type { AppData, AuditAction, AuditEntry } from "../types";
import type { ChangedTables } from "../supabase/db";
import {
  emptyData,
  loadData,
  saveData,
  setDataUserId,
  getEffectiveStorageKey,
} from "../storage";
import { uid } from "../util";
import { pushSnapshot } from "../history";
import { bumpDataGeneration } from "../supabase/sync";

/* Module-level state */

let cache: AppData | null = null;
const listeners = new Set<() => void>();

const MAX_AUDIT = 500;

/* Sync callback — wired by SyncProvider */

export type SyncCallback = (data: AppData, changed: ChangedTables) => void;

let _onMutation: SyncCallback | null = null;
let _userId: string | null = null;

export function setSyncCallback(
  cb: SyncCallback | null,
  userId?: string | null,
) {
  _onMutation = cb;
  if (userId !== undefined) {
    _userId = userId;
    setDataUserId(userId);
  }
}

/* Snapshot helpers */

export function getSnapshot(): AppData {
  if (cache === null) cache = loadData();
  return cache;
}

function getServerSnapshot(): AppData {
  return emptyData;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(data: AppData): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveData(data);
    saveTimer = null;
  }, 100);
}

/** True when there's a pending debounced save that hasn't flushed to localStorage yet. */
export function hasPendingSave(): boolean {
  return saveTimer !== null;
}

/** Flush the pending debounced save to localStorage synchronously (no-op if none pending). */
export function flushSave(): void {
  if (saveTimer && cache) {
    clearTimeout(saveTimer);
    saveTimer = null;
    saveData(cache);
  }
}

/**
 * Fast comparison of two day-mark objects ({ habitId: status }).
 * Avoids JSON.stringify allocation and character-by-character comparison.
 */
function marksDayEqual(
  a: Record<string, string> | undefined,
  b: Record<string, string> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/* Diff snapshots to determine changed tables for incremental sync */

function computeChanged(prev: AppData, next: AppData): ChangedTables {
  const changed: ChangedTables = {};
  if (prev.habits !== next.habits) changed.habits = true;
  if (prev.marks !== next.marks) {
    changed.marks = true;
    const dirtyKeys: string[] = [];
    const allKeys = new Set([
      ...Object.keys(prev.marks),
      ...Object.keys(next.marks),
    ]);
    for (const key of allKeys) {
      if (!marksDayEqual(prev.marks[key], next.marks[key])) {
        dirtyKeys.push(key);
      }
    }
    if (dirtyKeys.length > 0) changed.dirtyMarkKeys = dirtyKeys;
  }
  if (prev.notes !== next.notes) changed.notes = true;
  if (prev.goals !== next.goals) changed.goals = true;
  if (prev.settings !== next.settings) changed.settings = true;
  if (prev.profile !== next.profile) changed.profile = true;
  if (prev.unlocks !== next.unlocks) changed.unlocks = true;
  if (prev.economy !== next.economy) changed.economy = true;
  if (prev.progressSeen !== next.progressSeen) changed.progressSeen = true;
  return changed;
}

/* Core mutation loop — exported so domain modules can use it */

export function update(
  updater: (prev: AppData) => AppData,
  recordHistory = true,
): void {
  const prev = getSnapshot();
  if (recordHistory) {
    pushSnapshot(prev);
  }
  cache = updater(prev);
  const changed = computeChanged(prev, cache);
  if (!recordHistory) {
    scheduleSave(cache);
  } else {
    if (saveTimer) clearTimeout(saveTimer);
    saveData(cache);
  }
  // Flush any pending debounced save BEFORE the mutation callback fires,
  // so localStorage is in sync when pushMutation attempts the network call.
  // Only flush when sync is active — without a callback, the debounce still
  // coalesces rapid writes for local-only flows.
  if (_onMutation) {
    flushSave();
  }

  if (_onMutation && _userId) {
    _onMutation(cache, changed);
  }
  for (const listener of listeners) listener();
}

/* Public hooks */

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useAppDataSelector<T>(selector: (data: AppData) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getServerSnapshot()),
  );
}

/* Audit helper — used by domain modules */

export function audit(
  prev: AppData,
  action: AuditAction,
  summary: string,
  habitId?: string,
  before?: unknown,
  after?: unknown,
): AuditEntry[] {
  const entry: AuditEntry = {
    id: uid(),
    at: new Date().toISOString(),
    action,
    summary,
    ...(habitId ? { habitId } : {}),
    ...(before !== undefined ? { before } : {}),
    ...(after !== undefined ? { after } : {}),
  };
  return [entry, ...prev.auditLog].slice(0, MAX_AUDIT);
}

/* Developer mode — raw data access */

export function replaceData(next: AppData): void {
  update(() => next);
}

export function mutateData(
  updater: (prev: AppData) => AppData,
  shouldRecordHistory = true,
): void {
  update(updater, shouldRecordHistory);
}

function reloadData(): void {
  cache = loadData();
  for (const listener of listeners) listener();
}

export function reloadCache(): void {
  cache = null;
  for (const listener of listeners) listener();
}

export function importRawData(text: string): string | null {
  if (typeof window === "undefined") return "No storage available";
  try {
    const parsed = JSON.parse(text);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return "Root must be a JSON object";
    }
    bumpDataGeneration();
    window.localStorage.setItem(getEffectiveStorageKey(), JSON.stringify(parsed));
    reloadData();
    if (_onMutation && _userId && cache) {
      const changed: ChangedTables = {
        habits: true,
        marks: true,
        notes: true,
        goals: true,
        settings: true,
        profile: true,
        unlocks: true,
        economy: true,
        progressSeen: true,
      };
      _onMutation(cache, changed);
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid JSON";
  }
}

export function clearAllData(): void {
  bumpDataGeneration();

  update((prev) => ({
    ...emptyData,
    settings: prev.settings,
    profile: prev.profile,
    economy: {
      ...emptyData.economy,
      owned: prev.economy.owned,
      equipped: prev.economy.equipped,
      freezes: [],
      bonuses: prev.economy.bonuses,
    },
    progressSeen: {
      ...emptyData.progressSeen,
      seeded: prev.progressSeen.seeded,
    },
  }));
}

/* Re-export date helpers for backward compatibility (prefer imports from ../date) */

export { dateKey, addDays } from "../date";
