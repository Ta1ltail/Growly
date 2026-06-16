// Compact coin-balance pill. Reused on the shop header, profile, and dashboard.
// The coin glyph is decorative; the number carries the meaning for screen
// readers via aria-label.

import { Coins } from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";

export function CoinChip({
  amount,
  size = "md",
  animate = false,
  className = "",
}: {
  amount: number;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
}) {
  const pad = size === "lg" ? "px-3.5 py-2 text-base" : size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  const icon = size === "lg" ? "size-5" : size === "sm" ? "size-3.5" : "size-4";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 font-semibold text-amber-500 ${pad} ${className}`}
      aria-label={`${amount} coins`}
    >
      <Coins className={icon} aria-hidden />
      <span className="font-mono tabular-nums">
        {animate ? <AnimatedCounter value={amount} /> : amount.toLocaleString()}
      </span>
    </span>
  );
}
