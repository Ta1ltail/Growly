// ═══════════════════════════════════════════════════════════════════════════
// purchase-item — Supabase Edge Function
// ═══════════════════════════════════════════════════════════════════════════
//
// Validates a shop purchase server-side before creating the spend entry.
// The client computes the balance locally (coinsEarned - sum(spent)), but the
// server verifies it independently to prevent manipulated clients from buying
// items they can't afford.
//
// Also validates:
//   - Item exists in the catalog
//   - User meets minimum level requirements
//   - Item not already owned
//   - Freeze limit not exceeded (1 per 7 days)
//   - Freeze day is a genuine past missed mark

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ── Shop catalog (mirrors src/lib/economy.ts) ──

interface ShopItem {
  id: string;
  name: string;
  description: string;
  slot: string;
  price: number;
  minLevel?: number;
}

// ── Shop catalog (must match src/lib/economy.ts exactly) ──

const CATALOG: ShopItem[] = [
  // Flame skins
  { id: "flame-azure", name: "Azure Flame", description: "A cool blue streak flame.", slot: "flame", price: 120 },
  { id: "flame-emerald", name: "Emerald Flame", description: "A verdant green streak flame.", slot: "flame", price: 120 },
  { id: "flame-violet", name: "Violet Flame", description: "A mystic purple streak flame.", slot: "flame", price: 200 },
  { id: "flame-gold", name: "Golden Flame", description: "A radiant gold flame for the dedicated.", slot: "flame", price: 400, minLevel: 10 },
  { id: "flame-ice", name: "Ice Flame", description: "A frosty blue-cyan streak flame.", slot: "flame", price: 180 },
  { id: "flame-lava", name: "Lava Flame", description: "A blazing red-hot streak flame.", slot: "flame", price: 250, minLevel: 6 },
  { id: "flame-rainbow", name: "Rainbow Flame", description: "A prismatic, color-shifting flame.", slot: "flame", price: 500, minLevel: 15 },
  { id: "flame-solar", name: "Solar Flame", description: "A brilliant golden-white streak flame.", slot: "flame", price: 350, minLevel: 12 },
  // Confetti palettes
  { id: "confetti-mono", name: "Monochrome Confetti", description: "Clean, minimal celebration.", slot: "confetti", price: 100 },
  { id: "confetti-neon", name: "Neon Confetti", description: "Loud, electric celebration.", slot: "confetti", price: 150 },
  { id: "confetti-fire", name: "Firework Confetti", description: "Warm sparks on every unlock.", slot: "confetti", price: 250, minLevel: 5 },
  { id: "confetti-pastel", name: "Pastel Confetti", description: "Soft, dreamy celebration colors.", slot: "confetti", price: 120 },
  { id: "confetti-gold", name: "Gold Confetti", description: "Luxurious golden shower.", slot: "confetti", price: 300, minLevel: 8 },
  { id: "confetti-ocean", name: "Ocean Confetti", description: "Deep blue-teal celebration.", slot: "confetti", price: 200 },
  // Accent themes
  { id: "accent-crimson", name: "Crimson Accent", description: "Recolor the app in bold crimson.", slot: "accent", price: 150 },
  { id: "accent-emerald", name: "Emerald Accent", description: "Recolor the app in fresh emerald.", slot: "accent", price: 150 },
  { id: "accent-violet", name: "Violet Accent", description: "Recolor the app in deep violet.", slot: "accent", price: 200 },
  { id: "accent-amber", name: "Amber Accent", description: "Recolor the app in warm amber.", slot: "accent", price: 300, minLevel: 8 },
  { id: "accent-pink", name: "Pink Accent", description: "Recolor the app in vibrant pink.", slot: "accent", price: 180 },
  { id: "accent-ocean", name: "Ocean Accent", description: "Recolor the app in deep teal.", slot: "accent", price: 220 },
  { id: "accent-lime", name: "Lime Accent", description: "Recolor the app in fresh lime.", slot: "accent", price: 280, minLevel: 6 },
  // Streak freeze consumable — price matches FREEZE_PRICE in src/lib/economy.ts
  { id: "freeze", name: "Streak Freeze", description: "Protect one streak from breaking", slot: "consumable", price: 75 },
];

// ── Request body ──
interface PurchaseRequest {
  itemId: string;
  habitId?: string;    // for freeze: which habit to protect
  dateKey?: string;    // for freeze: which date to protect
}

// ── Coin computation (must match src/lib/economy.ts exactly) ──

const COINS_PER_COMPLETION = 2;
const COINS_PER_PERFECT_DAY = 10;
const RARITY_COINS: Record<string, number> = {
  common: 10, rare: 30, epic: 80, legendary: 200,
};

function coinsEarned(
  doneCount: number,
  perfectDays: number,
  unlockedRarities: string[],
  bonusCoins: number,
): number {
  const base = doneCount * COINS_PER_COMPLETION;
  const perfect = perfectDays * COINS_PER_PERFECT_DAY;
  const fromAchievements = unlockedRarities.reduce((sum, r) => sum + (RARITY_COINS[r] ?? 0), 0);
  return base + perfect + fromAchievements + bonusCoins;
}

// ── Schedule helpers (for proper perfect-days computation) ──

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function effectiveRecurrence(habit: {
  recurrence?: { kind: "daily" | "weekly" | "monthly"; weekdays?: number[]; monthDays?: number[] } | null;
  repeat_days: number[];
}): { kind: "daily" | "weekly" | "monthly"; weekdays?: number[]; monthDays?: number[] } {
  if (habit.recurrence) return habit.recurrence;
  return habit.repeat_days.length === 0
    ? { kind: "daily" }
    : { kind: "weekly", weekdays: habit.repeat_days };
}

function habitStartDay(habit: { start_date?: string | null; created_at: string }): Date {
  if (habit.start_date) return startOfDay(parseDateKey(habit.start_date));
  return startOfDay(new Date(habit.created_at));
}

function isScheduled(habit: {
  recurrence?: { kind: "daily" | "weekly" | "monthly"; weekdays?: number[]; monthDays?: number[] } | null;
  repeat_days: number[];
  start_date?: string | null;
  created_at: string;
}, date: Date): boolean {
  if (startOfDay(date).getTime() < habitStartDay(habit).getTime()) return false;
  const rec = effectiveRecurrence(habit);
  switch (rec.kind) {
    case "daily": return true;
    case "weekly": return rec.weekdays!.length === 0 || rec.weekdays!.includes(date.getDay());
    case "monthly": return rec.monthDays!.length === 0
        ? date.getDate() === habitStartDay(habit).getDate()
        : rec.monthDays!.includes(date.getDate());
  }
}

// Compute the number of perfect days (every scheduled habit done) from marks.
function computePerfectDays(
  habits: {
    id: string;
    recurrence?: { kind: "daily" | "weekly" | "monthly"; weekdays?: number[]; monthDays?: number[] } | null;
    repeat_days: number[];
    start_date?: string | null;
    created_at: string;
  }[],
  marks: { date_key: string; habit_id: string; status: string }[],
  today: Date,
): number {
  if (habits.length === 0) return 0;

  // Build marksByDate: { dateKey: { habitId: status } }
  const marksByDate: Record<string, Record<string, string>> = {};
  for (const m of marks) {
    if (!marksByDate[m.date_key]) marksByDate[m.date_key] = {};
    marksByDate[m.date_key][m.habit_id] = m.status;
  }

  const start = habits.reduce(
    (min, h) => Math.min(min, habitStartDay(h).getTime()),
    startOfDay(today).getTime(),
  );
  let perfectDays = 0;
  for (let d = new Date(start); d.getTime() <= startOfDay(today).getTime(); d = addDays(d, 1)) {
    const scheduled = habits.filter((h) => isScheduled(h, d));
    if (scheduled.length === 0) continue;
    const key = dateKey(d);
    if (scheduled.every((h) => marksByDate[key]?.[h.id] === "done")) {
      perfectDays += 1;
    }
  }
  return perfectDays;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: PurchaseRequest = await req.json();
    if (!body.itemId) {
      return new Response(JSON.stringify({ error: "Missing itemId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up item in catalog
    const item = CATALOG.find((i) => i.id === body.itemId);
    if (!item) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create authenticated client for reading user data
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Create service-role client for writing
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // ══ Load economy, stats, and data for server-side validation ══
    // We need habits + marks to compute perfectDays server-side, and unlocks
    // to determine unlocked rarity tiers (both affect coin balance).
    const [ecoStateRes, ecoSpentRes, statsRes, unlocksRes, habitsRes, marksRes] = await Promise.all([
      supabase.from("economy_state").select("*").eq("user_id", userId).single(),
      supabase.from("economy_spent").select("amount").eq("user_id", userId),
      supabase.from("user_stats_snapshots").select("*").eq("user_id", userId).single(),
      supabase.from("unlocks").select("achievement_id").eq("user_id", userId),
      supabase.from("habits").select("id, name, category, repeat_days, created_at, recurrence, start_date, time_of_day, archived").eq("user_id", userId),
      supabase.from("marks").select("date_key, habit_id, status").eq("user_id", userId),
    ]);

    // Compute coin balance server-side (must match src/lib/economy.ts logic)
    const doneCount = (marksRes.data ?? []).filter((m: { status: string }) => m.status === "done").length;

    // Properly compute perfect days from marks + habit schedules
    const habits = habitsRes.data ?? [];
    const perfectDays = computePerfectDays(habits, marksRes.data ?? [], new Date());

    // Determine unlocked rarities from actual unlock records
    const achievementRarityMap: Record<string, string> = {
      "streak-1": "common", "streak-3": "common", "streak-7": "rare", "streak-14": "rare",
      "streak-21": "rare", "streak-30": "epic", "streak-50": "epic", "streak-75": "epic",
      "streak-100": "legendary", "streak-200": "legendary", "streak-365": "legendary",
      "done-1": "common", "done-10": "common", "done-50": "rare", "done-250": "rare",
      "done-100": "epic", "done-500": "epic", "done-1000": "legendary", "done-2500": "legendary", "done-5000": "legendary",
      "perfect-week": "rare", "perfect-week-4": "epic", "perfect-week-12": "legendary", "perfect-month": "legendary",
      "perfect-days-10": "rare", "perfect-days-25": "rare", "perfect-days-50": "epic", "perfect-days-100": "legendary",
      "cat-workout": "rare", "cat-workout-200": "epic",
      "cat-studies": "rare", "cat-studies-200": "epic",
      "cat-work": "rare", "cat-work-200": "epic",
      "cat-health": "rare", "cat-health-200": "epic",
      "cat-hobbies-50": "rare", "cat-hobbies-200": "epic",
      "cat-personal-50": "rare", "cat-personal-200": "epic",
      "early-bird": "rare", "early-bird-50": "epic",
      "night-owl": "rare", "night-owl-50": "epic",
      "weekend-warrior": "epic",
      "comeback-king": "epic", "missed-recovery-5": "epic",
      "habit-collector": "common", "habit-creator-5": "common", "habit-creator-20": "rare", "habit-creator-50": "epic",
      "habit-master": "legendary",
      "missed-zero-30": "epic",
      "all-streak-7": "epic",
    };
    const unlockedRarities: string[] = [];
    const seenRarities = new Set<string>();
    if (unlocksRes.data) {
      for (const row of unlocksRes.data as { achievement_id: string }[]) {
        const rarity = achievementRarityMap[row.achievement_id];
        if (rarity && !seenRarities.has(rarity)) {
          seenRarities.add(rarity);
          unlockedRarities.push(rarity);
        }
      }
    }

    const bonusCoins = ecoStateRes.data?.bonus_coins ?? 0;
    const totalSpent = (ecoSpentRes.data ?? []).reduce(
      (sum: number, s: { amount: number }) => sum + s.amount, 0,
    );
    const earned = coinsEarned(doneCount, perfectDays, unlockedRarities, bonusCoins);
    const balance = Math.max(0, earned - totalSpent);

    // ══ Validation checks ══

    // 1. Minimum level check
    if (item.minLevel && statsRes.data) {
      const level = (statsRes.data as Record<string, unknown>).level as number;
      if (level < item.minLevel) {
        return new Response(JSON.stringify({
          error: `Minimum level ${item.minLevel} required`,
          balance, price: item.price,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 2. Already owned check (for non-freeze cosmetics)
    if (item.slot !== "consumable") {
      const owned: string[] = (ecoStateRes.data as Record<string, unknown>)?.owned as string[] ?? [];
      if (owned.includes(item.id)) {
        return new Response(JSON.stringify({
          error: "Already owned",
          balance, price: item.price,
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 3. Freeze-specific checks
    if (item.id === "freeze") {
      if (!body.habitId || !body.dateKey) {
        return new Response(JSON.stringify({ error: "Freeze requires habitId and dateKey" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check freeze limit (max 1 per rolling 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentFreezes = await supabase
        .from("economy_freezes")
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .gte("at", sevenDaysAgo.toISOString());
      if ((recentFreezes.count ?? 0) >= 1) {
        return new Response(JSON.stringify({
          error: "Freeze limit reached (1 per 7 days)",
          balance, price: item.price,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check habit exists
      const habitExists = (habitsRes.data ?? []).some((h: { id: string }) => h.id === body.habitId);
      if (!habitExists) {
        return new Response(JSON.stringify({ error: "Habit not found" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check the day was actually missed
      const marksOnDay = await supabase
        .from("marks")
        .select("status")
        .eq("user_id", userId)
        .eq("date_key", body.dateKey)
        .eq("habit_id", body.habitId)
        .single();
      if ((marksOnDay.data as { status?: string })?.status !== "missed") {
        return new Response(JSON.stringify({
          error: "Day is not a genuine miss",
          balance, price: item.price,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 4. Balance check
    if (balance < item.price) {
      return new Response(JSON.stringify({
        error: "Insufficient coins",
        balance, price: item.price,
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ══ Execute purchase ══
    const now = new Date().toISOString();

    if (item.slot === "consumable") {
      // Streak freeze: insert into economy_freezes
      const { error: freezeErr } = await serviceClient
        .from("economy_freezes")
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          at: now,
          date: body.dateKey!,
          habit_id: body.habitId!,
        });
      if (freezeErr) throw new Error(`Failed to create freeze: ${freezeErr.message}`);
    } else {
      // Cosmetics: add to owned + auto-equip
      const currentOwned: string[] = (ecoStateRes.data as Record<string, unknown>)?.owned as string[] ?? [];
      const currentEquipped: Record<string, string> = (ecoStateRes.data as Record<string, unknown>)?.equipped as Record<string, string> ?? {};

      const { error: stateErr } = await serviceClient
        .from("economy_state")
        .upsert({
          user_id: userId,
          owned: [...currentOwned, item.id],
          equipped: { ...currentEquipped, [item.slot]: item.id },
          bonus_coins: bonusCoins,
          last_check_in: (ecoStateRes.data as Record<string, unknown>)?.last_check_in ?? null,
          check_in_streak: (ecoStateRes.data as Record<string, unknown>)?.check_in_streak ?? 0,
          last_quest_date: (ecoStateRes.data as Record<string, unknown>)?.last_quest_date ?? null,
          current_quest: (ecoStateRes.data as Record<string, unknown>)?.current_quest ?? null,
          last_spin_date: (ecoStateRes.data as Record<string, unknown>)?.last_spin_date ?? null,
          last_spin_result: (ecoStateRes.data as Record<string, unknown>)?.last_spin_result ?? null,
        }, { onConflict: "user_id" });
      if (stateErr) throw new Error(`Failed to update state: ${stateErr.message}`);
    }

    // Write spend entry
    const { error: spendErr } = await serviceClient
      .from("economy_spent")
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        at: now,
        amount: item.price,
        item: item.id,
      });
    if (spendErr) throw new Error(`Failed to record spend: ${spendErr.message}`);

    return new Response(JSON.stringify({
      success: true,
      itemId: item.id,
      price: item.price,
      newBalance: balance - item.price,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[purchase-item] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
