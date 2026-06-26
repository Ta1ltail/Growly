"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  UserPlus,
  UserCheck,
  X,
  Check,
  Clock,
  Users,
  ChevronRight,
  Loader2,
  UserRound,
  Heart,
} from "lucide-react";
import { createNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { AppPageShell } from "@/components/layout/AppPageShell";

type FriendRow = {
  id: string;
  requester: string;
  addressee: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
};

type PublicProfile = {
  user_id: string;
  display_name: string;
  username: string;
  bio: string | null;
  avatar: string | null;
};

interface FriendWithProfile extends PublicProfile {
  friendId: string;
  status: "pending" | "accepted" | "blocked";
  isRequester: boolean;
  createdAt: string;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const hydrated = useHydrated();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    // Load all friend entries for this user
    const { data: rows } = await supabase
      .from("friends")
      .select("*")
      .or(`requester.eq.${user.id},addressee.eq.${user.id}`);

    if (!rows) {
      setLoading(false);
      return;
    }

    // Collect all friend user ids to fetch profiles
    const friendIds = new Set<string>();
    const pending: FriendWithProfile[] = [];
    const accepted: FriendWithProfile[] = [];

    for (const row of rows as FriendRow[]) {
      const isRequester = row.requester === user.id;
      const otherId = isRequester ? row.addressee : row.requester;
      friendIds.add(otherId);

      const base = {
        user_id: otherId,
        friendId: row.id,
        status: row.status as "pending" | "accepted" | "blocked",
        isRequester,
        createdAt: row.created_at,
      } as FriendWithProfile;

      if (row.status === "pending" && !isRequester) {
        pending.push(base);
      } else if (row.status === "accepted") {
        accepted.push(base);
      }
    }

    // Fetch profiles for all friends
    if (friendIds.size > 0) {
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("*")
        .in("user_id", [...friendIds]);

      const profileMap = new Map(
        (profiles ?? []).map((p: PublicProfile) => [p.user_id, p]),
      );

      const enrich = (list: FriendWithProfile[]) =>
        list.map((f) => ({
          ...f,
          ...(profileMap.get(f.user_id) ?? {
            display_name: "Unknown",
            username: "unknown",
            bio: null,
            avatar: null,
          }),
        }));

      setPendingRequests(enrich(pending));
      setFriends(enrich(accepted));
    } else {
      setPendingRequests([]);
      setFriends([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // Search for users
  useEffect(() => {
    if (!user || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      const q = searchQuery.trim();

      const { data } = await supabase
        .from("public_profiles")
        .select("*")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq("user_id", user.id)
        .limit(10);

      setSearchResults((data ?? []) as PublicProfile[]);
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
      // Notify the addressee
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
        // Notify the requester that their request was accepted
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
    loadFriends();
  };

  if (!hydrated) return <PageSkeleton />;

  return (
    <AppPageShell>
      <div className="animate-fade-in">
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
                const isFriend = friends.some(
                  (f) => f.user_id === profile.user_id,
                );
                const isPending = pendingRequests.some(
                  (f) => f.user_id === profile.user_id,
                );
                const isSent = sentRequests.has(profile.user_id);

                return (
                  <div
                    key={profile.user_id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <UserRound className="size-4.5" />
                    </div>
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
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <UserRound className="size-5" />
                  </div>
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

        {/* Friends list */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Users className="size-4 icon-accent" /> Friends
            {friends.length > 0 && (
              <span className="ml-1 font-mono text-xs text-faint">
                ({friends.length})
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
            <Card className="divide-y divide-line">
              {friends.map((friend) => (
                <Link
                  key={friend.friendId}
                  href={`/profile/${friend.username}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface2/50"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <UserRound className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {friend.display_name}
                    </p>
                    <p className="text-xs text-faint">@{friend.username}</p>
                  </div>
                  <ChevronRight className="size-4 text-faint" />
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>
    </AppPageShell>
  );
}
