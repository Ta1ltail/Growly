// Shared RewardChips component used by both CelebrationCenter and
// CelebrationManager to render reward text with coin glyphs as SVG icons.

import { Coins } from "lucide-react";

export function RewardChips({
  reward,
  accent,
  size = "sm",
}: {
  reward: string;
  accent: string;
  size?: "sm" | "md";
}) {
  const sizeStyles = size === "sm"
    ? "px-2 py-0.5 text-[10px]"
    : "px-3 py-1 text-sm font-bold";
  const iconSize = size === "sm" ? "size-3" : "size-3.5";
  const bgOpacity = size === "sm" ? "15" : "1f";

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {reward
        .split("·")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part, i) => {
          const isCoin = part.includes("🪙");
          const text = part.replace("🪙", "").trim();
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 rounded-full font-bold ${sizeStyles}`}
              style={{
                background: `${accent}${bgOpacity}`,
                color: accent,
              }}
            >
              {text}
              {isCoin && <Coins className={iconSize} aria-hidden />}
            </span>
          );
        })}
    </div>
  );
}
