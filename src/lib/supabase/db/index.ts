// Database access layer — re-export hub + orchestration.
//
// Per-table row converters and CRUD live in sibling modules:
//   habits, marks, notes, goals, settings, profile, unlocks, economy, progress, stats
//
// This module provides:
//   - ChangedTables type (consumed by store/core.ts)
//   - loadAllUserData (bulk load with retry, using single-RPC when available)
//   - saveChanged (incremental save with queue)
//   - Re-exports of all load/save functions

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppData, Marks, MarkStatus } from "../../types";
import {
  DEFAULT_PROFILE,
  DEFAULT_ECONOMY,
  DEFAULT_PROGRESS_SEEN,
} from "../../types";
import { SCHEMA_VERSION, DEFAULT_GRACE_HOURS } from "../../storage";
import { DEFAULT_THEME } from "../../theme";

import type { DbMark, DbUnlock } from "./core";

import { loadHabits, saveHabits, rowToHabit } from "./habits";
import { loadMarks, saveMarks, buildMarksFromRows } from "./marks";
import { loadNotes, saveNotes, rowToNote } from "./notes";
import { loadGoals, saveGoals, rowToGoal } from "./goals";
import { loadSettings, saveSettings, rowToSettings } from "./settings";
import { loadProfile, saveProfile, rowToProfile } from "./profile";
import { loadUnlocks, saveUnlocks, rowToUnlocks } from "./unlocks";
import { loadEconomy, saveEconomy, rowToEconomy } from "./economy";
import { loadProgressSeen, saveProgressSeen, rowToProgressSeen } from "./progress";

/* ─── ChangedTables (consumed by store/core.ts and sync components) ─── */

export type ChangedTables = {
  habits?: true;
  marks?: true;
  dirtyMarkKeys?: string[]; // specific mark dateKeys that changed
  notes?: true;
  goals?: true;
  settings?: true;
  profile?: true;
  unlocks?: true;
  economy?: true;
  progressSeen?: true;
};

/* ─── Save queue — serializes saveChanged calls ─── */

const _saveQueue: (() => Promise<void>)[] = [];
let _saving = false;

async function _runNextSave(): Promise<void> {
  if (_saving || _saveQueue.length === 0) return;
  _saving = true;
  const task = _saveQueue.shift()!;
  try {
    await task();
  } finally {
    _saving = false;
    _runNextSave();
  }
}

function _enqueueSave(task: () => Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    _saveQueue.push(async () => {
      try {
        await task();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    _runNextSave();
  });
}

/* ─── Incremental save (called after each store mutation) ─── */

export async function saveChanged(
  supabase: SupabaseClient,
  userId: string,
  data: AppData,
  changed: ChangedTables,
): Promise<void> {
  await _enqueueSave(async () => {
    // ── Phase 1: Save habits FIRST (marks have FK to habits.id) ──
    // Re-save habits only when habits or marks actually changed. An
    // economy-only mutation must never trigger a habit re-save.
    const saveHabitsToo = changed.habits || changed.marks;
    if (saveHabitsToo) {
      await saveHabits(supabase, userId, data.habits);
    }

    // ── Phase 2: Everything else in parallel ──
    const validHabitIds = new Set(data.habits.map((h) => h.id));
    const promises: Promise<unknown>[] = [];

    if (changed.marks) {
      // Filter marks to only include habit_ids that exist in the current
      // habits array. Prevents FK constraint violations from orphan marks.
      const filteredMarks: Marks = {};
      for (const [dateKey, day] of Object.entries(data.marks)) {
        const filteredDay: Record<string, MarkStatus> = {};
        for (const [habitId, status] of Object.entries(day)) {
          if (validHabitIds.has(habitId)) {
            filteredDay[habitId] = status;
          }
        }
        if (Object.keys(filteredDay).length > 0) {
          filteredMarks[dateKey] = filteredDay;
        }
      }
      promises.push(
        saveMarks(supabase, userId, filteredMarks, changed.dirtyMarkKeys),
      );
    }
    if (changed.notes) promises.push(saveNotes(supabase, userId, data.notes));
    if (changed.goals) promises.push(saveGoals(supabase, userId, data.goals));
    if (changed.settings)
      promises.push(saveSettings(supabase, userId, data.settings));
    if (changed.profile)
      promises.push(saveProfile(supabase, userId, data.profile));
    if (changed.unlocks)
      promises.push(saveUnlocks(supabase, userId, data.unlocks));
    if (changed.economy) {
      // Freezes have a FK to habits.id — filter out orphan freezes
      const eco = data.economy;
      const filteredFreezes = eco.freezes.filter((f) =>
        validHabitIds.has(f.habitId),
      );
      const filteredEconomy =
        filteredFreezes.length === eco.freezes.length
          ? eco
          : { ...eco, freezes: filteredFreezes };
      promises.push(saveEconomy(supabase, userId, filteredEconomy));
    }
    if (changed.progressSeen)
      promises.push(
        saveProgressSeen(supabase, userId, data.progressSeen),
      );

    const results = await Promise.allSettled(promises);
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason);
    if (errors.length === promises.length && errors.length > 0) {
      console.error("[db] All saves failed:", errors);
      throw errors[0];
    } else if (errors.length > 0) {
      console.warn(
        "[db] Partial save failures (",
        errors.length,
        "/",
        promises.length,
        "):",
        errors,
      );
    }
  });
}

/* ─── RPC result parser ─── */

interface RpcResult {
  habits: unknown[];
  marks: { date_key: string; habit_id: string; status: string }[];
  notes: unknown[];
  goals: unknown[];
  settings: unknown | null;
  profile: unknown | null;
  unlocks: { achievement_id: string; at: string; seen: boolean }[];
  economy_state: unknown | null;
  economy_spent: unknown[];
  economy_freezes: unknown[];
  economy_bonuses: unknown[];
  progress_seen: unknown | null;
}

export function parseRpcResult(rpcData: unknown) {
  const d = rpcData as RpcResult;
  const habits = (d.habits ?? []).map(rowToHabit as (row: unknown) => ReturnType<typeof rowToHabit>);
  // RPC returns marks without id/user_id — cast through unknown since
  // buildMarksFromRows only reads date_key, habit_id, status.
  const marks = buildMarksFromRows((d.marks ?? []) as unknown as DbMark[]);
  const notes = (d.notes ?? []).map(rowToNote as (row: unknown) => ReturnType<typeof rowToNote>);
  const goals = (d.goals ?? []).map(rowToGoal as (row: unknown) => ReturnType<typeof rowToGoal>);
  const settings = d.settings ? rowToSettings(d.settings as Parameters<typeof rowToSettings>[0]) : null;
  const profile = d.profile ? rowToProfile(d.profile as Parameters<typeof rowToProfile>[0]) : null;
  // RPC returns unlocks without id/user_id — cast through unknown since
  // rowToUnlocks only reads achievement_id, at, seen.
  const unlocks = rowToUnlocks((d.unlocks ?? []) as unknown as DbUnlock[]);
  const economy = d.economy_state
    ? rowToEconomy(
        d.economy_state as Parameters<typeof rowToEconomy>[0],
        (d.economy_spent ?? []) as Parameters<typeof rowToEconomy>[1],
        (d.economy_freezes ?? []) as Parameters<typeof rowToEconomy>[2],
        (d.economy_bonuses ?? []) as Parameters<typeof rowToEconomy>[3],
      )
    : null;
  const progressSeen = d.progress_seen
    ? rowToProgressSeen(d.progress_seen as Parameters<typeof rowToProgressSeen>[0])
    : null;

  return { habits, marks, notes, goals, settings, profile, unlocks, economy, progressSeen };
}

/* ─── Full AppData load (convenience) ─── */

export async function loadAllUserData(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppData | null> {
  const MAX_ATTEMPTS = 2;
  const RETRY_DELAY_MS = 2000;

  for (let attempt = 0; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // Try the single-RPC path first (migration 013). This reduces 9 HTTP
      // round-trips to 1. Falls back to individual queries if the RPC function
      // doesn't exist yet (pre-migration 013 deployment).
      let loaded: {
        habits: ReturnType<typeof rowToHabit>[];
        marks: ReturnType<typeof buildMarksFromRows>;
        notes: ReturnType<typeof rowToNote>[];
        goals: ReturnType<typeof rowToGoal>[];
        settings: ReturnType<typeof rowToSettings> | null;
        profile: ReturnType<typeof rowToProfile> | null;
        unlocks: ReturnType<typeof rowToUnlocks>;
        economy: ReturnType<typeof rowToEconomy> | null;
        progressSeen: ReturnType<typeof rowToProgressSeen> | null;
      } | null = null;

      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc("load_user_data", { p_user_id: userId });

        if (!rpcError && rpcData) {
          loaded = parseRpcResult(rpcData);
        }
      } catch {
        // RPC function not available (pre-migration 013) — fall through
        // to individual queries below.
      }

      // Fallback: individual queries (9 HTTP round-trips)
      if (!loaded) {
        const [
          habits,
          marks,
          notes,
          goals,
          settings,
          profile,
          unlocks,
          economy,
          progressSeen,
        ] = await Promise.all([
          loadHabits(supabase, userId),
          loadMarks(supabase, userId),
          loadNotes(supabase, userId),
          loadGoals(supabase, userId),
          loadSettings(supabase, userId),
          loadProfile(supabase, userId),
          loadUnlocks(supabase, userId),
          loadEconomy(supabase, userId),
          loadProgressSeen(supabase, userId),
        ]);

        loaded = { habits, marks, notes, goals, settings, profile, unlocks, economy, progressSeen };
      }

      const hasAnyData =
        loaded.habits.length > 0 ||
        Object.keys(loaded.marks).length > 0 ||
        loaded.notes.length > 0 ||
        loaded.goals.length > 0 ||
        loaded.settings !== null ||
        loaded.profile !== null ||
        Object.keys(loaded.unlocks).length > 0 ||
        loaded.economy !== null;
      if (!hasAnyData) {
        return null;
      }

      return {
        version: SCHEMA_VERSION,
        habits: loaded.habits,
        marks: loaded.marks,
        notes: loaded.notes,
        goals: loaded.goals,
        auditLog: [],
        settings: loaded.settings ?? {
          theme: DEFAULT_THEME,
          graceHours: DEFAULT_GRACE_HOURS,
          usedTemplateIds: [],
        },
        profile: loaded.profile ?? DEFAULT_PROFILE,
        unlocks: loaded.unlocks,
        economy: loaded.economy ?? DEFAULT_ECONOMY,
        progressSeen: loaded.progressSeen ?? DEFAULT_PROGRESS_SEEN,
      };
    } catch (e) {
      if (attempt < MAX_ATTEMPTS) {
        console.warn(
          `[db] loadAllUserData attempt ${attempt + 1}/${MAX_ATTEMPTS + 1} failed, retrying in ${RETRY_DELAY_MS}ms:`,
          e,
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        console.error(
          `[db] loadAllUserData failed after ${MAX_ATTEMPTS + 1} attempts:`,
          e,
        );
        throw e;
      }
    }
  }

  return null; // Unreachable
}

/* ─── Re-exports ─── */

export { loadUserStatsSnapshot, saveUserStatsSnapshot } from "./stats";

// Re-export individual load/save for callers that need direct access
export { loadHabits, saveHabits } from "./habits";
export { loadMarks, saveMarks } from "./marks";
export { loadNotes, saveNotes } from "./notes";
export { loadGoals, saveGoals } from "./goals";
export { loadSettings, saveSettings } from "./settings";
export { loadProfile, saveProfile } from "./profile";
export { loadUnlocks, saveUnlocks } from "./unlocks";
export { loadEconomy, saveEconomy } from "./economy";
export { loadProgressSeen, saveProgressSeen } from "./progress";
