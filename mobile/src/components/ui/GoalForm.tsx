import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import { CATEGORIES, CATEGORY_COLORS, type Goal, type Habit, type Milestone, type Category, uid } from "@project101/shared";
import { colors } from "../../lib/colors";
import { Button } from "./Button";

interface GoalFormProps {
  initial?: Goal;
  habits: Habit[];
  onSave: (goal: Goal) => void;
  onCancel: () => void;
}

export function GoalForm({ initial, habits, onSave, onCancel }: GoalFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [target, setTarget] = useState(initial?.target ?? 20);
  const [category, setCategory] = useState<string>(initial?.category ?? "");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [linked, setLinked] = useState<string[]>(initial?.linkedHabitIds ?? []);
  const [milestones, setMilestones] = useState<Milestone[]>(initial?.milestones ?? []);
  const [msTitle, setMsTitle] = useState("");
  const [msAt, setMsAt] = useState("");

  function toggleLinked(id: string) {
    setLinked((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function addMilestone() {
    if (!msTitle.trim() || !msAt || parseInt(msAt) <= 0) return;
    setMilestones((prev) => [
      ...prev,
      { id: uid(), title: msTitle.trim(), at: parseInt(msAt), done: false },
    ].sort((a, b) => a.at - b.at));
    setMsTitle("");
    setMsAt("");
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || target < 1) return;
    onSave({
      id: initial?.id ?? uid(),
      title: trimmed,
      target,
      current: initial?.current ?? 0,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      category: (category || undefined) as Category | undefined,
      deadline: deadline || undefined,
      linkedHabitIds: linked.length ? linked : undefined,
      milestones: milestones.length ? milestones : undefined,
    });
  }

  return (
    <ScrollView style={{ maxHeight: 400 }}>
      <Text style={styles.label}>Goal</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Read 12 books this year"
        placeholderTextColor={colors.faint}
        style={styles.input}
      />

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Target</Text>
          <TextInput
            value={String(target)}
            onChangeText={(v) => { const n = parseInt(v); if (!isNaN(n)) setTarget(n); }}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Deadline</Text>
          <TextInput
            value={deadline}
            onChangeText={setDeadline}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.faint}
            style={styles.input}
          />
        </View>
      </View>

      <Text style={styles.label}>Category</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <CategoryChip label="None" color={undefined} active={category === ""} onPress={() => setCategory("")} />
        {CATEGORIES.map((c) => (
          <CategoryChip key={c} label={c} color={CATEGORY_COLORS[c]} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>

      <Text style={styles.label}>Linked habits</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {habits.map((h) => {
          const active = linked.includes(h.id);
          return (
            <Pressable
              key={h.id}
              onPress={() => toggleLinked(h.id)}
              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: active ? `${colors.accent}4d` : "#334155", backgroundColor: active ? `${colors.accent}1a` : "transparent" }}
            >
              <Text style={{ color: active ? colors.accent : colors.muted, fontSize: 12, fontWeight: "500" }}>{h.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Milestones</Text>
      {milestones.map((m) => (
        <View key={m.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
          <Text style={{ color: colors.ink, fontSize: 13 }}>
            {m.title} <Text style={{ color: colors.muted, fontFamily: "monospace" }}>@ {m.at}</Text>
          </Text>
          <Pressable onPress={() => setMilestones((prev) => prev.filter((x) => x.id !== m.id))}>
            <Text style={{ color: "#f43f5e", fontSize: 14 }}>✕</Text>
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <TextInput
          value={msTitle}
          onChangeText={setMsTitle}
          placeholder="Milestone title"
          placeholderTextColor={colors.faint}
          style={[styles.input, { flex: 1 }]}
        />
        <TextInput
          value={msAt}
          onChangeText={setMsAt}
          placeholder="at"
          placeholderTextColor={colors.faint}
          keyboardType="numeric"
          style={[styles.input, { width: 60 }]}
        />
        <Pressable onPress={addMilestone} style={{ padding: 8 }}>
          <Text style={{ color: colors.accent, fontSize: 20 }}>+</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
        <Button variant="ghost" onPress={onCancel}>
          <Text style={{ color: colors.muted }}>Cancel</Text>
        </Button>
        <Button onPress={submit} disabled={!title.trim()}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>{initial ? "Save goal" : "Add goal"}</Text>
        </Button>
      </View>
    </ScrollView>
  );
}

function CategoryChip({ label, color, active, onPress }: { label: string; color?: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: active ? "transparent" : "#334155", backgroundColor: active && color ? color : active ? `${colors.accent}1a` : "transparent" }}
    >
      <Text style={{ color: active && color ? "#fff" : active ? colors.accent : colors.muted, fontSize: 12, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 11, fontWeight: "700", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#f1f5f9",
    fontSize: 14,
    marginBottom: 12,
  },
});
