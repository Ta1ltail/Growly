"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  UserPlus,
  UserCheck,
  X,
  Check,
  Clock,
  Users,
  Loader2,
  Heart,
  Flame,
  Medal,
} from "lucide-react";
import { createNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { AppPageShell } from "@/components/layout/AppPageShell";

type PublicProfile = {
  user_id: string;
  display_name: string;
  username: string;
  bio: string | null;
  avatar: string | null;
};

type StatsSnapshot = {
  level: number;
  current_streak: number;
  best_streak: number;
  total_completions: number;
  consistency_14d: number;
  achievement_count: number;
  title_name: string;
  rank_icon: string;
};

interface FriendWithProfile extends PublicProfile {
  friendId: string;
  status: "pending" | "accepted" | "blocked";
  isRequester: boolean;
  createdAt: string;
  stats?: StatsSnapshot;
}

const FRIENDS_PAGE_SIZE = 10;

/** Columns we select from public_profiles. */
const PROFILE_COLS = "user_id, display_name, username, bio, avatar";

/** Columns we select from user_stats_snapshots. */
const SNAPSHOT_COLS =
  "user_id, level, current_streak, best_streak, total_completions, consistency_14d, achievement_count, title_name, rank_icon";

export default function FriendsPage() {
  const { user } = useAuth();
  const hydrated = useHydrated();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [friendIdSet, setFriendIdSet] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [friendsPage, setFriendsPage] = useState(0);
  const [totalFriends, setTotalFriends] = useState(0);

  // Load ALL friend user IDs (for search result matching, independent of pagination)
  const friendIdCache = useRef<Set<string> | null>(null);

  const loadFriendIdSet = useCallback(async () => {
    if (!user) {
      setFriendIdSet(new Set());
      return;
    }
    // Cache hit — IDs rarely change mid-session
    if (friendIdCache.current) {
      setFriendIdSet(friendIdCache.current);
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
    friendIdCache.current = ids;
    setFriendIdSet(ids);
  }, [user]);

  // Load pending requests + a single page of accepted friends from the server
  const loadFriends = useCallback(async (page: number) => {
    if (!user) return;
    const supabase = createClient();
    setLoading(true);

    try {
      // ── 1. Load pending requests (typically few — no pagination needed) ──
      const { data: pendingRows } = await supabase
        .from("friends")
        .select("id, requester, addressee, created_at")
        .eq("addressee", user.id)
        .eq("status", "pending");

      // ── 2. Count total accepted friends (for pagination) ──
      const { count: acceptedCount } = await supabase
        .from("friends")
        .select("id", { count: "exact", head: true })
        .or(`requester.eq.${user.id},addressee.eq.${user.id}`)
        .eq("status", "accepted");

      const total = acceptedCount ?? 0;
      setTotalFriends(total);

      // ── 3. Load one page of accepted friends ──
      const start = page * FRIENDS_PAGE_SIZE;
      const { data: acceptedRows } = await supabase
        .from("friends")
        .select("id, requester, addressee, created_at")
        .or(`requester.eq.${user.id},addressee.eq.${user.id}`)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .range(start, start + FRIENDS_PAGE_SIZE - 1);

      // Collect all unique user IDs we need profiles + stats for
      const userIds = new Set<string>();
      for (const row of [...(pendingRows ?? []), ...(acceptedRows ?? [])] as { requester: string; addressee: string }[]) {
        const otherId = row.requester === user.id ? row.addressee : row.requester;
        userIds.add(otherId);
      }

      // ── 4. Fetch profiles + stats ──
      const profileMap = new Map<string, PublicProfile>();
      const statsMap = new Map<string, StatsSnapshot>();

      if (userIds.size > 0) {
        const ids = [...userIds];
        const [profilesResult, snapshotsResult] = await Promise.all([
          supabase.from("public_profiles").select(PROFILE_COLS).in("user_id", ids),
          supabase.from("user_stats_snapshots").select(SNAPSHOT_COLS).in("user_id", ids),
        ]);

        for (const p of (profilesResult.data ?? []) as PublicProfile[]) {
          profileMap.set(p.user_id, p);
        }
        for (const s of (snapshotsResult.data ?? []) as (StatsSnapshot & { user_id: string })[]) {
          statsMap.set(s.user_id, s);
        }
      }

      // ── 5. Build enriched lists ──
      const enrich = (rows: { requester: string; addressee: string; id: string; created_at: string }[], status: "pending" | "accepted"): FriendWithProfile[] =>
        rows.map((row) => {
          const otherId = row.requester === user.id ? row.addressee : row.requester;
          const profile = profileMap.get(otherId);
          return {
            user_id: otherId,
            friendId: row.id,
            status,
            isRequester: row.requester === user.id,
            createdAt: row.created_at,
            display_name: profile?.display_name ?? "Unknown",
            username: profile?.username ?? "unknown",
            bio: profile?.bio ?? null,
            avatar: profile?.avatar ?? null,
            stats: statsMap.get(otherId),
          };
        });

      setPendingRequests(enrich(pendingRows ?? [], "pending"));
      setFriends(enrich(acceptedRows ?? [], "accepted"));
    } catch (e) {
      console.error("[friends] Failed to load:", e);
    }

    setLoading(false);
  }, [user]);

  // Initial load + reload when user or page changes
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function initialLoad() {
      await loadFriendIdSet();
      if (!cancelled) await loadFriends(friendsPage);
    }
    initialLoad();
    return () => { cancelled = true; };
  }, [user, friendsPage, loadFriends, loadFriendIdSet]);

  // Search for users (already server-limited to 10)
  useEffect(() => {
    if (!user || searchQuery.trim().length < 2) {
      queueMicrotask(() => setSearchResults([]));
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      // Strip characters that are structural in a PostgREST .or() filter string
      // (comma, parens, backslash) and the ilike wildcards so raw user input
      // can't inject extra filter clauses or wildcard patterns.
      const q = searchQuery.trim().replace(/[,()\\*%]/g, "");
      if (q.length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("public_profiles")
          .select("user_id, display_name, username, avatar")
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .neq("user_id", user.id)
          .limit(10);

        setSearchResults((data ?? []) as PublicProfile[]);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const sendFriendRequest = async (friendUserId: string) => {
    if (!user) return;
    setActionLoading(friendUserId);
    const supabase = createClient();
    const { error } = await supabase
      .from("friends")
      .insert({ requester: user.id, addressee: friendUserId });

    if (error) {
      console.error("[friends] Failed to send request:", error.message);
    } else {
      setSentRequests((prev) => new Set(prev).add(friendUserId));
      await createNotification({
        userId: friendUserId,
        type: "friend_request",
        title: `${user.user_metadata?.display_name ?? user.email ?? "Someone"} sent you a friend request!`,
        body: "Tap to respond",
        fromUser: user.id,
        link: "/friends",
      });
    }
    setActionLoading(null);
  };

  const respondToRequest = async (
    friendId: string,
    accept: boolean,
    requesterUserId?: string,
  ) => {
    setActionLoading(friendId);
    const supabase = createClient();
    if (accept) {
      const { error } = await supabase
        .from("friends")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", friendId);
      if (error) {
        console.error("[friends] Failed to accept:", error.message);
      } else if (requesterUserId && user) {
        await createNotification({
          userId: requesterUserId,
          type: "friend_accept",
          title: `${user.user_metadata?.display_name ?? user.email ?? "Someone"} accepted your friend request! 🎉`,
          body: "You're now connected",
          fromUser: user.id,
          link: "/friends",
        });
      }
    } else {
      const { error } = await supabase.from("friends").delete().eq("id", friendId);
      if (error) console.error("[friends] Failed to decline:", error.message);
    }
    setActionLoading(null);
    // Invalidate friend ID cache so the next search picks up the change
    friendIdCache.current = null;
    loadFriendIdSet();
    loadFriends(friendsPage);
  };

  // Pagination
  const pageCount = Math.max(1, Math.ceil(totalFriends / FRIENDS_PAGE_SIZE));
  const safePage = Math.min(friendsPage, pageCount - 1);

  if (!hydrated) return <PageSkeleton />;

  return (
    <AppPageShell>
        <PageHeader title="Friends" subtitle="Connect with other habit-trackers" />

        {/* Search section */}
        <Card className="mb-6 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              type="text"
              placeholder="Search by name or username…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search users"
              className="w-full rounded-xl border border-line bg-bg py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-faint" />
            )}
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-3 divide-y divide-line rounded-xl border border-line">
              {searchResults.map((profile) => {
                const isFriend = friendIdSet.has(profile.user_id);
                const isPending = pendingRequests.some(
                  (f) => f.user_id === profile.user_id,
                );
                const isSent = sentRequests.has(profile.user_id);

                return (
                  <div
                    key={profile.user_id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <AvatarDisplay avatar={profile.avatar} size={36} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/profile/${profile.username}`}
                        className="text-sm font-semibold hover:text-accent transition-colors"
                      >
                        {profile.display_name}
                      </Link>
                      <p className="text-xs text-faint">@{profile.username}</p>
                    </div>
                    {isFriend ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-done">
                        <UserCheck className="size-3.5" /> Friends
                      </span>
                    ) : isPending ? (
                      <span className="text-xs font-medium text-amber-500">
                        Pending request
                      </span>
                    ) : isSent ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-muted">
                        <Clock className="size-3.5" /> Sent
                      </span>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(profile.user_id)}
                        disabled={actionLoading === profile.user_id}
                        className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                      >
                        {actionLoading === profile.user_id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <UserPlus className="size-3.5" />
                        )}
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              <Heart className="size-4 icon-rose" /> Pending requests
              <span className="ml-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-500">
                {pendingRequests.length}
              </span>
            </h2>
            <Card className="divide-y divide-line">
              {pendingRequests.map((req) => (
                <div
                  key={req.friendId}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <AvatarDisplay avatar={req.avatar} size={40} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${req.username}`}
                      className="text-sm font-semibold hover:text-accent transition-colors"
                    >
                      {req.display_name}
                    </Link>
                    <p className="text-xs text-faint">@{req.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => respondToRequest(req.friendId, true, req.user_id)}
                      disabled={actionLoading === req.friendId}
                      className="flex items-center gap-1 rounded-lg bg-done/15 px-3 py-1.5 text-xs font-semibold text-done transition-all hover:bg-done/25 active:scale-95 disabled:opacity-50"
                    >
                      <Check className="size-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => respondToRequest(req.friendId, false)}
                      disabled={actionLoading === req.friendId}
                      className="flex items-center gap-1 rounded-lg bg-missed/15 px-3 py-1.5 text-xs font-semibold text-missed transition-all hover:bg-missed/25 active:scale-95 disabled:opacity-50"
                    >
                      <X className="size-3.5" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        )}

        {/* Friends list — leaderboard-style table */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Users className="size-4 icon-accent" /> Friends
            {totalFriends > 0 && (
              <span className="ml-1 font-mono text-xs text-faint">
                ({totalFriends})
              </span>
            )}
          </h2>

          {loading ? (
            <Card className="flex items-center justify-center p-8">
              <Loader2 className="size-5 animate-spin text-faint" />
            </Card>
          ) : friends.length === 0 && pendingRequests.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 p-8 text-center">
              <Users className="size-10 text-faint" />
              <p className="text-sm text-muted">
                No friends yet. Search for other users above to connect!
              </p>
            </Card>
          ) : friends.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted">
              No accepted friends yet — respond to pending requests or search
              for new people.
            </Card>
          ) : (
            <>
              <Card className="divide-y divide-line overflow-hidden">
                {/* Table header */}
                <div className="flex items-center gap-3 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                  <span className="flex-1">User</span>
                  <span className="w-12 text-right">Level</span>
                  <span className="w-12 text-right">Streak</span>
                  <span className="w-12 text-right">7d</span>
                  <span className="w-14 text-right">Badges</span>
                </div>

                {friends.map((friend) => (
                  <Link
                    key={friend.friendId}
                    href={`/profile/${friend.username}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface2/50"
                  >
                    {/* User info */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <AvatarDisplay avatar={friend.avatar} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {friend.display_name}
                        </p>
                        <p className="truncate text-xs text-faint">
                          @{friend.username}
                        </p>
                      </div>
                    </div>

                    {/* Level */}
                    <div className="w-12 text-right">
                      <span className="font-mono text-xs font-semibold text-muted">
                        {friend.stats?.level ?? "-"}
                      </span>
                    </div>

                    {/* Current Streak */}
                    <div className="w-12 text-right">
                      <span className="font-mono text-xs font-semibold text-muted flex items-center justify-end gap-1">
                        <Flame className="size-3 text-orange-400" />
                        {friend.stats?.current_streak ?? "-"}
                      </span>
                    </div>

                    {/* Consistency (7d) */}
                    <div className="w-12 text-right">
                      <span className="font-mono text-xs font-semibold text-muted">
                        {friend.stats ? `${friend.stats.consistency_14d}%` : "-"}
                      </span>
                    </div>

                    {/* Badge count */}
                    <div className="w-14 text-right">
                      <span className="font-mono text-xs font-semibold text-muted flex items-center justify-end gap-1">
                        <Medal className="size-3 text-faint" />
                        {friend.stats?.achievement_count ?? "-"}
                      </span>
                    </div>
                  </Link>
                ))}
              </Card>

              {/* Pagination */}
              <Pagination
                page={safePage}
                pageCount={pageCount}
                total={totalFriends}
                pageSize={FRIENDS_PAGE_SIZE}
                onChange={setFriendsPage}
              />
            </>
          )}
        </section>
    </AppPageShell>
  );
}
