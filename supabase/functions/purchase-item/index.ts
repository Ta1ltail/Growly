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

const CATALOG: ShopItem[] = [
  // Flame skins
  { id: "flame-azure", name: "Azure Flame", description: "Blue flame skin", slot: "flame", price: 100 },
  { id: "flame-emerald", name: "Emerald Flame", description: "Green flame skin", slot: "flame", price: 100 },
  { id: "flame-violet", name: "Violet Flame", description: "Purple flame skin", slot: "flame", price: 100 },
  { id: "flame-gold", name: "Golden Flame", description: "Gold flame skin", slot: "flame", price: 150, minLevel: 5 },
  { id: "flame-ice", name: "Ice Flame", description: "Ice flame skin", slot: "flame", price: 150 },
  { id: "flame-lava", name: "Lava Flame", description: "Lava flame skin", slot: "flame", price: 200, minLevel: 10 },
  { id: "flame-rainbow", name: "Rainbow Flame", description: "Rainbow flame skin", slot: "flame", price: 300, minLevel: 10 },
  { id: "flame-solar", name: "Solar Flame", description: "Solar flame skin", slot: "flame", price: 500, minLevel: 15 },
  // Confetti palettes
  { id: "confetti-mono", name: "Monochrome", description: "Black & white confetti", slot: "confetti", price: 100 },
  { id: "confetti-neon", name: "Neon", description: "Neon confetti palette", slot: "confetti", price: 150 },
  { id: "confetti-fire", name: "Firework", description: "Firework confetti", slot: "confetti", price: 200 },
  { id: "confetti-pastel", name: "Pastel", description: "Pastel confetti palette", slot: "confetti", price: 150 },
  { id: "confetti-gold", name: "Gold", description: "Gold confetti", slot: "confetti", price: 300, minLevel: 5 },
  { id: "confetti-ocean", name: "Ocean", description: "Ocean confetti", slot: "confetti", price: 200 },
  // Accent themes
  { id: "accent-crimson", name: "Crimson", description: "Red accent theme", slot: "accent", price: 200 },
  { id: "accent-emerald", name: "Emerald", description: "Green accent theme", slot: "accent", price: 200 },
  { id: "accent-violet", name: "Violet", description: "Purple accent theme", slot: "accent", price: 200 },
  { id: "accent-amber", name: "Amber", description: "Amber accent theme", slot: "accent", price: 200 },
  { id: "accent-pink", name: "Pink", description: "Pink accent theme", slot: "accent", price: 250 },
  { id: "accent-ocean", name: "Ocean", description: "Teal accent theme", slot: "accent", price: 250 },
  { id: "accent-lime", name: "Lime", description: "Lime accent theme", slot: "accent", price: 300, minLevel: 5 },
  // Streak freeze consumable
  { id: "freeze", name: "Streak Freeze", description: "Protect one streak from breaking", slot: "consumable", price: 75 },
];

// ── Request body ──
interface PurchaseRequest {
  itemId: string;
  habitId?: string;    // for freeze: which habit to protect
  dateKey?: string;    // for freeze: which date to protect
}

// ── Coin computation (mirrors src/lib/economy.ts) ──

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

    // ══ Load economy and stats ══
    const [ecoStateRes, ecoSpentRes, statsRes, unlocksRes, habitsRes, marksRes] = await Promise.all([
      supabase.from("economy_state").select("*").eq("user_id", userId).single(),
      supabase.from("economy_spent").select("amount").eq("user_id", userId),
      supabase.from("user_stats_snapshots").select("*").eq("user_id", userId).single(),
      supabase.from("unlocks").select("achievement_id").eq("user_id", userId),
      supabase.from("habits").select("id").eq("user_id", userId),
      supabase.from("marks").select("status").eq("user_id", userId),
    ]);

    // Compute coin balance server-side
    const doneCount = (marksRes.data ?? []).filter((m: { status: string }) => m.status === "done").length;
    const perfectDays = 0; // simplified — computing perfect days requires full schedule logic
    const unlockedRarities: string[] = []; // simplified — rarity lookup omitted
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
