"use client";

// Profile — a character progression page (spec §9). Banner + rank-bordered
// avatar, animated title/rank, level + XP, a stat strip (badges, achievements,
// current & longest streak), the Next Milestone widget, a showcase of the
// user's proudest things, and a badge gallery. Everything except the editable
// identity is DERIVED from history via summarizeProgress (Honest Tracking).

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Pencil,
  Flame,
  Trophy,
  Medal,
  Award,
  Target,
  LayoutTemplate,
  NotebookPen,
  Settings2,
  ChevronRight,
  Repeat,
  Coins,
} from "lucide-react";
import { useAppData } from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { useHydrated } from "@/hooks/useHydrated";
import { summarizeProgress } from "@/lib/progress";
import { RARITY_ORDER, RARITY_LABEL } from "@/lib/achievements";
import { RARITY_STYLE } from "@/lib/rarity";
import { RANK_STYLE } from "@/lib/ranks";
import { resolveBanner } from "@/lib/cosmetics";
import type { AchievementDef } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { AchievementBadge } from "@/components/AchievementBadge";
import { RankAvatar } from "@/components/progression/RankAvatar";
import { TitleDisplay } from "@/components/progression/TitleDisplay";
import { TitlesModal } from "@/components/progression/TitlesModal";
import { XpBar } from "@/components/progression/XpBar";
import { NextMilestoneWidget } from "@/components/progression/NextMilestoneWidget";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const data = useAppData();
  const today = useToday();
  const hydrated = useHydrated();
  const [editing, setEditing] = useState(false);
  const [showTitles, setShowTitles] = useState(false);

  const summary = useMemo(() => summarizeProgress(data, today), [data, today]);

  const unlockedDefs = useMemo<AchievementDef[]>(
    () =>
      summary.achievements
        .filter((a) => a.unlocked)
        .map((a) => a.def)
        .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]),
    [summary.achievements],
  );

  // Most-completed habit: count "done" marks per habit across all history.
  const mostCompleted = useMemo(() => {
    const counts = new Map<string, number>();
    for (const day of Object.values(data.marks)) {
      for (const [habitId, status] of Object.entries(day)) {
        if (status === "done") counts.set(habitId, (counts.get(habitId) ?? 0) + 1);
      }
    }
    let bestId: string | null = null;
    let bestCount = 0;
    for (const [id, n] of counts) {
      if (n > bestCount) {
        bestCount = n;
        bestId = id;
      }
    }
    const habit = bestId ? data.habits.find((h) => h.id === bestId) : undefined;
    return habit ? { name: habit.name, count: bestCount } : null;
  }, [data]);

  if (!hydrated) return <PageSkeleton />;

  const { profile } = data;
  const { stats, level, title, unlockedCount, totalCount, coinBalance } = summary;
  const rank = RANK_STYLE[title.current.rank];
  const banner = resolveBanner(profile.banner);

  const showcaseBadge = profile.showcaseBadgeId
    ? unlockedDefs.find((d) => d.id === profile.showcaseBadgeId) ?? null
    : null;
  const bestAchievement = unlockedDefs[0] ?? null; // sorted highest-rarity first

  return (
    <div className="animate-fade-in">
      {/* ---- Hero / banner ---- */}
      <Card className="mb-6 overflow-hidden p-0">
        <div className="relative h-28 sm:h-36" style={{ background: banner }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <Button
            variant="soft"
            size="sm"
            onClick={() => setEditing(true)}
            className="absolute right-3 top-3 bg-black/30 text-white backdrop-blur-sm hover:bg-black/45"
          >
            <Pencil className="size-3.5" /> Edit
          </Button>
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-12 flex items-end gap-4">
            <RankAvatar rank={title.current.rank} avatar={profile.avatar} size={88} />
            <div className="mb-1 flex items-center gap-2 font-mono text-sm font-bold">
              <span className="grid size-7 place-items-center rounded-lg bg-accent/15 text-accent">
                {level.level}
              </span>
              <span className="text-muted">LVL</span>
            </div>
          </div>

          <div className="mt-3">
            <h1 className="text-2xl font-bold tracking-tight">{profile.displayName}</h1>
            <p className="text-sm text-muted">@{profile.username}</p>
            <TitleDisplay title={title} size="md" className="mt-2.5" onClick={() => setShowTitles(true)} />
            {profile.motto && (
              <p className="mt-2 text-sm italic text-muted">“{profile.motto}”</p>
            )}
            {profile.bio && <p className="mt-2 max-w-prose text-sm text-ink/90">{profile.bio}</p>}
          </div>
        </div>
      </Card>

      {/* ---- XP + stats ---- */}
      <Card className="mb-6 p-5">
        <XpBar level={level} nextUnlock={title.next?.name} />
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 stagger-children sm:grid-cols-5">
        <StatCard icon={Medal} value={`${unlockedCount}/${totalCount}`} label="Badges" accent />
        <StatCard icon={Trophy} value={unlockedCount} label="Achievements" />
        <StatCard icon={Flame} value={stats.maxCurrentStreak} label="Current streak" />
        <StatCard icon={Award} value={stats.maxBestStreak} label="Longest streak" />
        <Link href="/shop" aria-label="Open shop" className="transition-transform hover:scale-[1.03]">
          <StatCard icon={Coins} value={coinBalance} label="Coins" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- Next milestones ---- */}
        <Card className="p-5">
          <NextMilestoneWidget milestones={summary.nextMilestones} />
        </Card>

        {/* ---- Showcase ---- */}
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Showcase</h2>
          <div className="flex flex-col gap-3">
            <ShowcaseRow label="Favorite badge">
              {showcaseBadge ? (
                <BadgeChip def={showcaseBadge} />
              ) : (
                <span className="text-xs text-faint">Pick one in Edit</span>
              )}
            </ShowcaseRow>
            <ShowcaseRow label="Best achievement">
              {bestAchievement ? (
                <BadgeChip def={bestAchievement} />
              ) : (
                <span className="text-xs text-faint">None yet</span>
              )}
            </ShowcaseRow>
            <ShowcaseRow label="Current title">
              <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: rank.accent }}>
                <span aria-hidden>{rank.icon}</span> {title.current.name}
              </span>
            </ShowcaseRow>
            <ShowcaseRow label="Longest streak">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Flame className="size-4 text-orange-500" /> {stats.maxBestStreak} days
              </span>
            </ShowcaseRow>
            <ShowcaseRow label="Most completed">
              {mostCompleted ? (
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Repeat className="size-4 text-accent" /> {mostCompleted.name}
                  <span className="font-mono text-xs text-faint">×{mostCompleted.count}</span>
                </span>
              ) : (
                <span className="text-xs text-faint">None yet</span>
              )}
            </ShowcaseRow>
          </div>
        </Card>
      </div>

      {/* ---- Badge gallery ---- */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Badge collection</h2>
          <Link href="/achievements" className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
            View all <ChevronRight className="size-3.5" />
          </Link>
        </div>
        {unlockedDefs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted">
            No badges yet — complete habits to start earning them.
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex flex-wrap gap-3">
              {unlockedDefs.map((def) => (
                <div key={def.id} title={`${def.name} · ${RARITY_LABEL[def.rarity]}`}>
                  <AchievementBadge def={def} size={56} shine={def.rarity === "legendary"} />
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* ---- Jump to ---- */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Jump to</h2>
        <Card className="divide-y divide-line overflow-hidden">
          <LinkRow href="/achievements" icon={Trophy} label="Achievements" trailing={`${unlockedCount}/${totalCount}`} />
          <LinkRow href="/goals" icon={Target} label="Goals" trailing={`${data.goals.length}`} />
          <LinkRow href="/templates" icon={LayoutTemplate} label="Templates" />
          <LinkRow href="/notes" icon={NotebookPen} label="Notes" trailing={`${data.notes.length}`} />
          <LinkRow href="/settings" icon={Settings2} label="Settings" />
        </Card>
      </section>

      <p className="mt-8 text-center font-mono text-[10px] text-faint">
        project_101 · v0.5 · data stored locally on this device
      </p>

      <ProfileEditModal
        open={editing}
        onClose={() => setEditing(false)}
        profile={profile}
        unlockedDefs={unlockedDefs}
      />

      <TitlesModal
        open={showTitles}
        onClose={() => setShowTitles(false)}
        level={level.level}
        currentTitleName={title.current.name}
      />
    </div>
  );
}

function ShowcaseRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </div>
  );
}

function BadgeChip({ def }: { def: AchievementDef }) {
  const r = RARITY_STYLE[def.rarity];
  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${r.accent}1f`, color: r.accent }}
    >
      <span aria-hidden>{def.icon}</span> {def.name}
    </span>
  );
}

function LinkRow({
  href,
  icon: Icon,
  label,
  trailing,
}: {
  href: string;
  icon: typeof Target;
  label: string;
  trailing?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-surface2/50">
      <Icon className="size-[18px] text-muted" />
      <span className="flex-1">{label}</span>
      {trailing && <span className="font-mono text-xs text-muted">{trailing}</span>}
      <ChevronRight className="size-4 text-faint" />
    </Link>
  );
}
