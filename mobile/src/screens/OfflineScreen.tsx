import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../lib/colors";

export default function OfflineScreen() {
  return (
    <View style={styles.container}>
      <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Text style={{ fontSize: 28 }}>📡</Text>
      </View>
      <Text style={{ color: colors.ink, fontSize: 22, fontWeight: "700", marginBottom: 8 }}>You're offline</Text>
      <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", maxWidth: 280 }}>
        Your habits and progress are saved locally and will sync when you're back online.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center", padding: 32 },
});
