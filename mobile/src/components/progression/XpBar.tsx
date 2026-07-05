import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { LevelInfo } from "@project101/shared";
import { ProgressBar } from "../ui/ProgressBar";
import { colors } from "../../lib/colors";

interface XpBarProps {
  level: LevelInfo;
  nextUnlock?: string;
}

export function XpBar({ level, nextUnlock }: XpBarProps) {
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.levelRow}>
          <Text style={styles.levelNum}>{level.level}</Text>
          <Text style={styles.levelLabel}>Level</Text>
        </View>
        <Text style={styles.xpText}>
          {level.isMax ? "MAX" : `${level.xpIntoLevel} / ${level.xpForNext.toLocaleString()} XP`}
        </Text>
      </View>
      <ProgressBar value={level.progressPct} />
      <View style={styles.footer}>
        <Text style={styles.totalXp}>{level.totalXp.toLocaleString()} XP total</Text>
        {!level.isMax && (
          <Text style={styles.nextXp}>
            ✨ {level.xpToNext.toLocaleString()} XP to Lv {level.level + 1}
            {nextUnlock ? ` · ${nextUnlock}` : ""}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6 },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelNum: {
    backgroundColor: `${colors.accent}26`,
    color: colors.accent,
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "700",
    width: 36,
    height: 36,
    textAlign: "center",
    lineHeight: 36,
    borderRadius: 12,
    overflow: "hidden",
  },
  levelLabel: { color: colors.muted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  xpText: {
    color: colors.faint,
    fontFamily: "monospace",
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  totalXp: { color: colors.muted, fontFamily: "monospace", fontSize: 11 },
  nextXp: { color: colors.muted, fontSize: 11, flexDirection: "row", alignItems: "center", gap: 4 },
});
