// Mobile StreakFlame — displays current streak with flame icon that changes
// color based on streak length. Simpler than the web version (no CSS animations).

import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type FlameTier = "none" | "small" | "medium" | "large";

const TIER_COLORS: Record<Exclude<FlameTier, "none">, string> = {
  small: "#fb923c",
  medium: "#f97316",
  large: "#ef4444",
};

interface Props {
  streak: number;
  size?: number;
  showCount?: boolean;
}

function flameTier(streak: number): FlameTier {
  if (streak <= 0) return "none";
  if (streak < 7) return "small";
  if (streak < 30) return "medium";
  return "large";
}

export function StreakFlame({ streak, size = 16, showCount = true }: Props) {
  const tier = flameTier(streak);
  if (tier === "none") return null;

  const color = TIER_COLORS[tier];

  return (
    <View style={styles.container}>
      <Text style={[styles.flame, { fontSize: size, color }]}>🔥</Text>
      {showCount && (
        <Text style={[styles.count, { fontSize: size * 0.75, color }]}>
          {streak}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  flame: {
    textAlign: "center",
  },
  count: {
    fontWeight: "700",
    fontFamily: "monospace",
  },
});
