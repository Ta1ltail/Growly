import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../../lib/colors";
import { Card } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { useAppData } from "../../lib/AppProvider";

export function DailyQuestCard() {
  const { data, actions } = useAppData();
  const quest = data.economy.currentQuest;

  useEffect(() => {
    actions.refreshDailyQuest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!quest) return null;

  const claimed = quest.claimed === true;
  const completed = quest.current >= quest.target;
  const progressPct = Math.min(100, Math.round((quest.current / quest.target) * 100));

  return (
    <Card style={styles.card}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Daily Quest</Text>
          {quest.category && (
            <Text style={styles.category}>{quest.category}</Text>
          )}
        </View>

        <Text style={styles.description}>{quest.description}</Text>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            Progress: <Text style={styles.progressNum}>{quest.current}</Text>
            <Text style={styles.faint}>/{quest.target}</Text>
          </Text>
          <Text style={styles.reward}>🪙 +{quest.reward}</Text>
        </View>

        <ProgressBar value={progressPct} color={completed ? "#10b981" : undefined} />

        {completed && !claimed && (
          <Pressable
            onPress={() => actions.claimDailyQuest()}
            style={({ pressed }) => [styles.claimBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.claimText}>🪙 Claim {quest.reward} coins</Text>
          </Pressable>
        )}

        {claimed && (
          <View style={styles.claimedRow}>
            <Text style={styles.claimedText}>✅ Claimed +{quest.reward} 🪙</Text>
            <Text style={styles.resetText}>🔄 Resets at midnight</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  inner: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  category: {
    backgroundColor: `${colors.accent}1a`,
    color: colors.accent,
    fontSize: 10,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  description: { color: "#f1f5f9", fontSize: 14, fontWeight: "500" },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 4 },
  progressText: { color: colors.muted, fontSize: 12 },
  progressNum: { fontWeight: "700", fontFamily: "monospace" },
  faint: { color: colors.faint },
  reward: { color: "#f59e0b", fontWeight: "500", fontSize: 12 },
  claimBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  claimText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  claimedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  claimedText: { color: "#10b981", fontWeight: "600", fontSize: 13 },
  resetText: { color: colors.muted, fontSize: 10 },
});
