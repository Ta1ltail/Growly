"use client";

// XP & level bar (spec §8 "Level System" display: current level, XP bar, XP
// needed, next unlock). Fully presentational — fed a history-derived LevelInfo.
// The numbers animate via AnimatedCounter; the fill eases via ProgressBar.

import { Sparkles } from "lucide-react";
import type { LevelInfo } from "@/lib/xp";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

export function XpBar({
  level,
  nextUnlock,
  className = "",
}: {
  level: LevelInfo;
  nextUnlock?: string; // e.g. "Discipline Warrior" — the next title/rank
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-accent/15 font-mono text-sm font-bold text-accent">
            {level.level}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Level
          </span>
        </div>
        <span className="font-mono text-xs text-faint">
          {level.isMax ? (
            "MAX"
          ) : (
            <>
              <AnimatedCounter value={level.xpIntoLevel} /> /{" "}
              {level.xpForNext.toLocaleString()} XP
            </>
          )}
        </span>
      </div>
      <ProgressBar value={level.progressPct} />
      <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-muted">
        <span className="font-mono">
          {level.totalXp.toLocaleString()} XP total
        </span>
        {!level.isMax && (
          <span className="flex items-center gap-1">
            <Sparkles className="size-3 text-accent" />
            {level.xpToNext.toLocaleString()} XP to Lv {level.level + 1}
            {nextUnlock ? ` · ${nextUnlock}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
