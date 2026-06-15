// Next Milestone widget (spec §9 — "a primary motivational component").
// Renders the history-derived `nextMilestones` from summarizeProgress: the
// next level, the next title/rank, and the nearest achievement, each with an
// eased progress bar and a remaining count. Pure presentational.

import { Target } from "lucide-react";
import type { Milestone } from "@/lib/progress";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function NextMilestoneWidget({
  milestones,
  className = "",
}: {
  milestones: Milestone[];
  className?: string;
}) {
  if (milestones.length === 0) return null;

  return (
    <div className={className}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <Target className="size-4 text-accent" /> Next milestones
      </h2>
      <div className="flex flex-col gap-3.5">
        {milestones.map((m) => {
          const remaining = Math.max(0, m.target - m.current);
          const pct = m.target > 0 ? Math.min(100, Math.round((m.current / m.target) * 100)) : 0;
          return (
            <div key={m.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{m.label}</span>
                <span className="font-mono text-xs text-faint">{remaining.toLocaleString()} to go</span>
              </div>
              <ProgressBar value={pct} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
