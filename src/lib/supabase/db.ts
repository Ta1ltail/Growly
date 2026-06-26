// Data access layer — typed CRUD for every Supabase table backing AppData.
// NOTE: no "use server" directive — these functions are called from client-side
// sync.ts using the browser Supabase client. They run on the client.
// All functions expect an authenticated Supabase client and the user's ID.
// Used by sync.ts to orchestrate pull/push operations.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppData,
  Economy,
  Goal,
  Habit,
  Marks,
  MarkStatus,
  Note,
  Profile,
  ProgressSeen,
  Unlocks,
  SpendEntry,
  FreezeEntry,
  Recurrence,
  Priority,
  DailyQuest,
} from "../types";
import {
  DEFAULT_PROFILE,
  DEFAULT_ECONOMY,
  DEFAULT_PROGRESS_SEEN,
} from "../types";
import { SCHEMA_VERSION, DEFAULT_GRACE_HOURS } from "../storage";
import type { ThemeSettings } from "../theme";
import { DEFAULT_THEME } from "../theme";

/* ────────────────────────────────────────────
   Types matching the Supabase table shapes
   ──────────────────────────────────────────── */

interface DbHabit {
  id: string;
  user_id: string;
  name: string;
  category: string;
  repeat_days: number[];
  created_at: string;
  recurrence: unknown | null;
  start_date: string | null;
  time_of_day: string | null;
  priority: string | null;
  archived: boolean;
  reminder: unknown | null;
}

interface DbMark {
  id: string;
  user_id: string;
  date_key: string;
  habit_id: string;
  status: MarkStatus;
}

interface DbNote {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  body: string;
  tags: string[];
  links: unknown;
}

interface DbGoal {
  id: string;
  user_id: string;
  title: string;
  target: number;
  current: number;
  created_at: string;
  category: string | null;
  deadline: string | null;
  linked_habit_ids: string[];
  milestones: unknown | null;
}

interface DbUserSettings {
  user_id: string;
  theme_mode: string;
  theme_accent: string;
  grace_hours: number;
  used_template_ids: string[];
  widget_order: string[] | null;
  onboarding_complete: boolean;
  custom_categories: string[];
}

interface DbUserProfile {
  user_id: string;
  display_name: string;
  username: string;
  bio: string | null;
  motto: string | null;
  avatar: string | null;
  banner: string | null;
  showcase_badge_id: string | null;
}

interface DbUnlock {
  id: string;
  user_id: string;
  achievement_id: string;
  at: string;
  seen: boolean;
}

interface DbEconomyState {
  user_id: string;
  owned: string[];
  equipped: unknown;
  bonus_coins: number;
  last_check_in: string | null;
  check_in_streak: number;
  last_quest_date: string | null;
  current_quest: unknown | null;
  last_spin_date: string | null;
  last_spin_result: unknown | null;
}

interface DbEconomySpent {
  id: string;
  user_id: string;
  at: string;
  amount: number;
  item: string;
}

interface DbEconomyFreeze {
  id: string;
  user_id: string;
  at: string;
  date: string;
  habit_id: string;
}

interface DbProgressSeen {
  user_id: string;
  seeded: boolean;
  level: number;
  title: string;
  shop: string[];
  streaks: unknown;
  tier_unlocks: string[];
}

/* ────────────────────────────────────────────
   Mapping helpers (DB row → AppData type)
   ──────────────────────────────────────────── */

function rowToHabit(row: DbHabit): Habit {
  const h: Habit = {
    id: row.id,
    name: row.name,
    category: row.category as Habit["category"],
    repeatDays: row.repeat_days ?? [],
    createdAt: row.created_at,
  };
  if (row.recurrence) h.recurrence = row.recurrence as Recurrence;
  if (row.start_date) h.startDate = row.start_date;
  if (row.time_of_day) h.timeOfDay = row.time_of_day;
  if (row.priority) h.priority = row.priority as Priority;
  if (row.archived) h.archived = true;
  if (row.reminder) h.reminder = row.reminder as { enabled: boolean; time?: string };
  return h;
}

function habitToRow(userId: string, h: Habit): DbHabit {
  return {
    id: h.id,
    user_id: userId,
    name: h.name,
    category: h.category,
    repeat_days: h.repeatDays ?? [],
    created_at: h.createdAt,
    recurrence: h.recurrence ?? null,
    start_date: h.startDate ?? null,
    time_of_day: h.timeOfDay ?? null,
    priority: h.priority ?? null,
    archived: h.archived ?? false,
    reminder: h.reminder ?? null,
  };
}

function buildMarksFromRows(rows: DbMark[]): Marks {
  const marks: Marks = {};
  for (const row of rows) {
    if (!marks[row.date_key]) marks[row.date_key] = {};
    marks[row.date_key][row.habit_id] = row.status;
  }
  return marks;
}

function marksToRows(userId: string, marks: Marks): DbMark[] {
  const rows: DbMark[] = [];
  for (const [dateKey, day] of Object.entries(marks)) {
    for (const [habitId, status] of Object.entries(day)) {
      rows.push({
        id: crypto.randomUUID(),
        user_id: userId,
        date_key: dateKey,
        habit_id: habitId,
        status,
      });
    }
  }
  return rows;
}

function rowToNote(row: DbNote): Note {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    body: row.body,
    tags: row.tags ?? [],
    links: (row.links ?? {}) as Note["links"],
  };
}

function noteToRow(userId: string, n: Note): DbNote {
  return {
    id: n.id,
    user_id: userId,
    created_at: n.createdAt,
    updated_at: n.updatedAt,
    body: n.body,
    tags: n.tags ?? [],
    links: n.links ?? {},
  };
}

function rowToGoal(row: DbGoal): Goal {
  const g: Goal = {
    id: row.id,
    title: row.title,
    target: row.target,
    current: row.current,
    createdAt: row.created_at,
  };
  if (row.category) g.category = row.category as Goal["category"];
  if (row.deadline) g.deadline = row.deadline;
  if (row.linked_habit_ids?.length) g.linkedHabitIds = row.linked_habit_ids;
  if (row.milestones) g.milestones = row.milestones as Goal["milestones"];
  return g;
}

function goalToRow(userId: string, g: Goal): DbGoal {
  return {
    id: g.id,
    user_id: userId,
    title: g.title,
    target: g.target,
    current: g.current,
    created_at: g.createdAt,
    category: g.category ?? null,
    deadline: g.deadline ?? null,
    linked_habit_ids: g.linkedHabitIds ?? [],
    milestones: g.milestones ?? null,
  };
}

function rowToSettings(row: DbUserSettings): AppData["settings"] {
  return {
    theme: { mode: row.theme_mode as ThemeSettings["mode"], accent: row.theme_accent },
    graceHours: row.grace_hours,
    usedTemplateIds: row.used_template_ids ?? [],
    widgetOrder: row.widget_order ?? undefined,
    onboardingComplete: row.onboarding_complete || undefined,
    customCategories: row.custom_categories?.length ? row.custom_categories : undefined,
  };
}

function settingsToRow(userId: string, s: AppData["settings"]): DbUserSettings {
  return {
    user_id: userId,
    theme_mode: s.theme.mode,
    theme_accent: s.theme.accent,
    grace_hours: s.graceHours ?? DEFAULT_GRACE_HOURS,
    used_template_ids: s.usedTemplateIds ?? [],
    widget_order: s.widgetOrder ?? null,
    onboarding_complete: s.onboardingComplete ?? false,
    custom_categories: s.customCategories ?? [],
  };
}

function rowToProfile(row: DbUserProfile): Profile {
  return {
    displayName: row.display_name,
    username: row.username,
    bio: row.bio ?? undefined,
    motto: row.motto ?? undefined,
    avatar: row.avatar ?? undefined,
    banner: row.banner ?? undefined,
    showcaseBadgeId: row.showcase_badge_id ?? undefined,
  };
}

function profileToRow(userId: string, p: Profile): DbUserProfile {
  return {
    user_id: userId,
    display_name: p.displayName,
    username: p.username,
    bio: p.bio ?? null,
    motto: p.motto ?? null,
    avatar: p.avatar ?? null,
    banner: p.banner ?? null,
    showcase_badge_id: p.showcaseBadgeId ?? null,
  };
}

function rowToUnlocks(rows: DbUnlock[]): Unlocks {
  const unlocks: Unlocks = {};
  for (const row of rows) {
    unlocks[row.achievement_id] = { at: row.at, seen: row.seen };
  }
  return unlocks;
}

function unlocksToRows(userId: string, unlocks: Unlocks): DbUnlock[] {
  return Object.entries(unlocks).map(([achievementId, rec]) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    achievement_id: achievementId,
    at: rec.at,
    seen: rec.seen,
  }));
}

function rowToEconomy(
  state: DbEconomyState,
  spent: DbEconomySpent[],
  freezes: DbEconomyFreeze[],
): Economy {
  const equipped: Partial<Record<string, string>> = {};
  if (state.equipped && typeof state.equipped === "object") {
    for (const [slot, id] of Object.entries(state.equipped as Record<string, unknown>)) {
      if (typeof id === "string") equipped[slot] = id;
    }
  }

  // Parse current_quest JSONB
  let currentQuest: DailyQuest | null = null;
  if (state.current_quest && typeof state.current_quest === "object") {
    const q = state.current_quest as Record<string, unknown>;
    if (
      typeof q.description === "string" &&
      typeof q.target === "number" &&
      typeof q.current === "number" &&
      typeof q.reward === "number"
    ) {
      currentQuest = q as unknown as DailyQuest;
    }
  }

  // Parse last_spin_result JSONB
  let lastSpinResult: { label: string; amount: number; isFreeze: boolean } | null = null;
  if (state.last_spin_result && typeof state.last_spin_result === "object") {
    const r = state.last_spin_result as Record<string, unknown>;
    if (
      typeof r.label === "string" &&
      typeof r.amount === "number" &&
      typeof r.isFreeze === "boolean"
    ) {
      lastSpinResult = r as unknown as typeof lastSpinResult;
    }
  }

  return {
    spent: spent.map((s) => ({ id: s.id, at: s.at, amount: s.amount, item: s.item })),
    owned: state.owned ?? [],
    equipped: equipped as Economy["equipped"],
    freezes: freezes.map((f) => ({ id: f.id, at: f.at, date: f.date, habitId: f.habit_id })),
    bonusCoins: state.bonus_coins ?? 0,
    lastCheckIn: state.last_check_in ?? null,
    checkInStreak: state.check_in_streak ?? 0,
    lastQuestDate: state.last_quest_date ?? null,
    currentQuest,
    lastSpinDate: state.last_spin_date ?? null,
    lastSpinResult,
  };
}

function economyStateToRow(userId: string, eco: Economy): DbEconomyState {
  return {
    user_id: userId,
    owned: eco.owned ?? [],
    equipped: eco.equipped ?? {},
    bonus_coins: eco.bonusCoins ?? 0,
    last_check_in: eco.lastCheckIn ?? null,
    check_in_streak: eco.checkInStreak ?? 0,
    last_quest_date: eco.lastQuestDate ?? null,
    current_quest: eco.currentQuest ?? null,
    last_spin_date: eco.lastSpinDate ?? null,
    last_spin_result: eco.lastSpinResult ?? null,
  };
}

function spentToRows(userId: string, spent: SpendEntry[]): DbEconomySpent[] {
  return spent.map((s) => ({
    id: s.id,
    user_id: userId,
    at: s.at,
    amount: s.amount,
    item: s.item,
  }));
}

function freezesToRows(userId: string, freezes: FreezeEntry[]): DbEconomyFreeze[] {
  return freezes.map((f) => ({
    id: f.id,
    user_id: userId,
    at: f.at,
    date: f.date,
    habit_id: f.habitId,
  }));
}

function rowToProgressSeen(row: DbProgressSeen): ProgressSeen {
  let streaks: Record<string, number> = {};
  if (row.streaks && typeof row.streaks === "object") {
    streaks = row.streaks as Record<string, number>;
  }
  return {
    seeded: row.seeded ?? false,
    level: row.level ?? DEFAULT_PROGRESS_SEEN.level,
    title: row.title ?? DEFAULT_PROGRESS_SEEN.title,
    shop: row.shop ?? [],
    streaks,
    tierUnlocks: row.tier_unlocks ?? [],
  };
}

function progressSeenToRow(userId: string, ps: ProgressSeen): DbProgressSeen {
  return {
    user_id: userId,
    seeded: ps.seeded ?? false,
    level: ps.level,
    title: ps.title,
    shop: ps.shop ?? [],
    streaks: ps.streaks ?? {},
    tier_unlocks: ps.tierUnlocks ?? [],
  };
}

/* ────────────────────────────────────────────
   Public API: LOAD functions
   ──────────────────────────────────────────── */

export async function loadHabits(
  supabase: SupabaseClient,
  userId: string,
): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToHabit);
}

export async function loadMarks(
  supabase: SupabaseClient,
  userId: string,
): Promise<Marks> {
  const { data, error } = await supabase
    .from("marks")
    .select("date_key, habit_id, status")
    .eq("user_id", userId);

  if (error) throw error;
  return buildMarksFromRows((data ?? []) as unknown as DbMark[]);
}

export async function loadNotes(
  supabase: SupabaseClient,
  userId: string,
): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToNote);
}

export async function loadGoals(
  supabase: SupabaseClient,
  userId: string,
): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToGoal);
}

export async function loadSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppData["settings"] | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") return null; // not found
  if (error) throw error;
  return data ? rowToSettings(data) : null;
}

export async function loadProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data ? rowToProfile(data) : null;
}

export async function loadUnlocks(
  supabase: SupabaseClient,
  userId: string,
): Promise<Unlocks> {
  const { data, error } = await supabase
    .from("unlocks")
    .select("achievement_id, at, seen")
    .eq("user_id", userId);

  if (error) throw error;
  return rowToUnlocks((data ?? []) as unknown as DbUnlock[]);
}

export async function loadEconomy(
  supabase: SupabaseClient,
  userId: string,
): Promise<Economy | null> {
  // Load state (single row)
  const { data: state, error: stateErr } = await supabase
    .from("economy_state")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (stateErr && stateErr.code === "PGRST116") return null;
  if (stateErr) throw stateErr;

  // Load spent ledger
  const { data: spent, error: spentErr } = await supabase
    .from("economy_spent")
    .select("*")
    .eq("user_id", userId)
    .order("at", { ascending: true });

  if (spentErr) throw spentErr;

  // Load freezes
  const { data: freezes, error: freezeErr } = await supabase
    .from("economy_freezes")
    .select("*")
    .eq("user_id", userId)
    .order("at", { ascending: true });

  if (freezeErr) throw freezeErr;

  return state ? rowToEconomy(state, spent ?? [], freezes ?? []) : null;
}

export async function loadProgressSeen(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProgressSeen | null> {
  const { data, error } = await supabase
    .from("progress_seen")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data ? rowToProgressSeen(data) : null;
}

/* ────────────────────────────────────────────
   Public API: SAVE functions (full replace)
   ──────────────────────────────────────────── */

async function replaceTable<T>(
  supabase: SupabaseClient,
  table: string,
  userId: string,
  rows: T[],
  rowToDb: (row: T) => Record<string, unknown>,
): Promise<void> {
  // Delete all existing rows for this user
  const { error: delErr } = await supabase
    .from(table)
    .delete()
    .eq("user_id", userId);

  if (delErr) throw delErr;

  if (rows.length === 0) return;

  // Batch insert
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map(rowToDb);
    const { error: insErr } = await supabase.from(table).insert(batch);
    if (insErr) throw insErr;
  }
}

export async function saveHabits(
  supabase: SupabaseClient,
  userId: string,
  habits: Habit[],
): Promise<void> {
  await replaceTable(supabase, "habits", userId, habits, (h) =>
    habitToRow(userId, h) as unknown as Record<string, unknown>,
  );
}

export async function saveMarks(
  supabase: SupabaseClient,
  userId: string,
  marks: Marks,
): Promise<void> {
  const rows = marksToRows(userId, marks);
  await replaceTable(supabase, "marks", userId, rows, (r) => r as unknown as Record<string, unknown>);
}

export async function saveNotes(
  supabase: SupabaseClient,
  userId: string,
  notes: Note[],
): Promise<void> {
  await replaceTable(supabase, "notes", userId, notes, (n) =>
    noteToRow(userId, n) as unknown as Record<string, unknown>,
  );
}

export async function saveGoals(
  supabase: SupabaseClient,
  userId: string,
  goals: Goal[],
): Promise<void> {
  await replaceTable(supabase, "goals", userId, goals, (g) =>
    goalToRow(userId, g) as unknown as Record<string, unknown>,
  );
}

export async function saveSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: AppData["settings"],
): Promise<void> {
  const row = settingsToRow(userId, settings);
  const { error } = await supabase.from("user_settings").upsert(row, {
    onConflict: "user_id",
  });
  if (error) throw error;
}

export async function saveProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
): Promise<void> {
  const row = profileToRow(userId, profile);
  const { error } = await supabase.from("user_profile").upsert(row, {
    onConflict: "user_id",
  });
  if (error) throw error;
}

export async function saveUnlocks(
  supabase: SupabaseClient,
  userId: string,
  unlocks: Unlocks,
): Promise<void> {
  const rows = unlocksToRows(userId, unlocks);
  await replaceTable(supabase, "unlocks", userId, rows, (r) => r as unknown as Record<string, unknown>);
}

export async function saveEconomy(
  supabase: SupabaseClient,
  userId: string,
  economy: Economy,
): Promise<void> {
  // Upsert state (single row)
  const stateRow = economyStateToRow(userId, economy);
  const { error: stateErr } = await supabase
    .from("economy_state")
    .upsert(stateRow, { onConflict: "user_id" });
  if (stateErr) throw stateErr;

  // Replace spent ledger
  const spentRows = spentToRows(userId, economy.spent);
  await replaceTable(supabase, "economy_spent", userId, spentRows, (r) => r as unknown as Record<string, unknown>);

  // Replace freezes
  const freezeRows = freezesToRows(userId, economy.freezes);
  await replaceTable(supabase, "economy_freezes", userId, freezeRows, (r) => r as unknown as Record<string, unknown>);
}

export async function saveProgressSeen(
  supabase: SupabaseClient,
  userId: string,
  progressSeen: ProgressSeen,
): Promise<void> {
  const row = progressSeenToRow(userId, progressSeen);
  const { error } = await supabase.from("progress_seen").upsert(row, {
    onConflict: "user_id",
  });
  if (error) throw error;
}

/* ────────────────────────────────────────────
   User Stats Snapshot (for public profiles)
   ──────────────────────────────────────────── */

export interface StatsSnapshotData {
  level: number;
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  consistency14d: number;
  achievementCount: number;
  titleName: string;
  rankIcon: string;
}

export async function saveUserStatsSnapshot(
  supabase: SupabaseClient,
  userId: string,
  stats: StatsSnapshotData,
): Promise<void> {
  const { error } = await supabase.from("user_stats_snapshots").upsert(
    {
      user_id: userId,
      level: stats.level,
      current_streak: stats.currentStreak,
      best_streak: stats.bestStreak,
      total_completions: stats.totalCompletions,
      consistency_14d: stats.consistency14d,
      achievement_count: stats.achievementCount,
      title_name: stats.titleName,
      rank_icon: stats.rankIcon,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.warn("[db] Failed to save stats snapshot:", error.message);
  }
}

/* ────────────────────────────────────────────
   Full AppData load & save (convenience)
   ──────────────────────────────────────────── */

export async function loadAllUserData(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppData | null> {
  try {
    const [habits, marks, notes, goals, settings, profile, unlocks, economy, progressSeen] =
      await Promise.all([
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

    // If no data at all (new user), return null so the caller knows to push local data
    if (
      habits.length === 0 &&
      marks && Object.keys(marks).length === 0
    ) {
      return null;
    }

    return {
      version: SCHEMA_VERSION,
      habits,
      marks,
      notes,
      goals,
      auditLog: [], // audit log stays local only
      settings: settings ?? {
        theme: DEFAULT_THEME,
        graceHours: DEFAULT_GRACE_HOURS,
        usedTemplateIds: [],
      },
      profile: profile ?? DEFAULT_PROFILE,
      unlocks,
      economy: economy ?? DEFAULT_ECONOMY,
      progressSeen: progressSeen ?? DEFAULT_PROGRESS_SEEN,
    };
  } catch (e) {
    console.error("[db] Failed to load user data:", e);
    return null;
  }
}

export async function saveAllUserData(
  supabase: SupabaseClient,
  userId: string,
  data: AppData,
): Promise<void> {
  // Run all saves. Errors are caught by the caller for retry logic.
  await Promise.all([
    saveHabits(supabase, userId, data.habits),
    saveMarks(supabase, userId, data.marks),
    saveNotes(supabase, userId, data.notes),
    saveGoals(supabase, userId, data.goals),
    saveSettings(supabase, userId, data.settings),
    saveProfile(supabase, userId, data.profile),
    saveUnlocks(supabase, userId, data.unlocks),
    saveEconomy(supabase, userId, data.economy),
    saveProgressSeen(supabase, userId, data.progressSeen),
  ]);
}

/* ────────────────────────────────────────────
   Incremental save (called after each mutation)
   ──────────────────────────────────────────── */

// Which tables changed — used by sync on mutation to only push what changed.
export type ChangedTables = {
  habits?: true;
  marks?: true;
  notes?: true;
  goals?: true;
  settings?: true;
  profile?: true;
  unlocks?: true;
  economy?: true;
  progressSeen?: true;
};

export async function saveChanged(
  supabase: SupabaseClient,
  userId: string,
  data: AppData,
  changed: ChangedTables,
): Promise<void> {
  const promises: Promise<unknown>[] = [];

  if (changed.habits) promises.push(saveHabits(supabase, userId, data.habits));
  if (changed.marks) promises.push(saveMarks(supabase, userId, data.marks));
  if (changed.notes) promises.push(saveNotes(supabase, userId, data.notes));
  if (changed.goals) promises.push(saveGoals(supabase, userId, data.goals));
  if (changed.settings) promises.push(saveSettings(supabase, userId, data.settings));
  if (changed.profile) promises.push(saveProfile(supabase, userId, data.profile));
  if (changed.unlocks) promises.push(saveUnlocks(supabase, userId, data.unlocks));
  if (changed.economy) promises.push(saveEconomy(supabase, userId, data.economy));
  if (changed.progressSeen) promises.push(saveProgressSeen(supabase, userId, data.progressSeen));

  await Promise.all(promises);
}
