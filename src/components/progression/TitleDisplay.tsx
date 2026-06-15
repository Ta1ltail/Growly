"use client";

// Animated title + rank chip (spec §7/§9). The title text is gradient-filled
// in the rank color; Legendary ranks get a sweeping sheen (animate-text-sheen)
// so top-tier users read as prestigious. Reduced-motion neutralizes the sweep.

import type { TitleInfo } from "@/lib/titles";
import { RANK_STYLE } from "@/lib/ranks";

export function TitleDisplay({
  title,
  size = "md",
  className = "",
}: {
  title: TitleInfo;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const rank = RANK_STYLE[title.current.rank];
  const text =
    size === "lg" ? "text-2xl sm:text-3xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`}>
      <span className="text-xl leading-none" aria-hidden>
        {rank.icon}
      </span>
      <span
        className={`bg-clip-text font-extrabold tracking-tight text-transparent ${text} ${
          rank.animated ? "animate-text-sheen" : ""
        }`}
        style={{
          backgroundImage: rank.gradient,
          backgroundSize: rank.animated ? "200% auto" : undefined,
        }}
      >
        {title.current.name}
      </span>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
        style={{ background: `${rank.accent}22`, color: rank.accent }}
      >
        {title.current.rank}
      </span>
    </div>
  );
}
