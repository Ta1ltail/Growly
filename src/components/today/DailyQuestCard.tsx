"use client";

// Daily quest card — shows a randomized mini-challenge that resets each day.
// Tracks progress automatically when habits are marked done. User claims the
// reward once the target is reached.

import { useEffect, useState } from "react";
import { Target, Coins, CheckCircle2 } from "lucide-react";
import { useAppData, refreshDailyQuest, claimDailyQuest } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

export function DailyQuestCard() {
  const data = useAppData();
  const quest = data.economy.currentQuest;
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Refresh quest if needed on mount
  useEffect(() => {
    refreshDailyQuest();
  }, []);

  if (!quest) return null;

  const completed = quest.current >= quest.target;
  const progressPct = Math.min(100, Math.round((quest.current / quest.target) * 100));

  function handleClaim() {
    if (claiming) return;
    setClaiming(true);
    claimDailyQuest();
    setClaimed(true);
    // Reset after animation
    setTimeout(() => setClaimed(false), 2000);
  }

  return (
    <Card className={`overflow-hidden transition-all ${completed && !claimed ? "ring-1 ring-emerald-500/40" : ""}`}>
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
              Progress: <span className="font-mono font-semibold">{quest.current}</span>
              <span className="text-faint">/{quest.target}</span>
            </span>
            <span className="flex items-center gap-1 font-medium text-amber-500">
              <Coins className="size-3" aria-hidden />+{quest.reward}
            </span>
          </div>
          <ProgressBar value={progressPct} color={completed ? "#10b981" : undefined} />
        </div>

        {completed && !claimed && (
          <Button onClick={handleClaim} className="mt-3 w-full" size="sm">
            <Coins className="size-3.5" aria-hidden />
            Claim {quest.reward} coins
          </Button>
        )}

        {claimed && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-500 animate-fade-in">
            <CheckCircle2 className="size-4" aria-hidden />
            Claimed! +{quest.reward} 🪙
          </div>
        )}
      </div>
    </Card>
  );
}
