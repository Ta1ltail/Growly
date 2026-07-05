// UserProfileScreen — View another user's profile from Supabase.
// Accessed by tapping a friend's name on FriendsScreen or Leaderboard.
// Fetches public profile, stats snapshot, and achievements.

import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  RANK_STYLE,
  RARITY_ORDER,
  RARITY_LABEL,
  RARITY_STYLE,
  type AchievementDef,
} from "@project101/shared";
import { createMobileClient } from "../lib/supabase/client";
import { Card } from "../components/ui/Card";
import { AvatarDisplay } from "../components/ui/AvatarDisplay";
import { colors } from "../lib/colors";

interface UserProfile {
  username: string;
  display_name: string;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  motto: string | null;
}

interface UserStats {
  total_xp: number;
  level: number;
  current_streak: number;
  best_streak: number;
  total_completions: number;
  consistency_pct: number;
  achievement_count: number;
  title_name: string;
  title_rank: string;
}

interface Props {
  userId: string;
  onBack: () => void;
}

export default function UserProfileScreen({ userId, onBack }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createMobileClient();

        const { data: prof, error: profErr } = await supabase
          .from("public_profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profErr) throw profErr;
        setProfile(prof as unknown as UserProfile);

        const { data: st, error: stErr } = await supabase
          .from("user_stats_snapshots")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (!stErr && st) {
          setStats(st as unknown as UserStats);
        }
      } catch (e: any) {
        setError(e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const rankKey = stats && stats.title_rank in RANK_STYLE ? (stats.title_rank as keyof typeof RANK_STYLE) : "Beginner";
  const rank = RANK_STYLE[rankKey];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.backRow}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.backRow}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>{error || "Profile not found"}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.backRow}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </View>

      {/* Banner + Avatar */}
      <Card style={{ overflow: "hidden", marginBottom: 16, padding: 0 }}>
        <View style={{ height: 80, backgroundColor: profile.banner || rank.accent }} />
        <View style={{ padding: 16, paddingTop: 0 }}>
          <View style={{ marginTop: -40, flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
            <AvatarDisplay avatar={profile.avatar || undefined} size={72} />
            {stats && (
              <View style={{ marginBottom: 4 }}>
                <View style={{ backgroundColor: `${colors.accent}26`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ color: colors.accent, fontFamily: "monospace", fontSize: 13, fontWeight: "700" }}>{stats.level}</Text>
                </View>
              </View>
            )}
          </View>
          <Text style={{ color: colors.ink, fontSize: 20, fontWeight: "700", marginTop: 8 }}>
            {profile.display_name}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14 }}>@{profile.username}</Text>
          {profile.motto && (
            <Text style={{ color: colors.muted, fontStyle: "italic", fontSize: 13, marginTop: 4 }}>
              "{profile.motto}"
            </Text>
          )}
          {profile.bio && (
            <Text style={{ color: `${colors.ink}cc`, fontSize: 14, marginTop: 4 }}>{profile.bio}</Text>
          )}
        </View>
      </Card>

      {/* Stats */}
      {stats && (
        <>
          <View style={styles.statsGrid}>
            <Card style={{ flex: 1, padding: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Level</Text>
              <Text style={{ fontSize: 24, fontWeight: "700", color: colors.ink, fontFamily: "monospace" }}>{stats.level}</Text>
            </Card>
            <Card style={{ flex: 1, padding: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>XP</Text>
              <Text style={{ fontSize: 24, fontWeight: "700", color: colors.accent, fontFamily: "monospace" }}>{stats.total_xp.toLocaleString()}</Text>
            </Card>
          </View>
          <View style={styles.statsGrid}>
            <Card style={{ flex: 1, padding: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>🔥 Streak</Text>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#f97316", fontFamily: "monospace" }}>{stats.current_streak}</Text>
            </Card>
            <Card style={{ flex: 1, padding: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Best</Text>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#f97316", fontFamily: "monospace" }}>{stats.best_streak}</Text>
            </Card>
          </View>
          <View style={styles.statsGrid}>
            <Card style={{ flex: 1, padding: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Done</Text>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#22c55e", fontFamily: "monospace" }}>{stats.total_completions.toLocaleString()}</Text>
            </Card>
            <Card style={{ flex: 1, padding: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Consistency</Text>
              <Text style={{ fontSize: 24, fontWeight: "700", color: colors.accent, fontFamily: "monospace" }}>{stats.consistency_pct}%</Text>
            </Card>
          </View>

          {/* Title */}
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 28 }}>{rank.icon}</Text>
              <View>
                <Text style={{ color: rank.accent, fontSize: 16, fontWeight: "800" }}>{stats.title_name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{stats.title_rank}</Text>
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <Text style={styles.badgeLabel}>🏅 Achievements: {stats.achievement_count}</Text>
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  backRow: { marginBottom: 12 },
  backBtn: { paddingVertical: 8, paddingHorizontal: 4, alignSelf: "flex-start" },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  badgeLabel: { color: colors.ink, fontSize: 13, fontWeight: "500" },
});
