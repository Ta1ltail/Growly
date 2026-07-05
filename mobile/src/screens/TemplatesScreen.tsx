import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { CATEGORY_COLORS, type Category, uid, dateKey } from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { colors } from "../lib/colors";

const EXTENDED_TEMPLATES = [
  {
    id: "gym", name: "Gym Rat", description: "Your classic 5-day push/pull/legs split.",
    habits: [
      { name: "Push day (chest/shoulders/tris)", category: "Workout" as Category, repeatDays: [1, 4] },
      { name: "Pull day (back/biceps)", category: "Workout" as Category, repeatDays: [2, 5] },
      { name: "Leg day", category: "Workout" as Category, repeatDays: [3] },
    ],
  },
  {
    id: "morning", name: "Morning Person", description: "Rise and grind: wake up early and own the morning.",
    habits: [
      { name: "Wake up by 6:30am", category: "Lifestyle" as Category, repeatDays: [] },
      { name: "Morning stretch 5 min", category: "Health" as Category, repeatDays: [] },
      { name: "Read 10 pages", category: "Studies" as Category, repeatDays: [] },
      { name: "Plan the day", category: "Personal" as Category, repeatDays: [] },
    ],
  },
  {
    id: "wellbeing", name: "Wellbeing", description: "Reduce stress and find calm in your daily life.",
    habits: [
      { name: "Meditate 10 min", category: "Health" as Category, repeatDays: [] },
      { name: "Journal 5 min", category: "Personal" as Category, repeatDays: [] },
      { name: "No phone 30 min before bed", category: "Lifestyle" as Category, repeatDays: [] },
    ],
  },
  {
    id: "productivity-max", name: "Productivity Max", description: "Crush your work goals with laser focus.",
    habits: [
      { name: "Pomodoro 4x sessions", category: "Work" as Category, repeatDays: [1, 2, 3, 4, 5] },
      { name: "Top 3 priorities list", category: "Personal" as Category, repeatDays: [] },
      { name: "No social media until noon", category: "Lifestyle" as Category, repeatDays: [1, 2, 3, 4, 5] },
    ],
  },
  {
    id: "health-optimizer", name: "Health Optimizer", description: "Transform your physical and mental well-being.",
    habits: [
      { name: "Workout 30 min", category: "Workout" as Category, repeatDays: [1, 2, 4, 5] },
      { name: "Drink 8 glasses water", category: "Health" as Category, repeatDays: [] },
      { name: "Sleep 8 hours", category: "Health" as Category, repeatDays: [] },
      { name: "Walk 10k steps", category: "Workout" as Category, repeatDays: [] },
    ],
  },
  {
    id: "creative-spark", name: "Creative Spark", description: "Nurture your creative side.",
    habits: [
      { name: "Create something (write/draw/build)", category: "Hobbies" as Category, repeatDays: [] },
      { name: "Learn a new skill 30 min", category: "Studies" as Category, repeatDays: [1, 3, 5] },
      { name: "Read inspiring content", category: "Hobbies" as Category, repeatDays: [] },
    ],
  },
];

export default function TemplatesScreen() {
  const { data, actions } = useAppData();
  const used = new Set(data.settings.usedTemplateIds ?? []);
  const available = EXTENDED_TEMPLATES.filter((t) => !used.has(t.id));
  const usedTemplates = EXTENDED_TEMPLATES.filter((t) => used.has(t.id));
  const [preview, setPreview] = useState<typeof EXTENDED_TEMPLATES[number] | null>(null);

  function applyTemplate(template: typeof EXTENDED_TEMPLATES[number]) {
    const stamp = new Date().toISOString();
    for (const h of template.habits) {
      actions.addHabit({
        id: uid(),
        name: h.name,
        category: h.category,
        repeatDays: h.repeatDays,
        createdAt: stamp,
        startDate: dateKey(new Date()),
        priority: "med",
        recurrence: h.repeatDays.length === 0
          ? { kind: "daily" }
          : { kind: "weekly", weekdays: h.repeatDays },
        timeOfDay: undefined,
        archived: false,
      });
    }
    actions.markTemplateUsed(template.id);
    setPreview(null);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <PageHeader title="Templates" subtitle="Quick-start routines" />

      {available.length === 0 ? (
        <EmptyState icon="📐" title="All templates used" hint="You've applied every starter routine." />
      ) : (
        available.map((template) => (
          <Card key={template.id} style={{ padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.accent}1a`, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 20 }}>📐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "600" }}>{template.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{template.description}</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {template.habits.map((h) => (
                <View key={h.name} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: "#334155" }}>
                  <Text style={{ color: colors.muted, fontSize: 10 }}>
                    ● {h.name}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Button size="sm" onPress={() => applyTemplate(template)} style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>+ Add</Text>
              </Button>
              <Pressable onPress={() => setPreview(template)} style={{ width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: "#334155", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16 }}>👁️</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}

      {usedTemplates.length > 0 && (
        <>
          <Text style={{ color: colors.faint, fontSize: 11, fontWeight: "700", marginTop: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Used templates
          </Text>
          {usedTemplates.map((t) => (
            <Card key={t.id} style={{ padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 14 }}>✅</Text>
                <Text style={{ color: colors.ink, fontSize: 14, flex: 1 }}>{t.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{t.description}</Text>
              </View>
            </Card>
          ))}
        </>
      )}

      <Modal open={preview !== null} onClose={() => setPreview(null)} title={preview?.name ?? ""}>
        {preview && (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>{preview.description}</Text>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Habits ({preview.habits.length})
            </Text>
            {preview.habits.map((h, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#1e293b", borderRadius: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CATEGORY_COLORS[h.category] }} />
                <Text style={{ color: colors.ink, fontSize: 13, flex: 1 }}>{h.name}</Text>
                <Text style={{ color: colors.faint, fontSize: 11 }}>
                  {h.repeatDays.length === 0 ? "Daily" : `${h.repeatDays.length} days/wk`}
                </Text>
              </View>
            ))}
            <Button onPress={() => { applyTemplate(preview); }}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>+ Add this template</Text>
            </Button>
          </View>
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
});
