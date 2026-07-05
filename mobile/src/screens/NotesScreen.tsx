import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal as RNModal,
  StyleSheet,
  Platform,
} from "react-native";

import { type Note, type NoteLinks, uid, parseDateKey } from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { colors } from "../lib/colors";

export default function NotesScreen() {
  const { data, actions } = useAppData();
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const habitName = useMemo(() => new Map(data.habits.map((h) => [h.id, h.name])), [data.habits]);
  const goalTitle = useMemo(() => new Map(data.goals.map((g) => [g.id, g.title])), [data.goals]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of data.notes) for (const t of n.tags) set.add(t);
    return [...set].sort();
  }, [data.notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.notes
      .filter((n) => (tagFilter ? n.tags.includes(tagFilter) : true))
      .filter((n) => q ? n.body.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)) : true)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [data.notes, query, tagFilter]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <PageHeader
        title="Notes"
        subtitle={`${data.notes.length} note${data.notes.length === 1 ? "" : "s"}`}
        action={<Button onPress={() => setAdding(true)}><Text style={{color:"#fff",fontWeight:"600"}}>+ New</Text></Button>}
      />

      {data.notes.length === 0 ? (
        <EmptyState icon="📝" title="No notes yet" hint="Capture reflections, missed-task reasons, or weekly reviews." />
      ) : (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search notes…"
            placeholderTextColor={colors.faint}
            style={styles.searchInput}
          />

          {allTags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TagChip label="All" active={tagFilter === null} onPress={() => setTagFilter(null)} />
                {allTags.map((t) => (
                  <TagChip key={t} label={t} active={tagFilter === t} onPress={() => setTagFilter(t)} />
                ))}
              </View>
            </ScrollView>
          )}

          {filtered.length === 0 ? (
            <Card style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ color: colors.muted, fontSize: 14 }}>No notes match your filters.</Text>
            </Card>
          ) : (
            filtered.map((n) => (
              <Pressable key={n.id} onPress={() => setEditing(n)} style={{ marginBottom: 8 }}>
                <Card style={{ padding: 16 }}>
                  {n.links.date && (
                    <Text style={{ color: colors.faint, fontSize: 10, marginBottom: 4 }}>
                      📅 {parseDateKey(n.links.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </Text>
                  )}
                  <Text style={{ color: colors.ink, fontSize: 14, lineHeight: 20 }} numberOfLines={12}>
                    {n.body || <Text style={{ color: colors.faint, fontStyle: "italic" }}>Empty note</Text>}
                  </Text>
                  {(n.tags.length > 0 || n.links.habitId || n.links.goalId) && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8, borderTopWidth: 1, borderTopColor: "rgba(51,65,85,0.4)", paddingTop: 8 }}>
                      {n.links.habitId && habitName.has(n.links.habitId) && (
                        <Text style={styles.tagPill}>📋 {habitName.get(n.links.habitId)}</Text>
                      )}
                      {n.links.goalId && goalTitle.has(n.links.goalId) && (
                        <Text style={styles.tagPill}>🎯 {goalTitle.get(n.links.goalId)}</Text>
                      )}
                      {n.tags.map((t) => (
                        <Text key={t} style={styles.tagPill}>🏷️ {t}</Text>
                      ))}
                    </View>
                  )}
                </Card>
              </Pressable>
            ))
          )}
        </>
      )}

      <Modal open={adding || editing !== null} onClose={() => { setAdding(false); setEditing(null); }} title={editing ? "Edit note" : "New note"}>
        <NoteEditor
          initial={editing ?? undefined}
          habits={data.habits.filter((h) => !h.archived)}
          goals={data.goals}
          onSave={(draft: { body: string; tags: string[]; links: NoteLinks }) => {
            if (editing) actions.updateNote(editing.id, draft);
            else actions.addNote(draft);
            setAdding(false);
            setEditing(null);
          }}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onDelete={editing ? () => { actions.deleteNote(editing.id); setEditing(null); } : undefined}
        />
      </Modal>
    </ScrollView>
  );
}

function TagChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: active ? `${colors.accent}4d` : "#334155", backgroundColor: active ? `${colors.accent}1a` : "transparent" }}
    >
      <Text style={{ color: active ? colors.accent : colors.muted, fontSize: 11, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );
}

function NoteEditor({
  initial, habits, goals, onSave, onCancel, onDelete,
}: {
  initial?: Note;
  habits: { id: string; name: string }[];
  goals: { id: string; title: string }[];
  onSave: (draft: { body: string; tags: string[]; links: NoteLinks }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [body, setBody] = useState(initial?.body ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [habitId, setHabitId] = useState(initial?.links.habitId ?? "");
  const [goalId, setGoalId] = useState(initial?.links.goalId ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function submit() {
    if (!body.trim()) return;
    onSave({
      body: body.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      links: {
        ...(initial?.links.date ? { date: initial.links.date } : {}),
        ...(habitId ? { habitId } : {}),
        ...(goalId ? { goalId } : {}),
      },
    });
  }

  return (
    <View>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Write a note…"
        placeholderTextColor={colors.faint}
        multiline
        numberOfLines={6}
        style={styles.textarea}
      />
      <TextInput
        value={tags}
        onChangeText={setTags}
        placeholder="comma, separated, tags"
        placeholderTextColor={colors.faint}
        style={styles.input}
      />
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Link habit</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <TagChip label="None" active={habitId === ""} onPress={() => setHabitId("")} />
        {habits.map((h) => (
          <TagChip key={h.id} label={h.name} active={habitId === h.id} onPress={() => setHabitId(h.id)} />
        ))}
      </View>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Link goal</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        <TagChip label="None" active={goalId === ""} onPress={() => setGoalId("")} />
        {goals.map((g) => (
          <TagChip key={g.id} label={g.title} active={goalId === g.id} onPress={() => setGoalId(g.id)} />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {onDelete ? (
          confirmDelete ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={onDelete} style={{ padding: 8 }}><Text style={{color:"#f43f5e",fontWeight:"600",fontSize:13}}>Confirm</Text></Pressable>
              <Pressable onPress={() => setConfirmDelete(false)} style={{ padding: 8 }}><Text style={{color:colors.muted,fontSize:13}}>Cancel</Text></Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmDelete(true)} style={{ padding: 8 }}><Text style={{color:"#f43f5e",fontWeight:"500",fontSize:13}}>🗑️ Delete</Text></Pressable>
          )
        ) : <View />}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button variant="ghost" onPress={onCancel}><Text style={{color:colors.muted}}>Cancel</Text></Button>
          <Button onPress={submit} disabled={!body.trim()}><Text style={{color:"#fff",fontWeight:"600"}}>💾 Save</Text></Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f1f5f9",
    fontSize: 14,
  },
  textarea: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f1f5f9",
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 12,
  },
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
  tagPill: {
    backgroundColor: "rgba(51,65,85,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 10,
    color: colors.faint,
    overflow: "hidden",
  },
});
