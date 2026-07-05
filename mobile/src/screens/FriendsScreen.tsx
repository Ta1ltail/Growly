import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { createMobileClient } from "../lib/supabase/client";
import { useAuth } from "../hooks/useAuth";
import { useAppData } from "../lib/AppProvider";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { colors } from "../lib/colors";

type PublicProfile = {
  user_id: string;
  display_name: string;
  username: string;
  bio: string | null;
  avatar: string | null;
};

interface FriendWithProfile extends PublicProfile {
  friendId: string;
  status: "pending" | "accepted";
  isRequester: boolean;
  createdAt: string;
  level?: number;
  current_streak?: number;
  consistency_14d?: number;
  achievement_count?: number;
}

const FRIENDS_PAGE_SIZE = 10;

export default function FriendsScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [totalFriends, setTotalFriends] = useState(0);
  const [page, setPage] = useState(0);

  // Load friends data
  const loadFriends = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const supabase = createMobileClient();

    try {
      // Pending requests
      const { data: pendingRows } = await supabase
        .from("friends")
        .select("id, requester, addressee, created_at")
        .eq("addressee", user.id)
        .eq("status", "pending");

      // Count accepted friends
      const { count: acceptedCount } = await supabase
        .from("friends")
        .select("id", { count: "exact", head: true })
        .or(`requester.eq.${user.id},addressee.eq.${user.id}`)
        .eq("status", "accepted");

      setTotalFriends(acceptedCount ?? 0);

      // Load accepted friends
      const start = page * FRIENDS_PAGE_SIZE;
      const { data: acceptedRows } = await supabase
        .from("friends")
        .select("id, requester, addressee, created_at")
        .or(`requester.eq.${user.id},addressee.eq.${user.id}`)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .range(start, start + FRIENDS_PAGE_SIZE - 1);

      // Collect user IDs
      const userIds = new Set<string>();
      for (const row of [...(pendingRows ?? []), ...(acceptedRows ?? [])] as { requester: string; addressee: string }[]) {
        userIds.add(row.requester === user.id ? row.addressee : row.requester);
      }

      // Fetch profiles + stats
      const profileMap = new Map<string, PublicProfile>();
      const statsMap = new Map<string, { level: number; current_streak: number; consistency_14d: number; achievement_count: number }>();

      if (userIds.size > 0) {
        const ids = [...userIds];
        const [profilesResult, snapshotsResult] = await Promise.all([
          supabase.from("public_profiles").select("user_id, display_name, username, bio, avatar").in("user_id", ids),
          supabase.from("user_stats_snapshots").select("user_id, level, current_streak, consistency_14d, achievement_count").in("user_id", ids),
        ]);

        for (const p of (profilesResult.data ?? []) as PublicProfile[]) profileMap.set(p.user_id, p);
        for (const s of (snapshotsResult.data ?? []) as any[]) statsMap.set(s.user_id, s);
      }

      const enrich = (rows: { requester: string; addressee: string; id: string; created_at: string }[], status: "pending" | "accepted") =>
        rows.map((row) => {
          const otherId = row.requester === user.id ? row.addressee : row.requester;
          const profile = profileMap.get(otherId);
          const stats = statsMap.get(otherId);
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
            level: stats?.level,
            current_streak: stats?.current_streak,
            consistency_14d: stats?.consistency_14d,
            achievement_count: stats?.achievement_count,
          };
        });

      setPendingRequests(enrich(pendingRows ?? [], "pending"));
      setFriends(enrich(acceptedRows ?? [], "accepted"));
    } catch (e) {
      console.error("[friends] Failed to load:", e);
    }
    setLoading(false);
  }, [user, page]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // Search users
  useEffect(() => {
    if (!user || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const supabase = createMobileClient();
      const q = searchQuery.trim();
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id, display_name, username, avatar")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq("user_id", user.id)
        .limit(10);
      setSearchResults((data ?? []) as PublicProfile[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  async function sendFriendRequest(friendUserId: string) {
    if (!user) return;
    setActionLoading(friendUserId);
    const supabase = createMobileClient();
    const { error } = await supabase
      .from("friends")
      .insert({ requester: user.id, addressee: friendUserId });

    if (!error) {
      setSentRequests((prev) => new Set(prev).add(friendUserId));
    }
    setActionLoading(null);
  }

  async function respondToRequest(friendId: string, accept: boolean, requesterUserId?: string) {
    setActionLoading(friendId);
    const supabase = createMobileClient();
    if (accept) {
      await supabase.from("friends").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", friendId);
    } else {
      await supabase.from("friends").delete().eq("id", friendId);
    }
    setActionLoading(null);
    loadFriends();
  }

  const pageCount = Math.max(1, Math.ceil(totalFriends / FRIENDS_PAGE_SIZE));

  if (!user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <PageHeader title="Friends" subtitle="Connect with other habit-trackers" />
        <Card style={{ padding: 32, alignItems: "center" }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
          <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "600", marginBottom: 4 }}>Sign in required</Text>
          <Text style={{ color: colors.faint, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
            Sign in with your account to find and connect with friends.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <PageHeader title="Friends" subtitle={`${totalFriends} friend${totalFriends === 1 ? "" : "s"}`} />

      {/* Search */}
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or username…"
          placeholderTextColor={colors.faint}
          style={styles.searchInput}
        />
        {searchResults.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {searchResults.map((profile) => {
              const isFriend = friends.some((f) => f.user_id === profile.user_id);
              const isPending = pendingRequests.some((f) => f.user_id === profile.user_id);
              const isSent = sentRequests.has(profile.user_id);
              return (
                <View key={profile.user_id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 18 }}>👤</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "600" }}>{profile.display_name}</Text>
                    <Text style={{ color: colors.faint, fontSize: 12 }}>@{profile.username}</Text>
                  </View>
                  {isFriend ? (
                    <Text style={{ color: "#10b981", fontSize: 12, fontWeight: "500" }}>✅ Friends</Text>
                  ) : isPending ? (
                    <Text style={{ color: "#f59e0b", fontSize: 12, fontWeight: "500" }}>Pending</Text>
                  ) : isSent ? (
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "500" }}>Sent</Text>
                  ) : (
                    <Pressable
                      onPress={() => sendFriendRequest(profile.user_id)}
                      disabled={actionLoading === profile.user_id}
                      style={{ backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                    >
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>+ Add</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            ❤️ Pending requests ({pendingRequests.length})
          </Text>
          {pendingRequests.map((req) => (
            <Card key={req.friendId} style={{ padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 24 }}>👤</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "600" }}>{req.display_name}</Text>
                  <Text style={{ color: colors.faint, fontSize: 12 }}>@{req.username}</Text>
                </View>
                <Pressable onPress={() => respondToRequest(req.friendId, true, req.user_id)} disabled={actionLoading === req.friendId} style={{ backgroundColor: "rgba(16,185,129,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ color: "#10b981", fontSize: 12, fontWeight: "600" }}>✅ Accept</Text>
                </Pressable>
                <Pressable onPress={() => respondToRequest(req.friendId, false)} disabled={actionLoading === req.friendId} style={{ backgroundColor: "rgba(244,63,94,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ color: "#f43f5e", fontSize: 12, fontWeight: "600" }}>✕ Decline</Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Friends list */}
      {loading ? (
        <Card style={{ padding: 24, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </Card>
      ) : friends.length === 0 && pendingRequests.length === 0 ? (
        <Card style={{ padding: 32, alignItems: "center" }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>No friends yet. Search for users above to connect!</Text>
        </Card>
      ) : friends.length === 0 ? (
        <Card style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>No accepted friends yet — respond to pending requests.</Text>
        </Card>
      ) : (
        <View>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            👥 Friends ({totalFriends})
          </Text>
          {/* Header */}
          <Card style={{ overflow: "hidden" }}>
            <View style={{ flexDirection: "row", paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1e293b" }}>
              <Text style={{ color: colors.faint, fontSize: 10, fontWeight: "700", textTransform: "uppercase", flex: 1 }}>User</Text>
              <Text style={{ color: colors.faint, fontSize: 10, fontWeight: "700", textTransform: "uppercase", width: 44, textAlign: "right" }}>Lvl</Text>
              <Text style={{ color: colors.faint, fontSize: 10, fontWeight: "700", textTransform: "uppercase", width: 44, textAlign: "right" }}>Streak</Text>
            </View>
            {friends.map((friend) => (
              <View key={friend.friendId} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1e293b" }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>👤</Text>
                  <View>
                    <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "600" }}>{friend.display_name}</Text>
                    <Text style={{ color: colors.faint, fontSize: 11 }}>@{friend.username}</Text>
                  </View>
                </View>
                <Text style={{ color: colors.muted, fontFamily: "monospace", fontSize: 12, width: 44, textAlign: "right" }}>{friend.level ?? "-"}</Text>
                <Text style={{ color: colors.muted, fontFamily: "monospace", fontSize: 12, width: 44, textAlign: "right" }}>{friend.current_streak ?? "-"}</Text>
              </View>
            ))}
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#f1f5f9",
    fontSize: 14,
  },
});
