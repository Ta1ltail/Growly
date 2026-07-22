// Economy DB module — row converters + load + save.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Economy,
  BonusEntry,
  SpendEntry,
  FreezeEntry,
  DailyQuest,
} from "../../types";
import { upsertTable, type DbEconomyState, type DbEconomySpent, type DbEconomyFreeze, type DbEconomyBonus } from "./core";

export function bonusToRow(
  userId: string,
  b: BonusEntry,
): DbEconomyBonus {
  return {
    id: b.id,
    user_id: userId,
    type: b.type,
    date_key: b.dateKey,
    amount: b.amount,
    created_at: b.at,
  };
}

export function rowToEconomy(
  state: DbEconomyState,
  spent: DbEconomySpent[],
  freezes: DbEconomyFreeze[],
  bonuses: DbEconomyBonus[],
): Economy {
  const equipped: Partial<Record<string, string>> = {};
  if (state.equipped && typeof state.equipped === "object") {
    for (const [slot, id] of Object.entries(
      state.equipped as Record<string, unknown>,
    )) {
      if (typeof id === "string") equipped[slot] = id;
    }
  }

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

  let lastSpinResult: {
    label: string;
    amount: number;
    isFreeze: boolean;
    originalLabel?: string;
  } | null = null;
  if (state.last_spin_result && typeof state.last_spin_result === "object") {
    const r = state.last_spin_result as Record<string, unknown>;
    if (
      typeof r.label === "string" &&
      typeof r.amount === "number" &&
      typeof r.isFreeze === "boolean"
    ) {
      lastSpinResult = {
        label: r.label as string,
        amount: r.amount as number,
        isFreeze: r.isFreeze as boolean,
        originalLabel:
          typeof r.originalLabel === "string"
            ? (r.originalLabel as string)
            : undefined,
      };
    }
  }

  return {
    spent: spent.map((s) => ({
      id: s.id,
      at: s.at,
      amount: s.amount,
      item: s.item,
    })),
    owned: state.owned ?? [],
    equipped: equipped as Economy["equipped"],
    freezes: freezes.map((f) => ({
      id: f.id,
      at: f.at,
      date: f.date,
      habitId: f.habit_id,
    })),
    bonuses: bonuses.map((b) => ({
      id: b.id,
      type: b.type as BonusEntry["type"],
      dateKey: b.date_key,
      amount: b.amount,
      at: b.created_at,
    })),
    bonusCoins: state.bonus_coins ?? 0,
    lastCheckIn: state.last_check_in ?? null,
    checkInStreak: state.check_in_streak ?? 0,
    lastQuestDate: state.last_quest_date ?? null,
    currentQuest,
    lastSpinDate: state.last_spin_date ?? null,
    lastSpinResult,
  };
}

export function economyStateToRow(
  userId: string,
  eco: Economy,
): DbEconomyState {
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

export function spentToRows(
  userId: string,
  spent: SpendEntry[],
): DbEconomySpent[] {
  return spent.map((s) => ({
    id: s.id,
    user_id: userId,
    at: s.at,
    amount: s.amount,
    item: s.item,
  }));
}

export function freezesToRows(
  userId: string,
  freezes: FreezeEntry[],
): DbEconomyFreeze[] {
  return freezes.map((f) => ({
    id: f.id,
    user_id: userId,
    at: f.at,
    date: f.date,
    habit_id: f.habitId,
  }));
}

export async function loadEconomy(
  supabase: SupabaseClient,
  userId: string,
): Promise<Economy | null> {
  const { data: state, error: stateErr } = await supabase
    .from("economy_state")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (stateErr && stateErr.code === "PGRST116") return null;
  if (stateErr) throw stateErr;

  const { data: spent, error: spentErr } = await supabase
    .from("economy_spent")
    .select("*")
    .eq("user_id", userId)
    .order("at", { ascending: true });
  if (spentErr) throw spentErr;

  const { data: freezes, error: freezeErr } = await supabase
    .from("economy_freezes")
    .select("*")
    .eq("user_id", userId)
    .order("at", { ascending: true });
  if (freezeErr) throw freezeErr;

  const { data: bonuses, error: bonusErr } = await supabase
    .from("economy_bonuses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (bonusErr) throw bonusErr;

  return state
    ? rowToEconomy(state, spent ?? [], freezes ?? [], bonuses ?? [])
    : null;
}

export async function saveEconomy(
  supabase: SupabaseClient,
  userId: string,
  economy: Economy,
): Promise<void> {
  const stateRow = economyStateToRow(userId, economy);
  const { error: stateErr } = await supabase
    .from("economy_state")
    .upsert(stateRow, { onConflict: "user_id" });
  if (stateErr) throw stateErr;

  const spentRows = spentToRows(userId, economy.spent);
  await upsertTable(
    supabase,
    "economy_spent",
    spentRows,
    (r) => r,
    "id",
  );

  const freezeRows = freezesToRows(userId, economy.freezes);
  await upsertTable(
    supabase,
    "economy_freezes",
    freezeRows,
    (r) => r,
    "id",
  );

  const bonusRows = economy.bonuses.map((b) => bonusToRow(userId, b));
  await upsertTable(
    supabase,
    "economy_bonuses",
    bonusRows,
    (r) => r,
    "user_id,type,date_key",
  );
}
