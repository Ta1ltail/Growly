"use client";

// Dashboard widgets (spec §10) — an at-a-glance progress strip for Today:
// XP progress, current streak, next milestone, recent achievements, this
// week's completion, and badge-collection progress. Everything is derived
// from history via summarizeProgress; widgets reuse the Part 5 progression
// pieces so the dashboard and profile stay visually consistent.
//
// Widgets are drag-and-drop reorderable. The order is persisted in settings.

import { useMemo, useCallback } from "react";
import Link from "next/link";
import { Flame, Trophy, ChevronRight, CalendarRange, Medal } from "lucide-react";
import { useAppData, setWidgetOrder } from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { summarizeProgress } from "@/lib/progress";
import { lastNDaysCompletion } from "@/lib/stats";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { RARITY_STYLE } from "@/lib/rarity";
import type { AchievementDef } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StreakFlame } from "@/components/habits/StreakFlame";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { XpBar } from "@/components/progression/XpBar";
import { TitleDisplay } from "@/components/progression/TitleDisplay";
import { NextMilestoneWidget } from "@/components/progression/NextMilestoneWidget";
import { CoinChip } from "@/components/economy/CoinChip";
import { ReorderableGrid, type ReorderableItem } from "@/components/ui/ReorderableGrid";

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

// Widget identifiers for reordering
const WIDGET_IDS = [
  "xp-level",
  "current-streak",
  "next-milestone",
  "this-week",
  "badge-collection",
  "recent-achievements",
] as const;

type WidgetId = (typeof WIDGET_IDS)[number];

export function DashboardWidgets() {
  const data = useAppData();
  const today = useToday();

  const summary = useMemo(() => summarizeProgress(data, today), [data, today]);
  const active = useMemo(() => data.habits.filter((h) => !h.archived), [data.habits]);
  const week = useMemo(() => lastNDaysCompletion(active, data.marks, today, 7), [active, data.marks, today]);

  // Most recently unlocked achievements (newest first).
  const recent = useMemo<AchievementDef[]>(() => {
    return Object.entries(data.unlocks)
      .sort((a, b) => (a[1].at < b[1].at ? 1 : -1))
      .map(([id]) => BY_ID.get(id))
      .filter((d): d is AchievementDef => Boolean(d))
      .slice(0, 5);
  }, [data.unlocks]);

  const weekAvg = week.length ? Math.round(week.reduce((s, d) => s + d.rate, 0) / week.length) : 0;
  const { level, title, unlockedCount, totalCount } = summary;
  const badgePct = totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Widget content by id
  const widgetContent: Record<WidgetId, { content: React.ReactNode; span?: string }> = {
    "xp-level": {
      span: "lg:col-span-2",
      content: (
        <Card className="p-5">
          <TitleDisplay title={title} size="sm" className="mb-4" />
          <XpBar level={level} nextUnlock={title.next?.name} />
        </Card>
      ),
    },
    "current-streak": {
      content: (
        <Card className="flex items-center gap-4 p-5">
          {summary.stats.maxCurrentStreak > 0 ? (
            <StreakFlame streak={summary.stats.maxCurrentStreak} size={40} showCount={false} />
          ) : (
            <Flame className="size-9 text-faint" />
          )}
          <div>
            <div className="font-mono text-3xl font-bold tracking-tight">{summary.stats.maxCurrentStreak}</div>
            <div className="text-xs text-muted">day current streak</div>
          </div>
        </Card>
      ),
    },
    "next-milestone": {
      content: (
        <Card className="p-5">
          <NextMilestoneWidget milestones={summary.nextMilestones.slice(0, 2)} />
        </Card>
      ),
    },
    "this-week": {
      content: (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              <CalendarRange className="size-4 text-accent" /> This week
            </h3>
            <span className="font-mono text-sm font-bold">{weekAvg}%</span>
          </div>
          <div className="flex items-end justify-between gap-1.5">
            {week.map(({ date, rate }) => (
              <div key={date.toISOString()} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-16 w-full items-end justify-center">
                  <div
                    className="w-full max-w-6 rounded-t-md transition-[height] duration-500"
                    style={{
                      height: `${Math.max(rate, 4)}%`,
                      background: rate >= 100 ? "var(--color-done)" : "var(--c-accent)",
                      opacity: rate === 0 ? 0.25 : 1,
                    }}
                    title={`${rate}%`}
                  />
                </div>
                <span className="font-mono text-[10px] text-faint">
                  {date.toLocaleDateString(undefined, { weekday: "narrow" })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
    "badge-collection": {
      content: (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              <Medal className="size-4 text-accent" /> Badges
            </h3>
            <span className="font-mono text-sm font-bold">
              {unlockedCount}/{totalCount}
            </span>
          </div>
          <ProgressBar value={badgePct} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["legendary", "epic", "rare", "common"] as const).map((rarity) => {
              const n = summary.achievements.filter((a) => a.unlocked && a.def.rarity === rarity).length;
              if (n === 0) return null;
              const r = RARITY_STYLE[rarity];
              return (
                <span
                  key={rarity}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: `${r.accent}1f`, color: r.accent }}
                >
                  {r.medal} {n}
                </span>
              );
            })}
          </div>
        </Card>
      ),
    },
    "recent-achievements": {
      content: (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              <Trophy className="size-4 text-accent" /> Recent
            </h3>
            <Link href="/achievements" className="text-xs font-semibold text-accent hover:underline">
              All
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-xs text-faint">Complete habits to start unlocking achievements.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recent.map((def) => (
                <div key={def.id} title={`${def.name} · ${RARITY_STYLE[def.rarity].label}`}>
                  <AchievementBadge def={def} size={44} shine={def.rarity === "legendary"} />
                </div>
              ))}
            </div>
          )}
        </Card>
      ),
    },
  };

  // Compute the ordered list of widget IDs (from settings or default)
  const widgetOrder: string[] = data.settings.widgetOrder ?? [...WIDGET_IDS];
  const orderedIds: string[] = [...WIDGET_IDS].sort((a: string, b: string) => {
    const ai = widgetOrder.indexOf(a);
    const bi = widgetOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const handleReorder = useCallback((ids: string[]) => {
    setWidgetOrder(ids);
  }, []);

  const reorderableItems: ReorderableItem[] = orderedIds.map((id: string) => {
    const w = widgetContent[id as WidgetId];
    if (!w) return { id, content: null };
    return {
      id,
      content: (
        <div className={w.span ?? ""}>
          {w.content}
        </div>
      ),
    };
  });

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your progress</h2>
        <div className="flex items-center gap-3">
          <Link href="/shop" aria-label="Open shop" className="transition-transform hover:scale-105">
            <CoinChip amount={summary.coinBalance} />
          </Link>
          <Link href="/profile" className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
            Character page <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <ReorderableGrid
        items={reorderableItems}
        onReorder={handleReorder}
        className="grid gap-4 lg:grid-cols-3"
      />
    </section>
  );
}
