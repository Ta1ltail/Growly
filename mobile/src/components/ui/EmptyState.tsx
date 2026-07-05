// Mobile EmptyState — friendly empty state with icon, message, optional action.
// Simpler than the web version (no SVG illustrations) for the initial mobile build.

import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { colors } from "../../lib/colors";

interface Props {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, hint, action }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line,
    backgroundColor: colors.surface + "80",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.ink,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },
  action: {
    marginTop: 20,
  },
});
