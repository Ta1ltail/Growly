import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";

import {
  summarizeProgress, RARITY_ORDER, RARITY_LABEL, RARITY_STYLE,
  RANK_STYLE, resolveBanner, type AchievementDef,
} from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { Card } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { AvatarDisplay } from "../components/ui/AvatarDisplay";
import { XpBar } from "../components/progression/XpBar";
import { colors } from "../lib/colors";

export default function ProfileScreen() {
  const { data, actions } = useAppData();
  const today = new Date();
  const summary = useMemo(() => summarizeProgress(data, today), [data, today]);
  const { profile } = data;
  const { stats, level, title, unlockedCount, totalCount, coinBalance } = summary;
  const rank = RANK_STYLE[title.current.rank];
  const banner = resolveBanner(profile.banner);

  const unlockedDefs = useMemo<AchievementDef[]>(
    () => summary.achievements.filter((a) => a.unlocked).map((a) => a.def).sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]),
    [summary.achievements],
  );

  const mostCompleted = useMemo(() => {
    const counts = new Map<string, number>();
    for (const day of Object.values(data.marks)) {
      for (const [habitId, status] of Object.entries(day)) {
        if (status === "done") counts.set(habitId, (counts.get(habitId) ?? 0) + 1);
      }
    }
    let bestId: string | null = null;
    let bestCount = 0;
    for (const [id, n] of counts) { if (n > bestCount) { bestCount = n; bestId = id; } }
    const habit = bestId ? data.habits.find((h) => h.id === bestId) : undefined;
    return habit ? { name: habit.name, count: bestCount } : null;
  }, [data]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Hero banner */}
      <Card style={{ overflow: "hidden", marginBottom: 16, padding: 0 }}>
        <View style={{ height: 100, backgroundColor: banner }} />
        <View style={{ padding: 16, paddingTop: 0 }}>
          <View style={{ marginTop: -40, flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
            <AvatarDisplay avatar={profile.avatar} size={80} />
            <View style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ backgroundColor: `${colors.accent}26`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ color: colors.accent, fontFamily: "monospace", fontSize: 13, fontWeight: "700" }}>{level.level}</Text>
                </View>
                <Text style={{ color: colors.muted, fontFamily: "monospace", fontSize: 12, fontWeight: "700" }}>LVL</Text>
              </View>
            </View>
          </View>
          <Text style={{ color: colors.ink, fontSize: 22, fontWeight: "700", marginTop: 8 }}>{profile.displayName}</Text>
          <Text style={{ color: colors.muted, fontSize: 14 }}>@{profile.username}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
            <Text style={{ fontSize: 20 }}>{rank.icon}</Text>
            <Text style={{ color: rank.accent, fontSize: 16, fontWeight: "800" }}>{title.current.name}</Text>
            <Text style={{ color: rank.accent, backgroundColor: `${rank.accent}22`, fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" }}>
              {title.current.rank}
            </Text>
          </View>
          {profile.motto && <Text style={{ color: colors.muted, fontStyle: "italic", fontSize: 14, marginTop: 4 }}>"{profile.motto}"</Text>}
          {profile.bio && <Text style={{ color: `${colors.ink}cc`, fontSize: 14, marginTop: 4 }}>{profile.bio}</Text>}
        </View>
      </Card>

      {/* XP Bar */}
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <XpBar level={level} nextUnlock={title.next?.name} />
      </Card>

      {/* Stats */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <StatCard icon="🏅" value={`${unlockedCount}/${totalCount}`} label="Badges" style={{ flex: 1, minWidth: 80 }} />
        <StatCard icon="🏆" value={unlockedCount} label="Achievements" style={{ flex: 1, minWidth: 80 }} />
        <StatCard icon="🔥" value={stats.maxCurrentStreak} label="Current streak" style={{ flex: 1, minWidth: 80 }} />
        <StatCard icon="🏅" value={stats.maxBestStreak} label="Longest streak" style={{ flex: 1, minWidth: 80 }} />
        <StatCard icon="🪙" value={coinBalance} label="Coins" style={{ flex: 1, minWidth: 80 }} />
      </View>

      {/* Showcase */}
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Showcase</Text>
        <ShowcaseRow label="Current title" value={`${title.current.name}`} />
        <ShowcaseRow label="Longest streak" value={`🔥 ${stats.maxBestStreak} days`} />
        {mostCompleted && <ShowcaseRow label="Most completed" value={`🔄 ${mostCompleted.name} ×${mostCompleted.count}`} />}
      </Card>

      {/* Badge collection */}
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Badge collection
      </Text>
      {unlockedDefs.length === 0 ? (
        <Card style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>No badges yet — complete habits to start earning them.</Text>
        </Card>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {unlockedDefs.map((def) => (
            <Card key={def.id} style={{ padding: 8, alignItems: "center", width: "18%" }}>
              <Text style={{ fontSize: 24 }}>{def.icon}</Text>
              <Text style={{ color: colors.faint, fontSize: 9, marginTop: 2 }} numberOfLines={1}>{def.name}</Text>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ShowcaseRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1e293b" }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
});
