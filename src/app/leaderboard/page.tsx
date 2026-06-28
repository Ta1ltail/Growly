"use client";

// Leaderboard — ranks users by various stats: level, streak, consistency, and
// total completions. Two tabs: Friends (filtered to your friends) and World
// (all users). Uses server-side pagination via Supabase .order().range() so
// only PAGE_SIZE rows are transferred at a time.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Medal,
  Loader2,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Segmented } from "@/components/ui/Segmented";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { cn } from "@/lib/util";

interface LeaderEntry {
  user_id: string;
  display_name: string;
  username: string;
  avatar: string | null;
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

type Scope = "world" | "friends";

const TABS: { key: SortKey; label: string }[] = [
  { key: "level", label: "Level" },
  { key: "current_streak", label: "Streak" },
  { key: "consistency_14d", label: "Consistency" },
  { key: "total_completions", label: "Completions" },
];

const SCOPE_TABS: { value: Scope; label: string }[] = [
  { value: "friends", label: "Friends" },
  { value: "world", label: "World" },
];

const PAGE_SIZE = 20;

/** Maps sort key to the database column name. */
const SORT_COL: Record<SortKey, string> = {
  level: "level",
  current_streak: "current_streak",
  consistency_14d: "consistency_14d",
  total_completions: "total_completions",
};

/** Columns we select from user_stats_snapshots. */
const SNAPSHOT_COLS =
  "user_id, level, current_streak, best_streak, total_completions, consistency_14d, achievement_count, title_name, rank_icon";

/** Columns we select from public_profiles. */
const PROFILE_COLS = "user_id, display_name, username, avatar";

function rankMedal(i: number): string {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return "";
}

type DbSnapshot = {
  user_id: string;
  level: number;
  current_streak: number;
  best_streak: number;
  total_completions: number;
  consistency_14d: number;
  achievement_count: number;
  title_name: string;
  rank_icon: string;
};

type DbProfile = {
  user_id: string;
  display_name: string;
  username: string;
  avatar: string | null;
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const hydrated = useHydrated();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey_] = useState<SortKey>("level");
  const [scope, setScope_] = useState<Scope>("friends");
  const [page, setPage] = useState(0);

  // Inline page reset into scope/sort setters to avoid double-fetch race
  const setScope = (v: Scope) => { setScope_(v); setPage(0); };
  const setSortKey = (v: SortKey) => { setSortKey_(v); setPage(0); };

  // Load data from the server for the current page/scope/sort
  const loadPage = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Build base query on user_stats_snapshots
    let query = supabase
      .from("user_stats_snapshots")
      .select(SNAPSHOT_COLS, { count: "exact" });

    // For friends scope, filter by known friend IDs
    if (scope === "friends") {
      const ids = [...friendIds];
      if (user) ids.push(user.id);
      if (ids.length === 0) {
        setEntries([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
      query = query.in("user_id", ids);
    }

    const start = page * PAGE_SIZE;
    const { data: snapshots, count, error } = await query
      .order(SORT_COL[sortKey], { ascending: false })
      .range(start, start + PAGE_SIZE - 1);

    if (error || !snapshots) {
      console.error("[leaderboard] Query failed:", error?.message);
      setEntries([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setTotalCount(count ?? 0);

    // Load profiles for paged user IDs
    const userIds = snapshots.map((s: { user_id: string }) => s.user_id);
    const { data: profiles } = userIds.length > 0
      ? await supabase
          .from("public_profiles")
          .select(PROFILE_COLS)
          .in("user_id", userIds)
      : { data: [] };

    const profileMap = new Map<string, DbProfile>(
      (profiles ?? []).map((p: DbProfile) => [p.user_id, p]),
    );

    const enriched: LeaderEntry[] = snapshots.map((s: DbSnapshot) => {
      const p = profileMap.get(s.user_id);
      return {
        user_id: s.user_id,
        display_name: p?.display_name ?? "Unknown",
        username: p?.username ?? "unknown",
        avatar: p?.avatar ?? null,
        level: s.level ?? 0,
        current_streak: s.current_streak ?? 0,
        best_streak: s.best_streak ?? 0,
        total_completions: s.total_completions ?? 0,
        consistency_14d: s.consistency_14d ?? 0,
        achievement_count: s.achievement_count ?? 0,
        title_name: s.title_name ?? "Habit Newbie",
        rank_icon: s.rank_icon ?? "⬡",
      };
    });

    setEntries(enriched);
    setLoading(false);
  }, [user, page, sortKey, scope, friendIds]);

  // Load friend IDs once (they rarely change)
  useEffect(() => {
    async function loadFriends() {
      if (!user) {
        setFriendIds(new Set());
        return;
      }
      const supabase = createClient();
      const { data: rows } = await supabase
        .from("friends")
        .select("requester, addressee")
        .or(`requester.eq.${user.id},addressee.eq.${user.id}`)
        .eq("status", "accepted");

      const ids = new Set<string>();
      if (rows) {
        for (const row of rows as { requester: string; addressee: string }[]) {
          ids.add(row.requester === user.id ? row.addressee : row.requester);
        }
      }
      setFriendIds(ids);
    }
    loadFriends();
  }, [user]);

  // Reload when page/scope/sort changes or friend IDs load
  // Note: page is reset to 0 inside setScope/setSortKey above,
  // so there's no race between setPage(0) and the loadPage effect.
  useEffect(() => {
    // Don't fetch until friend IDs are ready for friends scope
    if (scope === "friends" && !user) {
      setEntries([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    loadPage();
  }, [loadPage, scope, user]);

  // Clamp page to valid range
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);

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

        {/* Scope tabs (Friends / World) */}
        <div className="mb-4">
          <Segmented
            value={scope}
            onChange={(v) => setScope(v as Scope)}
            options={SCOPE_TABS}
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
        ) : totalCount === 0 ? (
          <Card className="flex flex-col items-center gap-4 p-10 text-center">
            {scope === "friends" ? (
              <>
                <Users className="size-12 text-faint" />
                <div>
                  <p className="text-sm font-semibold text-muted">
                    No friends yet
                  </p>
                  <p className="text-xs text-faint mt-1">
                    Add friends to see how you compare. Search for users on the
                    Friends page.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Medal className="size-12 text-faint" />
                <div>
                  <p className="text-sm font-semibold text-muted">
                    No rankings yet
                  </p>
                  <p className="text-xs text-faint mt-1">
                    Stats appear after users start tracking habits and syncing
                    their data.
                  </p>
                </div>
              </>
            )}
          </Card>
        ) : (
          <>
            <Card className="divide-y divide-line overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                <span className="w-8 text-center">#</span>
                <span className="flex-1">User</span>
                <span className="w-16 text-right">{sortLabel(sortKey)}</span>
                <span className="w-12 text-right">Level</span>
              </div>

              {entries.map((entry, i) => {
                const isMe = user && entry.user_id === user.id;
                const globalRank = safePage * PAGE_SIZE + i + 1;
                const medal = rankMedal(globalRank - 1);
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
                          {globalRank}
                        </span>
                      )}
                    </div>

                    {/* User */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <AvatarDisplay avatar={entry.avatar} size={36} />
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

            {/* Pagination */}
            <Pagination
              page={safePage}
              pageCount={pageCount}
              total={totalCount}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
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
