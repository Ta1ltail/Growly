import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";

import { CATEGORY_COLORS, type Goal, uid, parseDateKey } from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { GoalForm } from "../components/ui/GoalForm";
import { colors } from "../lib/colors";

export default function GoalsScreen() {
  const { data, actions } = useAppData();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Goal | null>(null);

  function step(goal: Goal, delta: number) {
    const current = Math.max(0, Math.min(goal.target, goal.current + delta));
    const milestones = goal.milestones?.map((m) => ({ ...m, done: current >= m.at }));
    actions.updateGoal({ ...goal, current, milestones });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <PageHeader
        title="Goals"
        subtitle="Bigger targets to work toward"
        action={<Button onPress={() => setAdding(true)}><Text style={{color:"#fff",fontWeight:"600"}}>+ New</Text></Button>}
      />

      {data.goals.length === 0 ? (
        <EmptyState icon="🎯" title="No goals yet" hint='Set a target like "Workout 20 times this month" and watch the bar fill.' />
      ) : (
        data.goals.map((goal) => {
          const pct = Math.round((goal.current / goal.target) * 100);
          const complete = goal.current >= goal.target;
          return (
            <Card key={goal.id} style={{ padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "600" }}>
                    {complete ? "✅ " : ""}{goal.title}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    {goal.category && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CATEGORY_COLORS[goal.category] }} />
                        <Text style={{ color: colors.muted, fontSize: 11 }}>{goal.category}</Text>
                      </View>
                    )}
                    {goal.deadline && (
                      <Text style={{ color: colors.faint, fontSize: 11 }}>
                        🏁 {parseDateKey(goal.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <Pressable onPress={() => setEditing(goal)} style={styles.actionBtn}><Text>✏️</Text></Pressable>
                  <Pressable onPress={() => setConfirmDelete(goal)} style={styles.actionBtn}><Text>🗑️</Text></Pressable>
                </View>
              </View>

              <ProgressBar value={pct} color={complete ? "#10b981" : undefined} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <Text style={{ color: colors.muted, fontFamily: "monospace", fontSize: 12 }}>
                  {goal.current} / {goal.target} · {pct}%
                </Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Pressable onPress={() => step(goal, -1)} style={styles.stepBtn}>
                    <Text style={{ color: colors.muted, fontSize: 16 }}>−</Text>
                  </Pressable>
                  <Pressable onPress={() => step(goal, 1)} style={[styles.stepBtn, { backgroundColor: colors.accent }]}>
                    <Text style={{ color: "#fff", fontSize: 16 }}>+</Text>
                  </Pressable>
                </View>
              </View>

              {goal.milestones && goal.milestones.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: "#1e293b", marginTop: 12, paddingTop: 12 }}>
                  {goal.milestones.map((m) => (
                    <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 12 }}>{m.done ? "✅" : "⭕"}</Text>
                      <Text style={[m.done && { textDecorationLine: "line-through" }, { color: m.done ? "#10b981" : colors.muted, fontSize: 12 }]}>{m.title}</Text>
                      <Text style={{ color: colors.faint, fontFamily: "monospace", fontSize: 11, marginLeft: "auto" }}>@ {m.at}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })
      )}

      <Modal open={adding || editing !== null} onClose={() => { setAdding(false); setEditing(null); }} title={editing ? "Edit goal" : "Add goal"}>
        <GoalForm
          initial={editing ?? undefined}
          habits={data.habits.filter((h) => !h.archived)}
          onSave={(goal: Goal) => {
            if (editing) actions.updateGoal(goal);
            else actions.addGoal(goal);
            setAdding(false);
            setEditing(null);
          }}
          onCancel={() => { setAdding(false); setEditing(null); }}
        />
      </Modal>

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Delete goal?">
        <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>Delete "{confirmDelete?.title}"? This cannot be undone.</Text>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" onPress={() => setConfirmDelete(null)}><Text style={{color:colors.muted}}>Cancel</Text></Button>
          <Button variant="danger" onPress={() => { if (confirmDelete) actions.deleteGoal(confirmDelete.id); setConfirmDelete(null); }}>
            <Text style={{color:"#fff"}}>Delete</Text>
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  actionBtn: { padding: 6, borderRadius: 8 },
  stepBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: "#334155", alignItems: "center", justifyContent: "center" },
});
