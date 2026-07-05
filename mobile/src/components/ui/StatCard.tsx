// Mobile StatCard — compact stat tile: icon, big value, label.
// Matches the web's StatCard component.

import React from "react";
import { StyleSheet, View, Text, type ViewStyle } from "react-native";
import { colors } from "../../lib/colors";

interface Props {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent?: boolean;
  style?: ViewStyle;
}

export function StatCard({ icon, value, label, accent, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconWrapper, accent && styles.iconAccent]}>
        {icon}
      </View>
      <Text style={styles.value}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface + "CC",
    padding: 16,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconAccent: {
    backgroundColor: colors.accent + "26",
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "monospace",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});
