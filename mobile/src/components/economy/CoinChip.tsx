import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { colors } from "../../lib/colors";

interface CoinChipProps {
  amount: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CoinChip({ amount, size = "md" }: CoinChipProps) {
  const isLg = size === "lg";
  const isSm = size === "sm";
  const padV = isLg ? 8 : isSm ? 4 : 6;
  const padH = isLg ? 14 : isSm ? 8 : 10;
  const fontSize = isLg ? 16 : isSm ? 12 : 14;
  const iconSize = isLg ? 20 : isSm ? 14 : 16;

  return (
    <View
      style={[
        styles.chip,
        { paddingVertical: padV, paddingHorizontal: padH },
      ]}
      accessibilityLabel={`${amount} coins`}
    >
      <Text style={[styles.coinIcon, { fontSize: iconSize }]}>🪙</Text>
      <Text style={[styles.amount, { fontSize }]}>{amount.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  coinIcon: { opacity: 0.8 },
  amount: {
    color: "#f59e0b",
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
