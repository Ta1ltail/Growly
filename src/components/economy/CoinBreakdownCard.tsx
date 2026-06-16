"use client";

// "Where your coins come from" — makes the DERIVED balance legible. Coins are
// never stored; this panel shows the exact derivation (completions, perfect
// days, achievement bonuses) minus the spend ledger, so the number in the shop
// header is never a mystery.

import { CheckCircle2, Sparkles, Trophy, Coins, Minus } from "lucide-react";
import type { CoinBreakdown } from "@/lib/economy";
import { COINS_PER_COMPLETION, COINS_PER_PERFECT_DAY, shopItem } from "@/lib/economy";
import type { SpendEntry } from "@/lib/types";
import { Card } from "@/components/ui/Card";

function spendLabel(item: string): string {
  if (item === "freeze") return "Streak Freeze";
  return shopItem(item)?.name ?? item;
}

function EarnRow({
  icon: Icon,
  label,
  detail,
  coins,
}: {
  icon: typeof Coins;
  label: string;
  detail: string;
  coins: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-2 text-sm">
        <Icon className="size-4 text-accent" aria-hidden />
        {label}
        <span className="text-xs text-faint">{detail}</span>
      </span>
      <span className="font-mono text-sm tabular-nums text-amber-500">+{coins.toLocaleString()}</span>
    </div>
  );
}

export function CoinBreakdownCard({
  breakdown,
  spends,
}: {
  breakdown: CoinBreakdown;
  spends: SpendEntry[];
}) {
  const recent = [...spends].reverse().slice(0, 4);

  return (
    <Card className="mb-8 p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <Coins className="size-4 text-amber-500" aria-hidden /> Where your coins come from
      </h2>

      <div className="divide-y divide-line">
        <EarnRow
          icon={CheckCircle2}
          label="Completions"
          detail={`${breakdown.completions.toLocaleString()} × ${COINS_PER_COMPLETION}`}
          coins={breakdown.fromCompletions}
        />
        <EarnRow
          icon={Sparkles}
          label="Perfect days"
          detail={`${breakdown.perfectDays.toLocaleString()} × ${COINS_PER_PERFECT_DAY}`}
          coins={breakdown.fromPerfectDays}
        />
        <EarnRow
          icon={Trophy}
          label="Achievement bonuses"
          detail="by rarity"
          coins={breakdown.fromAchievements}
        />
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-line pt-2.5">
        <span className="text-sm font-semibold">Total earned</span>
        <span className="font-mono text-sm font-bold tabular-nums">{breakdown.earned.toLocaleString()}</span>
      </div>

      {breakdown.spent > 0 && (
        <>
          <div className="mt-1 flex items-center justify-between py-1.5">
            <span className="flex items-center gap-2 text-sm">
              <Minus className="size-4 text-faint" aria-hidden /> Spent
            </span>
            <span className="font-mono text-sm tabular-nums text-faint">−{breakdown.spent.toLocaleString()}</span>
          </div>
          {recent.length > 0 && (
            <ul className="mb-1 ml-6 space-y-0.5">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-xs text-faint">
                  <span>{spendLabel(s.item)}</span>
                  <span className="font-mono tabular-nums">−{s.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-line pt-2.5">
        <span className="text-sm font-semibold">Spendable balance</span>
        <span className="font-mono text-base font-bold tabular-nums text-amber-500">
          {breakdown.balance.toLocaleString()}
        </span>
      </div>
    </Card>
  );
}
