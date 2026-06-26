"use client";

// Leaderboard — ranks users by various stats: level, streak, consistency, and
// total completions. Each tab queries the user_stats_snapshots table and
// shows a top-N ranking with the current user highlighted.

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  Flame,
  Activity,
  Medal,
  Loader2,
  UserRound,
  Crown,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Segmented } from "@/components/ui/Segmented";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { cn } from "@/lib/util";

interface LeaderEntry {
  user_id: string;
  display_name: string;
  username: string;
  level: number;
  current_streak: number;
  best_streak: number;
  total_completions: number;
  consistency_14d: number;
  achievement_count: number;
  title_name: string;
  rank_icon: string;
}

type SortKey = "level" | "current_streak" | "consistency_14d" | "total_completions";

const TABS: { key: SortKey; label: string }[] = [
  { key: "level", label: "Level" },
  { key: "current_streak", label: "Streak" },
  { key: "consistency_14d", label: "Consistency" },
  { key: "total_completions", label: "Completions" },
];

function rankMedal(i: number): string {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return "";
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const hydrated = useHydrated();
  const [allUsers, setAllUsers] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("level");

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Load all user stats snapshots with profiles
      const { data: snapshots } = await supabase
        .from("user_stats_snapshots")
        .select("*");

      if (!snapshots) {
        setLoading(false);
        return;
      }

      // Fetch profiles for all snapshotted users
      const userIds = snapshots.map((s: { user_id: string }) => s.user_id);
      const { data: profiles } = userIds.length > 0
        ? await supabase
            .from("public_profiles")
            .select("*")
            .in("user_id", userIds)
        : { data: [] };

      const profileMap = new Map(
        (profiles ?? []).map((p: { user_id: string; display_name: string; username: string }) => [
          p.user_id,
          p,
        ]),
      );

      const entries: LeaderEntry[] = snapshots.map(
        (s: Record<string, unknown>) => {
          const p = profileMap.get(s.user_id as string);
          return {
            user_id: s.user_id as string,
            display_name: (p?.display_name as string) ?? "Unknown",
            username: (p?.username as string) ?? "unknown",
            level: (s.level as number) ?? 0,
            current_streak: (s.current_streak as number) ?? 0,
            best_streak: (s.best_streak as number) ?? 0,
            total_completions: (s.total_completions as number) ?? 0,
            consistency_14d: (s.consistency_14d as number) ?? 0,
            achievement_count: (s.achievement_count as number) ?? 0,
            title_name: (s.title_name as string) ?? "Habit Newbie",
            rank_icon: (s.rank_icon as string) ?? "⬡",
          };
        },
      );

      setAllUsers(entries);
      setLoading(false);
    }

    load();
  }, []);

  const sorted = useMemo(
    () =>
      [...allUsers]
        .sort((a, b) => {
          const aVal = a[sortKey];
          const bVal = b[sortKey];
          // Secondary sort by the opposite dimension for ties
          if (bVal !== aVal) return bVal - aVal;
          return b.level - a.level;
        })
        .slice(0, 50),
    [allUsers, sortKey],
  );

  if (!hydrated) return <PageSkeleton />;

  return (
    <AppPageShell>
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <PageHeader
            title="Leaderboard"
            subtitle="How you stack up against other habit-trackers"
          />
        </div>

        {/* Sort tabs */}
        <Segmented
          value={sortKey}
          onChange={(v) => setSortKey(v as SortKey)}
          options={TABS.map((t) => ({ value: t.key, label: t.label }))}
        />
        <div className="mb-6" />

        {/* Ranking */}
        {loading ? (
          <Card className="flex items-center justify-center p-8">
            <Loader2 className="size-5 animate-spin text-faint" />
          </Card>
        ) : sorted.length === 0 ? (
          <Card className="flex flex-col items-center gap-4 p-10 text-center">
            <Medal className="size-12 text-faint" />
            <div>
              <p className="text-sm font-semibold text-muted">
                No rankings yet
              </p>
              <p className="text-xs text-faint mt-1">
                Stats appear after users start tracking habits and syncing their
                data.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
              <span className="w-8 text-center">#</span>
              <span className="flex-1">User</span>
              <span className="w-16 text-right">{sortLabel(sortKey)}</span>
              <span className="w-12 text-right">Level</span>
            </div>

            {sorted.map((entry, i) => {
              const isMe = user && entry.user_id === user.id;
              const medal = rankMedal(i);
              return (
                <Link
                  key={entry.user_id}
                  href={`/profile/${entry.username}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface2/50",
                    isMe && "bg-accent/5",
                  )}
                >
                  {/* Rank */}
                  <div className="flex w-8 items-center justify-center text-center">
                    {medal ? (
                      <span className="text-base">{medal}</span>
                    ) : (
                      <span
                        className={cn(
                          "font-mono text-xs font-bold",
                          isMe ? "text-accent" : "text-faint",
                        )}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* User */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full",
                        isMe ? "bg-accent/15 text-accent" : "bg-surface2 text-muted",
                      )}
                    >
                      {isMe ? (
                        <Crown className="size-4" />
                      ) : (
                        <UserRound className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">
                          {entry.display_name}
                        </span>
                        {isMe && (
                          <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                            You
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-faint">
                        {entry.title_name}
                      </p>
                    </div>
                  </div>

                  {/* Sort value */}
                  <div className="w-16 text-right">
                    <span className="font-mono text-sm font-bold">
                      {formatSortValue(sortKey, entry[sortKey])}
                    </span>
                  </div>

                  {/* Level */}
                  <div className="w-12 text-right">
                    <span className="font-mono text-xs font-semibold text-muted">
                      Lv.{entry.level}
                    </span>
                  </div>
                </Link>
              );
            })}
          </Card>
        )}

        {/* Note about stats */}
        <p className="mt-4 text-center text-[10px] text-faint">
          Rankings update when you sync your habit data. Start tracking to appear
          on the board!
        </p>
      </div>
    </AppPageShell>
  );
}

function sortLabel(key: SortKey): string {
  switch (key) {
    case "level":
      return "Level";
    case "current_streak":
      return "Streak";
    case "consistency_14d":
      return "14d";
    case "total_completions":
      return "Done";
  }
}

function formatSortValue(key: SortKey, value: number): string {
  switch (key) {
    case "consistency_14d":
      return `${value}%`;
    case "total_completions":
      return value.toLocaleString();
    default:
      return `${value}`;
  }
}
