import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { createMobileClient } from "../lib/supabase/client";
import { useAuth } from "../hooks/useAuth";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { colors } from "../lib/colors";

type SortKey = "level" | "current_streak" | "consistency_14d" | "total_completions";
type Scope = "world" | "friends";

interface LeaderEntry {
  user_id: string;
  display_name: string;
  username: string;
  avatar: string | null;
  level: number;
  current_streak: number;
  consistency_14d: number;
  total_completions: number;
  achievement_count: number;
}

const TABS: { key: SortKey; label: string }[] = [
  { key: "level", label: "Level" },
  { key: "current_streak", label: "Streak" },
  { key: "consistency_14d", label: "Consistency" },
  { key: "total_completions", label: "Completions" },
];

const SORT_COL: Record<SortKey, string> = {
  level: "level",
  current_streak: "current_streak",
  consistency_14d: "consistency_14d",
  total_completions: "total_completions",
};

const PAGE_SIZE = 20;

function rankMedal(i: number): string {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return "";
}

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey_] = useState<SortKey>("level");
  const [scope, setScope_] = useState<Scope>("friends");
  const [page, setPage] = useState(0);

  const setScope = (v: Scope) => { setScope_(v); setPage(0); };
  const setSortKey = (v: SortKey) => { setSortKey_(v); setPage(0); };

  const loadPage = useCallback(async () => {
    setLoading(true);
    const supabase = createMobileClient();

    let query = supabase
      .from("user_stats_snapshots")
      .select("user_id, level, current_streak, consistency_14d, total_completions, achievement_count", { count: "exact" });

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
      setEntries([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setTotalCount(count ?? 0);

    const userIds = snapshots.map((s: any) => s.user_id);
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("public_profiles").select("user_id, display_name, username, avatar").in("user_id", userIds)
      : { data: [] };

    const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));

    setEntries(snapshots.map((s: any) => {
      const p = profileMap.get(s.user_id);
      return {
        user_id: s.user_id,
        display_name: p?.display_name ?? "Unknown",
        username: p?.username ?? "unknown",
        avatar: p?.avatar ?? null,
        level: s.level ?? 0,
        current_streak: s.current_streak ?? 0,
        consistency_14d: s.consistency_14d ?? 0,
        total_completions: s.total_completions ?? 0,
        achievement_count: s.achievement_count ?? 0,
      };
    }));
    setLoading(false);
  }, [user, page, sortKey, scope, friendIds]);

  // Load friend IDs
  useEffect(() => {
    async function loadFriends() {
      if (!user) { setFriendIds(new Set()); return; }
      const supabase = createMobileClient();
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

  useEffect(() => {
    if (scope === "friends" && !user) {
      setEntries([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    loadPage();
  }, [loadPage, scope, user]);

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);

  if (!user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <PageHeader title="Leaderboard" subtitle="How you stack up" />
        <Card style={{ padding: 32, alignItems: "center" }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🏆</Text>
          <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "600", marginBottom: 4 }}>Sign in required</Text>
          <Text style={{ color: colors.faint, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
            Sign in to see how you rank against friends and the world.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <PageHeader title="Leaderboard" subtitle="How you stack up" />

      {/* Scope + Sort tabs */}
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
        <ScopeChip label="Friends" active={scope === "friends"} onPress={() => setScope("friends")} />
        <ScopeChip label="World" active={scope === "world"} onPress={() => setScope("world")} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {TABS.map((t) => (
            <ScopeChip key={t.key} label={t.label} active={sortKey === t.key} onPress={() => setSortKey(t.key)} />
          ))}
        </View>
      </ScrollView>

      {loading ? (
        <Card style={{ padding: 24, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </Card>
      ) : totalCount === 0 ? (
        <Card style={{ padding: 32, alignItems: "center" }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>{scope === "friends" ? "👥" : "🏆"}</Text>
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>
            {scope === "friends" ? "No friends yet. Add friends to compare stats!" : "No rankings yet. Start tracking to appear on the board!"}
          </Text>
        </Card>
      ) : (
        <Card style={{ overflow: "hidden" }}>
          {/* Header */}
          <View style={{ flexDirection: "row", paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1e293b" }}>
            <Text style={{ color: colors.faint, fontSize: 10, fontWeight: "700", width: 30, textAlign: "center" }}>#</Text>
            <Text style={{ color: colors.faint, fontSize: 10, fontWeight: "700", flex: 1, textTransform: "uppercase" }}>User</Text>
            <Text style={{ color: colors.faint, fontSize: 10, fontWeight: "700", width: 60, textAlign: "right", textTransform: "uppercase" }}>
              {sortKey === "level" ? "Level" : sortKey === "current_streak" ? "Streak" : sortKey === "consistency_14d" ? "14d" : "Done"}
            </Text>
          </View>
          {entries.map((entry, i) => {
            const isMe = user && entry.user_id === user.id;
            const globalRank = safePage * PAGE_SIZE + i + 1;
            const medal = rankMedal(globalRank - 1);
            return (
              <View key={entry.user_id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1e293b", backgroundColor: isMe ? `${colors.accent}0d` : "transparent" }}>
                <View style={{ width: 30, alignItems: "center" }}>
                  {medal ? <Text style={{ fontSize: 16 }}>{medal}</Text> : <Text style={{ color: isMe ? colors.accent : colors.faint, fontFamily: "monospace", fontSize: 12, fontWeight: "700" }}>{globalRank}</Text>}
                </View>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>👤</Text>
                  <View>
                    <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "600" }}>{entry.display_name}</Text>
                    {isMe && <Text style={{ color: colors.accent, fontSize: 10, fontWeight: "700" }}>You</Text>}
                  </View>
                </View>
                <Text style={{ color: colors.ink, fontFamily: "monospace", fontSize: 13, fontWeight: "700", width: 60, textAlign: "right" }}>
                  {sortKey === "consistency_14d" ? `${entry.consistency_14d}%` : sortKey === "total_completions" ? entry.total_completions.toLocaleString() : String(entry[sortKey])}
                </Text>
              </View>
            );
          })}
        </Card>
      )}

      {pageCount > 1 && (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 12 }}>
          <Pressable onPress={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0} style={{ padding: 8 }}>
            <Text style={{ color: safePage > 0 ? colors.accent : colors.faint, fontSize: 14 }}>← Prev</Text>
          </Pressable>
          <Text style={{ color: colors.muted, fontSize: 12, paddingVertical: 8 }}>{safePage + 1} / {pageCount}</Text>
          <Pressable onPress={() => setPage(Math.min(pageCount - 1, safePage + 1))} disabled={safePage >= pageCount - 1} style={{ padding: 8 }}>
            <Text style={{ color: safePage < pageCount - 1 ? colors.accent : colors.faint, fontSize: 14 }}>Next →</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function ScopeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: active ? `${colors.accent}4d` : "#334155", backgroundColor: active ? `${colors.accent}1a` : "transparent" }}
    >
      <Text style={{ color: active ? colors.accent : colors.muted, fontSize: 12, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
});
