import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";

import { ACCENTS, type ThemeMode } from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { colors } from "../lib/colors";

const MODES: { id: ThemeMode; label: string; icon: string }[] = [
  { id: "light", label: "Light", icon: "☀️" },
  { id: "dark", label: "Dark", icon: "🌙" },
  { id: "system", label: "System", icon: "💻" },
];

const GRACE_OPTIONS = [0, 3, 5, 8];

export default function SettingsScreen() {
  const { data, actions } = useAppData();
  const { mode, accent } = data.settings.theme;
  const grace = data.settings.graceHours ?? 5;
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <PageHeader title="Settings" subtitle="Appearance, tracking rules, and your data" />

      {/* Appearance */}
      <Section title="🎨 Appearance">
        <Card style={{ padding: 16 }}>
          <Text style={styles.sectionLabel}>Theme</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {MODES.map(({ id, label, icon }) => (
              <Pressable
                key={id}
                onPress={() => actions.setTheme({ mode: id })}
                style={[styles.modeBtn, mode === id && { borderColor: colors.accent, backgroundColor: `${colors.accent}1a` }]}
              >
                <Text style={{ fontSize: 20 }}>{icon}</Text>
                <Text style={[styles.modeLabel, mode === id && { color: colors.accent }]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Accent color</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ACCENTS.map((a) => {
              const activeAccent = accent === a.id;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => actions.setTheme({ accent: a.id })}
                  style={[styles.accentBtn, { backgroundColor: a.color }, activeAccent && { borderWidth: 3, borderColor: "#fff" }]}
                />
              );
            })}
          </View>
        </Card>
      </Section>

      {/* Honest Tracking */}
      <Section title="🛡️ Honest Tracking">
        <Card style={{ padding: 16 }}>
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
            Past days lock automatically so streaks and stats stay honest.
          </Text>
          <Text style={styles.sectionLabel}>Grace window (hours after midnight)</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {GRACE_OPTIONS.map((h) => (
              <Pressable
                key={h}
                onPress={() => actions.setGraceHours(h)}
                style={[styles.graceBtn, grace === h && { backgroundColor: colors.accent }]}
              >
                <Text style={{ color: grace === h ? "#fff" : colors.muted, fontSize: 12, fontWeight: "600" }}>
                  {h === 0 ? "Off" : `${h}h`}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      </Section>

      {/* Custom Categories */}
      <Section title="🏷️ Custom Categories">
        <Card style={{ padding: 16 }}>
          <CustomCategoryEditor />
        </Card>
      </Section>

      {/* Data */}
      <Section title="📥 Data">
        <Card style={{ overflow: "hidden" }}>
          <Pressable style={styles.dataRow}>
            <Text style={styles.dataLabel}>📥 Export marks (CSV)</Text>
          </Pressable>
          <Pressable style={styles.dataRow}>
            <Text style={styles.dataLabel}>📥 Download backup (JSON)</Text>
          </Pressable>
          <Pressable style={styles.dataRow}>
            <Text style={styles.dataLabel}>📤 Import backup (JSON)</Text>
          </Pressable>
          <Pressable onPress={() => setConfirmReset(true)} style={[styles.dataRow, { backgroundColor: "rgba(244,63,94,0.1)" }]}>
            <Text style={{ color: "#f43f5e", fontSize: 14 }}>🗑️ Reset all data</Text>
          </Pressable>
        </Card>
      </Section>

      {/* Audit log */}
      <Section title="📜 Audit log">
        {data.auditLog.length === 0 ? (
          <Card style={{ padding: 16 }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>No changes recorded yet.</Text>
          </Card>
        ) : (
          <Card style={{ overflow: "hidden" }}>
            {data.auditLog.slice(0, 50).map((e) => (
              <View key={e.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1e293b" }}>
                <Text style={{ color: colors.ink, fontSize: 13, flex: 1 }}>{e.summary}</Text>
                <Text style={{ color: colors.faint, fontFamily: "monospace", fontSize: 10 }}>
                  {new Date(e.at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </Section>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?">
        <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
          This deletes all habits, marks, notes, goals, and history on this device. This cannot be undone.
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" onPress={() => setConfirmReset(false)}><Text style={{color:colors.muted}}>Cancel</Text></Button>
          <Button variant="danger" onPress={() => { actions.replaceData(require("../lib/storage").emptyData); setConfirmReset(false); }}>
            <Text style={{color:"#fff",fontWeight:"600"}}>Delete everything</Text>
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
}

function CustomCategoryEditor() {
  const { data, actions } = useAppData();
  const [name, setName] = useState("");
  const customCats = data.settings.customCategories ?? [];

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    actions.addCustomCategory(trimmed);
    setName("");
  };

  return (
    <View>
      {customCats.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {customCats.map((cat) => (
            <View key={cat} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ backgroundColor: "#1e293b", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, color: colors.muted, fontSize: 12 }}>
                {cat}
              </Text>
              <Pressable onPress={() => actions.removeCustomCategory(cat)} style={{ padding: 4 }}>
                <Text style={{ color: "#ef4444", fontSize: 14 }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New category name"
          placeholderTextColor={colors.faint}
          maxLength={24}
          style={[styles.input, { flex: 1 }]}
        />
        <Button onPress={handleAdd} disabled={!name.trim()} size="sm">
          <Text style={{ color: "#fff", fontWeight: "600" }}>+ Add</Text>
        </Button>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  modeBtn: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#334155" },
  modeLabel: { color: colors.muted, fontSize: 12, fontWeight: "500" },
  accentBtn: { width: 40, height: 40, borderRadius: 20 },
  graceBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#334155" },
  dataRow: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  dataLabel: { color: colors.ink, fontSize: 14 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#f1f5f9",
    fontSize: 14,
  },
});
