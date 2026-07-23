"use client";

// Dashboard — the at-a-glance command center: today's progress, momentum
// stats, and smart insights. Links into the deeper screens.
// All cards use fixed sizes to prevent layout shifting.

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  Flame,
  TrendingUp,
  Activity,
  ArrowRight,
  ListChecks,
  Sparkles,
  ChevronRight,
  CalendarRange,
  Bell,
  MessageSquare,
} from "lucide-react";
import { SoundManager } from "@/lib/sound/SoundManager";
import { useAppData } from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { useHydrated } from "@/hooks/useHydrated";
import { dateKey } from "@/lib/date";
import {
  consistencyScore,
  dayCompletion,
  habitStreaks,
  isScheduled,
  lastNDaysCompletion,
} from "@/lib/stats";
import { frozenSet } from "@/lib/economy";
import { buildInsights } from "@/lib/insights";
import { summarizeProgress } from "@/lib/progress";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { RARITY_STYLE } from "@/lib/rarity";
import type { AchievementDef } from "@/lib/types";
import { useNotifications } from "@/hooks/useNotifications";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { TONE } from "@/lib/util";
import { StreakFlame } from "@/components/habits/StreakFlame";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { XpBar } from "@/components/progression/XpBar";
import { TitleDisplay } from "@/components/progression/TitleDisplay";
import { NextMilestoneWidget } from "@/components/progression/NextMilestoneWidget";
import { CoinChip } from "@/components/economy/CoinChip";
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/StaggerContainer";
import { AppPageShell } from "@/components/layout/AppPageShell";

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

const WIDGET_ORDER = [
  "current-streak",
  "recent-achievements",
  "badge-collection",
  "xp-level",
  "next-milestone",
  "weekly-trend",
] as const;

type WidgetId = (typeof WIDGET_ORDER)[number];

export default function DashboardPage() {
  const data = useAppData();
  const today = useToday();
  const hydrated = useHydrated();
  const todayKey = dateKey(today);
  const active = useMemo(
    () => data.habits.filter((h) => !h.archived && !h.deletedAt),
    [data.habits],
  );

  const todaysHabits = useMemo(
    () => active.filter((h) => isScheduled(h, today)),
    [active, today],
  );
  const doneToday = todaysHabits.filter(
    (h) => data.marks[todayKey]?.[h.id] === "done",
  ).length;
  const progress = dayCompletion(active, data.marks, today);

  const consistency = useMemo(
    () => consistencyScore(active, data.marks, today, 14),
    [active, data.marks, today],
  );
  const frozen = useMemo(() => frozenSet(data.economy), [data.economy]);
  const streaks = useMemo(() => {
    let best = 0,
      current = 0;
    for (const h of active) {
      const s = habitStreaks(h, data.marks, today, frozen);
      best = Math.max(best, s.best);
      current = Math.max(current, s.current);
    }
    return { best, current };
  }, [active, data.marks, today, frozen]);
  const insights = useMemo(
    () => buildInsights(active, data.marks, today),
    [active, data.marks, today],
  );

  const { notifications: recentNotifications } = useNotifications();
  const recentActivity = useMemo(
    () => recentNotifications.slice(0, 5),
    [recentNotifications],
  );

  // Progress widgets data
  const summary = useMemo(() => summarizeProgress(data, today), [data, today]);
  const recentAll = useMemo<AchievementDef[]>(() => {
    return Object.entries(data.unlocks)
      .sort((a, b) => (a[1].at < b[1].at ? 1 : -1))
      .map(([id]) => BY_ID.get(id))
      .filter((d): d is AchievementDef => Boolean(d));
  }, [data.unlocks]);
  // Cap the row but keep enough to fill the box on wide screens; the grid
  // auto-fits as many badges as the width allows and shows a "+N" remainder.
  const RECENT_MAX = 12;
  const recent = recentAll.slice(0, RECENT_MAX);
  const recentExtra = recentAll.length - recent.length;

  // Weekly trend data
  const weekData = useMemo(
    () => lastNDaysCompletion(active, data.marks, today, 7),
    [active, data.marks, today],
  );
  const weekAvg = weekData.length
    ? Math.round(weekData.reduce((s, d) => s + d.rate, 0) / weekData.length)
    : 0;

  const { level, title, unlockedCount, totalCount } = summary;
  const badgePct = totalCount
    ? Math.round((unlockedCount / totalCount) * 100)
    : 0;

  const widgetContent = useMemo(
    (): Record<WidgetId, { content: ReactNode; span?: string }> => ({
      "xp-level": {
        content: (
          <Card className="p-5 min-h-40 lg:h-[180px] flex flex-col">
            <TitleDisplay title={title} size="sm" className="mb-3 shrink-0" />
            <div className="flex-1 min-h-0">
              <XpBar level={level} nextUnlock={title.next?.name} />
            </div>
          </Card>
        ),
      },
      "badge-collection": {
        content: (
          <Card className="p-4 min-h-[130px] lg:h-[140px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
                <Sparkles className="size-4 icon-accent" /> Badges
              </h3>
              <span className="font-mono text-sm font-bold">
                {unlockedCount}/{totalCount}
              </span>
            </div>
            <ProgressBar value={badgePct} className="my-2" />
            <div className="flex flex-wrap gap-1.5">
              {(["legendary", "epic", "rare", "common"] as const).map(
                (rarity) => {
                  const n = summary.achievements.filter(
                    (a) => a.unlocked && a.def.rarity === rarity,
                  ).length;
                  if (n === 0) return null;
                  const r = RARITY_STYLE[rarity];
                  return (
                    <span
                      key={rarity}
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{ background: `${r.accent}1f`, color: r.accent }}
                    >
                      {r.medal} {n}
                    </span>
                  );
                },
              )}
            </div>
          </Card>
        ),
      },
      "current-streak": {
        content: (
          <Card className="flex items-center gap-4 p-4 min-h-[120px] lg:h-[140px]">
            {summary.stats.maxCurrentStreak > 0 ? (
              <StreakFlame
                streak={summary.stats.maxCurrentStreak}
                size={48}
                showCount={false}
              />
            ) : (
              <Flame className="size-10 text-faint" />
            )}
            <div>
              <div className="font-mono text-2xl font-bold tracking-tight">
                {summary.stats.maxCurrentStreak}
              </div>
              <div className="text-xs text-muted mt-0.5">
                day current streak
              </div>
            </div>
          </Card>
        ),
      },
      "recent-achievements": {
        content: (
          <Card className="p-4 min-h-[130px] lg:h-[140px] flex flex-col">
            <div className="flex items-center justify-between shrink-0 mb-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
                <Activity className="size-4 icon-accent" /> Recent
              </h3>
              <Link
                href="/achievements"
                onClick={() => SoundManager.instance.play("button:nav")}
                className="text-[10px] font-semibold text-accent hover:underline shrink-0"
              >
                All
              </Link>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {recent.length === 0 ? (
                <p className="text-[10px] text-faint truncate">
                  Complete habits to unlock achievements.
                </p>
              ) : (
                <div className="flex flex-wrap content-start gap-1.5">
                  {recent.map((def) => (
                    <div key={def.id} title={`${def.name} · ${def.rarity}`}>
                      <AchievementBadge
                        def={def}
                        size={32}
                        shine={def.rarity === "legendary"}
                      />
                    </div>
                  ))}
                  {recentExtra > 0 && (
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface2 text-[11px] font-bold text-muted">
                      +{recentExtra}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Card>
        ),
      },
      "next-milestone": {
        content: (
          <Card className="p-5 min-h-40 lg:h-[180px] overflow-y-auto">
            <NextMilestoneWidget
              milestones={summary.nextMilestones.slice(0, 2)}
            />
          </Card>
        ),
      },
      "weekly-trend": {
        content: (
          <Card className="p-5 min-h-40 lg:h-[180px] flex flex-col">
            <div className="mb-2 flex items-center justify-between shrink-0">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
                <CalendarRange className="size-4 icon-accent" /> Weekly
              </h3>
              <span className="font-mono text-sm font-bold">{weekAvg}%</span>
            </div>
            <div className="flex-1 min-h-0 flex items-end justify-between gap-1.5">
              {weekData.map(({ date, rate }) => (
                <div
                  key={date.toISOString()}
                  className="flex flex-1 flex-col items-center gap-1 justify-end h-full"
                >
                  <div
                    className="flex-1 w-full flex items-end justify-center"
                    style={{ maxHeight: "85%" }}
                  >
                    <div
                      className="w-full max-w-6 rounded-t-md transition-[height] duration-500"
                      style={{
                        height: `${Math.max(rate, 6)}%`,
                        background:
                          rate >= 100 ? "var(--color-done)" : "var(--c-accent)",
                        opacity: rate === 0 ? 0.3 : 1,
                      }}
                      title={`${rate}%`}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-faint shrink-0">
                    {date.toLocaleDateString(undefined, { weekday: "narrow" })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ),
      },
    }),
    [
      summary,
      recent,
      recentExtra,
      weekData,
      weekAvg,
      badgePct,
      unlockedCount,
      totalCount,
      level,
      title,
    ],
  );

  if (!hydrated) return <PageSkeleton />;

  return (
    <AppPageShell>
      <PageHeader
        title="Dashboard"
        subtitle="Your habits at a glance"
        action={
          <Link
            href="/today"
            className="hidden items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 sm:flex"
          >
            Open Today <ArrowRight className="size-4" />
          </Link>
        }
      />

      {/* Today summary + stat tiles — redesigned card with no wasted space */}
      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        <Card className="flex flex-col p-5">
          <div className="flex items-center gap-4 shrink-0">
            <ProgressRing value={progress} size={64}>
              <span className="font-mono text-sm font-bold">{progress}%</span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Today
              </p>
              <p className="text-sm text-muted">
                {today.toLocaleDateString(undefined, { weekday: "long" })}
              </p>
              {/* Time left in the day */}
              <p className="mt-0.5 text-[11px] font-medium text-accent">
                {today.getHours() < 12
                  ? "☀️ Morning"
                  : today.getHours() < 17
                    ? "🌤️ Afternoon"
                    : "🌙 Evening"}
                {" · "}
                {24 - today.getHours() - 1}h left today
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-done/10 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-done">
                Done
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-done">
                {doneToday}
              </p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                Remaining
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-amber-500">
                {todaysHabits.length - doneToday}
              </p>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted">
              {todaysHabits.length - doneToday > 0
                ? `${todaysHabits.length - doneToday} habit${todaysHabits.length - doneToday !== 1 ? "s" : ""} remaining`
                : "🎉 All done!"}
            </span>
            <Link
              href="/today"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Open Today <ArrowRight className="size-3" />
            </Link>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <StatCard
            icon={Activity}
            value={`${consistency}%`}
            label="14-day consistency"
            accent
          />
          <StatCard
            icon={Flame}
            value={streaks.current}
            label="Current streak"
          />
          <StatCard
            icon={TrendingUp}
            value={streaks.best}
            label="Best streak"
          />
          <StatCard
            icon={ListChecks}
            value={active.length}
            label="Active habits"
          />
        </div>
      </div>

      {/* Your Progress section */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Your Progress
          </h2>
          <div className="flex items-center gap-3">
            <Link
              href="/shop"
              aria-label="Open shop"
              className="transition-transform hover:scale-105"
            >
              <CoinChip amount={summary.coinBalance} />
            </Link>
            <Link
              href="/profile"
              onClick={() => SoundManager.instance.play("button:nav")}
              className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            >
              Character page <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WIDGET_ORDER.map((id) => (
            <div key={id}>{widgetContent[id].content}</div>
          ))}
        </div>
      </section>

      {/* Recent Activity section — replaces stats/calendar on dashboard */}
      {recentActivity.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              <Bell className="size-4 icon-accent" /> Recent Activity
            </h2>
            <Link
              href="/notifications"
              onClick={() => SoundManager.instance.play("button:nav")}
              className="text-xs font-semibold text-accent hover:underline"
            >
              View all
            </Link>
          </div>
          <Card className="divide-y divide-line overflow-hidden">
            {recentActivity.map((n) => (
              <Link
                key={n.id}
                href={n.link}
                className="flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface2/50"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <MessageSquare className="size-4 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {n.body}
                    </p>
                  )}
                </div>
                {!n.is_read && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                )}
              </Link>
            ))}
          </Card>
        </section>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Sparkles className="size-4 icon-accent" /> Insights
          </h2>
          <StaggerContainer className="grid gap-3 sm:grid-cols-2">
            {insights.map((ins, i) => (
              <StaggerItem key={i}>
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${TONE[ins.tone]}`}
                >
                  {ins.text}
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      )}
    </AppPageShell>
  );
}
