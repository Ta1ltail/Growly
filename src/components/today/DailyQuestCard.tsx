"use client";

// Daily quest card — shows a randomized mini-challenge that resets each day.
// Tracks progress automatically when habits are marked done. User claims the
// reward once the target is reached.

import { useContext, useEffect } from "react";
import { Target, Coins, CheckCircle2, RotateCcw } from "lucide-react";
import { useAppDataSelector, refreshDailyQuest, claimDailyQuest } from "@/lib/store";
import { SyncContext } from "@/components/sync/SyncProvider";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

export function DailyQuestCard() {
  const quest = useAppDataSelector((d) => d.economy.currentQuest);
  const { syncReady, timedOut } = useContext(SyncContext);

  // Generate the daily quest once the data layer is ready. When sync completes
  // (syncReady), the store has authoritative data from the server to generate
  // the quest from. When the sync timeout fires (timedOut), the app has fallen
  // back to local data and the quest should be generated from that instead.
  // Guarding on these flags ensures the quest is never generated from empty or
  // stale data during the initial sync window.
  useEffect(() => {
    if (syncReady || timedOut) {
      refreshDailyQuest();
    }
  }, [syncReady, timedOut]);

  if (!quest) return null;

  const claimed = quest.claimed === true;
  const completed = quest.current >= quest.target;
  const progressPct = Math.min(
    100,
    Math.round((quest.current / quest.target) * 100),
  );

  return (
    <Card
      className={`shrink-0 overflow-hidden transition-all ${completed && !claimed ? "ring-1 ring-emerald-500/40" : ""}`}
    >
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Target className="size-3.5 text-accent" aria-hidden />
            Daily Quest
          </h3>
          {quest.category && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              {quest.category}
            </span>
          )}
        </div>

        <p className="text-sm font-medium">{quest.description}</p>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>
              Progress:{" "}
              <span className="font-mono font-semibold">{quest.current}</span>
              <span className="text-faint">/{quest.target}</span>
            </span>
            <span className="flex items-center gap-1 font-medium text-amber-500">
              <Coins className="size-3" aria-hidden />+{quest.reward}
            </span>
          </div>
          <ProgressBar
            value={progressPct}
            color={completed ? "#10b981" : undefined}
          />
        </div>

        {completed && !claimed && (
          <Button
            onClick={() => claimDailyQuest()}
            className="mt-3 w-full"
            size="sm"
            sound="reward:quest"
          >
            <Coins className="size-3.5" aria-hidden />
            Claim {quest.reward} coins
          </Button>
        )}

        {claimed && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 animate-fade-in">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-500">
              <CheckCircle2 className="size-4" aria-hidden />
              Claimed +{quest.reward}
              <Coins className="size-3.5" aria-hidden />
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <RotateCcw className="size-3" aria-hidden />
              Resets at midnight
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
