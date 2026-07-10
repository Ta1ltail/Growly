"use client";

import { useMemo, useState } from "react";
import { Check, Lock, Snowflake, Info } from "lucide-react";
import {
  useAppData,
  buyCosmetic,
  equipCosmetic,
  redeemFreeze,
} from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { useHydrated } from "@/hooks/useHydrated";
import { summarizeProgress } from "@/lib/progress";
import type { CosmeticSlot } from "@/lib/types";
import {
  SHOP_ITEMS,
  coinBreakdown,
  FREEZE_PRICE,
  FREEZE_MAX_PER_WINDOW,
  FREEZE_WINDOW_DAYS,
  canUseFreeze,
  freezesUsedInWindow,
  freezableDays,
  equippedOrDefault,
  type ShopItem,
} from "@/lib/economy";
import { prettyDate, parseDateKey } from "@/lib/date";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CoinChip } from "@/components/economy/CoinChip";
import { CoinBreakdownCard } from "@/components/economy/CoinBreakdownCard";
import { AppPageShell } from "@/components/layout/AppPageShell";

const SLOT_LABEL: Record<CosmeticSlot, string> = {
  flame: "Streak Flames",
  confetti: "Confetti Palettes",
  accent: "Accent Themes",
};

const SLOTS: CosmeticSlot[] = ["flame", "confetti", "accent"];

// Swatch color for the free "Default" card in each slot.
const DEFAULT_PREVIEW: Record<CosmeticSlot, string> = {
  flame: "#f97316",
  confetti: "#4b8bf7",
  accent: "var(--c-accent)",
};

export default function ShopPage() {
  const data = useAppData();
  const today = useToday();
  const hydrated = useHydrated();

  const summary = useMemo(() => summarizeProgress(data, today), [data, today]);
  const balance = summary.coinBalance;
  const level = summary.level.level;
  const breakdown = useMemo(
    () =>
      coinBreakdown(
        summary.stats,
        summary.achievements.filter((a) => a.unlocked).map((a) => a.def.rarity),
        data.economy,
      ),
    [summary.stats, summary.achievements, data.economy],
  );

  if (!hydrated) return <PageSkeleton />;

  return (
    <AppPageShell>
      <PageHeader
        title="Shop"
        subtitle="Spend coins earned from your habits"
        action={<CoinChip amount={balance} size="lg" animate />}
      />

      <CoinBreakdownCard breakdown={breakdown} spends={data.economy.spent} />

      {SLOTS.map((slot) => {
        const items = SHOP_ITEMS.filter((i) => i.slot === slot);
        if (items.length === 0) return null;
        const equipped = equippedOrDefault(data.economy, slot);
        return (
          <section key={slot} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              {SLOT_LABEL[slot]}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Free default is always available + equippable. */}
              <CosmeticCard
                slot={slot}
                defaultCard
                equipped={equipped === `${slot}-default`}
                onEquip={() => equipCosmetic(slot, `${slot}-default`)}
              />
              {items.map((item) => (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  slot={slot}
                  owned={data.economy.owned.includes(item.id)}
                  equipped={equipped === item.id}
                  affordable={balance >= item.price}
                  levelOk={!item.minLevel || level >= item.minLevel}
                  onBuy={() => buyCosmetic(item.id)}
                  onEquip={() => equipCosmetic(slot, item.id)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <FreezeSection balance={balance} />
    </AppPageShell>
  );
}

function CosmeticCard({
  item,
  slot,
  defaultCard = false,
  owned = false,
  equipped = false,
  affordable = false,
  levelOk = true,
  onBuy,
  onEquip,
}: {
  item?: ShopItem;
  slot: CosmeticSlot;
  defaultCard?: boolean;
  owned?: boolean;
  equipped?: boolean;
  affordable?: boolean;
  levelOk?: boolean;
  onBuy?: () => void;
  onEquip?: () => void;
}) {
  const name = defaultCard ? "Default" : item!.name;
  const description = defaultCard
    ? "The classic look. Always free."
    : item!.description;
  const preview = defaultCard ? DEFAULT_PREVIEW[slot] : item!.preview;
  const canEquip = defaultCard || owned;

  return (
    <Card
      className={`flex flex-col gap-3 p-4 transition-colors ${equipped ? "ring-2 ring-accent" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span
          className="size-10 shrink-0 rounded-xl"
          style={{
            background: preview,
            boxShadow: `0 4px 16px -4px ${preview}`,
          }}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted">{description}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        {!canEquip && item && <CoinChip amount={item.price} size="sm" />}
        {canEquip ? (
          equipped ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-accent">
              <Check className="size-3.5" /> Equipped
            </span>
          ) : (
            <Button variant="ghost" onClick={onEquip} className="ml-auto">
              Equip
            </Button>
          )
        ) : !levelOk ? (
          <span
            className="flex items-center gap-1 text-xs text-faint"
            title={`Reach level ${item!.minLevel}`}
          >
            <Lock className="size-3.5" /> Lvl {item!.minLevel}
          </span>
        ) : (
          <Button onClick={onBuy} disabled={!affordable} className="ml-auto">
            {affordable ? "Buy" : "Not enough"}
          </Button>
        )}
      </div>
    </Card>
  );
}

function FreezeSection({ balance }: { balance: number }) {
  const data = useAppData();
  const today = useToday();
  const [habitId, setHabitId] = useState<string>("");

  const active = useMemo(
    () => data.habits.filter((h) => !h.archived),
    [data.habits],
  );
  const allowed = canUseFreeze(data.economy, today);
  const usedInWindow = freezesUsedInWindow(data.economy, today);
  const affordable = balance >= FREEZE_PRICE;

  // Eligible missed days for the chosen habit (genuine misses only).
  const days = useMemo(
    () =>
      habitId ? freezableDays(data.economy, data.marks, habitId, today) : [],
    [habitId, data.economy, data.marks, today],
  );

  return (
    <section className="mb-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Consumables
      </h2>
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-400">
            <Snowflake className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Streak Freeze</p>
              <CoinChip amount={FREEZE_PRICE} size="sm" />
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Protect one past missed day so it doesn&apos;t break your streak.
              The miss stays in your history — honest tracking — it just
              won&apos;t count against the run. Limited to{" "}
              {FREEZE_MAX_PER_WINDOW} per {FREEZE_WINDOW_DAYS} days.
            </p>

            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-faint">
              <Info className="size-3.5" />
              {allowed
                ? `${FREEZE_MAX_PER_WINDOW - usedInWindow} freeze available this window.`
                : `Limit reached — next freeze available soon.`}
            </p>

            {/* Picker: choose a habit, then an eligible missed day. */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                value={habitId}
                onChange={(e) => setHabitId(e.target.value)}
                disabled={!allowed || active.length === 0}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent disabled:opacity-50"
                aria-label="Choose a habit to protect"
              >
                <option value="">Choose a habit…</option>
                {active.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>

              {habitId && days.length === 0 && (
                <span className="text-xs text-faint">
                  No eligible missed days in the last 30 days.
                </span>
              )}

              {habitId &&
                days.map((key) => (
                  <Button
                    key={key}
                    variant="ghost"
                    disabled={!allowed || !affordable}
                    onClick={() => {
                      redeemFreeze(habitId, key);
                      setHabitId("");
                    }}
                    className="text-xs"
                  >
                    Freeze {prettyDate(parseDateKey(key))}
                  </Button>
                ))}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
