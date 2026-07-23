"use client";

import type { TitleInfo } from "@/lib/titles";
import { RANK_STYLE } from "@/lib/ranks";
import { SoundManager } from "@/lib/sound/SoundManager";

export function TitleDisplay({
  title,
  size = "md",
  className = "",
  onClick,
}: {
  title: TitleInfo;
  size?: "sm" | "md" | "lg";
  className?: string;
  // When provided, the whole title becomes a button (e.g. to open the full
  // titles list on the profile). Omit to render as static text.
  onClick?: () => void;
}) {
  const rank = RANK_STYLE[title.current.rank];
  const text =
    size === "lg"
      ? "text-2xl sm:text-3xl"
      : size === "sm"
        ? "text-base"
        : "text-xl";

  const inner = (
    <>
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
    </>
  );

  const base = `flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          SoundManager.instance.play("button:click");
          onClick();
        }}
        aria-label="View all titles"
        className={`${base} rounded-lg text-left transition-transform hover:scale-[1.02] active:scale-95`}
      >
        {inner}
      </button>
    );
  }

  return <div className={base}>{inner}</div>;
}
