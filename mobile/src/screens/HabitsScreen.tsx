import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";

import { CATEGORIES, CATEGORY_COLORS, type Category, type Habit, uid, habitStreaks, frozenSet, habitScheduleText, PRIORITY_COLOR, PRIORITY_LABEL } from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { HabitForm } from "../components/habits/HabitForm";
import { StreakFlame } from "../components/habits/StreakFlame";
import { colors } from "../lib/colors";

export default function HabitsScreen() {
  const { data, actions } = useAppData();
  const [filter, setFilter] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Habit | null>(null);

  const usedCategories = useMemo(
    () => CATEGORIES.filter((c) => data.habits.some((h) => h.category === c)),
    [data.habits],
  );
  const frozen = useMemo(() => frozenSet(data.economy), [data.economy]);
  const today = new Date();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.habits.filter(
      (h) =>
        (filter === "All" || h.category === filter) &&
        (q === "" || h.name.toLowerCase().includes(q)),
    );
  }, [data.habits, filter, query]);

  const activeHabits = filtered.filter((h) => !h.archived);
  const archivedHabits = filtered.filter((h) => h.archived);

  function save(value: any) {
    if (editing) actions.updateHabit({ ...editing, ...value });
    else actions.addHabit({ ...value, id: uid(), createdAt: new Date().toISOString(), archived: false });
    setAdding(false);
    setEditing(null);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <PageHeader
        title="Manage Habits"
        subtitle={`${data.habits.filter((h) => !h.archived).length} active`}
        action={<Button onPress={() => setAdding(true)}><Text style={{color:"#fff",fontWeight:"600"}}>+ New</Text></Button>}
      />

      {data.habits.length === 0 ? (
        <EmptyState icon="📋" title="No habits yet" hint="Create a habit with a schedule and it will show up across the app." />
      ) : (
        <>
          {/* Search + filter */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search habits…"
              placeholderTextColor={colors.faint}
              style={styles.searchInput}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <FilterChip label="All" active={filter === "All"} onPress={() => setFilter("All")} />
              {usedCategories.map((c) => (
                <FilterChip key={c} label={c} active={filter === c} onPress={() => setFilter(c)} />
              ))}
            </View>
          </ScrollView>

          {/* Active habits */}
          {activeHabits.map((h) => {
            const streak = habitStreaks(h, data.marks, today, frozen).current;
            return (
              <Card key={h.id} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CATEGORY_COLORS[h.category] }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{h.name}</Text>
                      <Text style={{ color: PRIORITY_COLOR[h.priority ?? "med"], backgroundColor: `${PRIORITY_COLOR[h.priority ?? "med"]}1a`, fontSize: 10, fontWeight: "700", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: "hidden" }}>
                        {PRIORITY_LABEL[h.priority ?? "med"]}
                      </Text>
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {h.category} · {habitScheduleText(h)}
                      {streak > 0 && ` · ${streak}🔥`}
                    </Text>
                  </View>
                  <Pressable onPress={() => { setEditing(h); }} style={styles.actionBtn}><Text style={{fontSize:14}}>✏️</Text></Pressable>
                  <Pressable onPress={() => actions.duplicateHabit(h.id)} style={styles.actionBtn}><Text style={{fontSize:14}}>📋</Text></Pressable>
                  <Pressable onPress={() => actions.setHabitArchived(h.id, true)} style={styles.actionBtn}><Text style={{fontSize:14}}>📦</Text></Pressable>
                  <Pressable onPress={() => setConfirmDelete(h)} style={styles.actionBtn}><Text style={{fontSize:14}}>🗑️</Text></Pressable>
                </View>
              </Card>
            );
          })}

          {/* Archived */}
          {archivedHabits.length > 0 && (
            <>
              <Text style={{ color: colors.faint, fontSize: 11, fontWeight: "700", marginTop: 16, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Archived
              </Text>
              {archivedHabits.map((h) => (
                <Card key={h.id} style={{ marginBottom: 8, opacity: 0.6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CATEGORY_COLORS[h.category] }} />
                    <Text style={{ color: colors.ink, fontSize: 14, flex: 1 }} numberOfLines={1}>{h.name}</Text>
                    <Pressable onPress={() => actions.setHabitArchived(h.id, false)} style={styles.actionBtn}><Text style={{fontSize:14}}>↩️</Text></Pressable>
                    <Pressable onPress={() => setConfirmDelete(h)} style={styles.actionBtn}><Text style={{fontSize:14}}>🗑️</Text></Pressable>
                  </View>
                </Card>
              ))}
            </>
          )}
        </>
      )}

      {/* Add / Edit modal */}
      <Modal open={adding || editing !== null} onClose={() => { setAdding(false); setEditing(null); }} title={editing ? "Edit habit" : "Add habit"}>
        <HabitForm
          initial={editing ?? undefined}
          onSave={save}
          onCancel={() => { setAdding(false); setEditing(null); }}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Delete habit?">
        <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
          Delete "{confirmDelete?.name}"? Its past marks stay in your history, but it will no longer be scheduled.
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" onPress={() => setConfirmDelete(null)}><Text style={{color:colors.muted}}>Cancel</Text></Button>
          <Button variant="danger" onPress={() => { if (confirmDelete) actions.deleteHabit(confirmDelete.id); setConfirmDelete(null); }}>
            <Text style={{color:"#fff",fontWeight:"600"}}>Delete</Text>
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, active && { backgroundColor: `${colors.accent}1a`, borderColor: `${colors.accent}4d` }]}
    >
      <Text style={[styles.filterText, active && { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f1f5f9",
    fontSize: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "500" },
  actionBtn: { padding: 8, borderRadius: 8 },
});
