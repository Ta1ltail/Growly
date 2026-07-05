// Mobile HabitForm — add/edit habit form with all fields.
// Used inside a Modal. Pass `initial` to edit; omit to create.

import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
} from "react-native";
import {
  CATEGORIES,
  CATEGORY_COLORS,
  dateKey,
  PRIORITY_LABEL,
  effectiveRecurrence,
} from "@project101/shared";
import type {
  Habit,
  HabitFormValue,
  Priority,
  Recurrence,
} from "@project101/shared";
import { colors } from "../../lib/colors";
import { WeekdayPicker } from "./WeekdayPicker";

type Kind = Recurrence["kind"];

interface Props {
  initial?: Habit;
  onSave: (value: HabitFormValue) => void;
  onCancel: () => void;
}

const KINDS: { value: Kind; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const PRIORITIES: Priority[] = ["low", "med", "high"];

export function HabitForm({ initial, onSave, onCancel }: Props) {
  const initRec = initial
    ? effectiveRecurrence(initial)
    : { kind: "daily" as const };

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<string>(
    initial?.category ?? "Workout",
  );
  const [kind, setKind] = useState<Kind>(initRec.kind);
  const [weekdays, setWeekdays] = useState<number[]>(
    initRec.kind === "weekly" ? initRec.weekdays : (initial?.repeatDays ?? []),
  );
  const [monthDays, setMonthDays] = useState<number[]>(
    initRec.kind === "monthly" ? initRec.monthDays : [],
  );
  const [startDate, setStartDate] = useState(
    initial?.startDate ?? dateKey(new Date()),
  );
  const [timeOfDay, setTimeOfDay] = useState(initial?.timeOfDay ?? "");
  const [priority, setPriority] = useState<Priority>(
    initial?.priority ?? "med",
  );
  const [reminderOn, setReminderOn] = useState(
    initial?.reminder?.enabled ?? false,
  );
  const [reminderTime, setReminderTime] = useState(
    initial?.reminder?.time ?? "08:00",
  );

  function buildRecurrence(): Recurrence {
    if (kind === "daily") return { kind: "daily" };
    if (kind === "weekly") return { kind: "weekly", weekdays };
    return { kind: "monthly", monthDays };
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const recurrence = buildRecurrence();
    onSave({
      name: trimmed,
      category: category as any,
      recurrence,
      repeatDays: recurrence.kind === "weekly" ? weekdays : [],
      startDate,
      timeOfDay: timeOfDay || undefined,
      priority,
      reminder: reminderOn ? { enabled: true, time: reminderTime } : undefined,
    });
  }

  function toggleMonthDay(d: number) {
    setMonthDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  return (
    <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
      {/* Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          onSubmitEditing={submit}
          placeholder="e.g. Morning run"
          placeholderTextColor={colors.faint}
          style={styles.input}
        />
      </View>

      {/* Category */}
      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.categoryChip,
                  active && { backgroundColor: CATEGORY_COLORS[c as keyof typeof CATEGORY_COLORS] },
                ]}
              >
                <View
                  style={[
                    styles.categoryDot,
                    { backgroundColor: CATEGORY_COLORS[c as keyof typeof CATEGORY_COLORS] },
                    active && { backgroundColor: colors.white },
                  ]}
                />
                <Text
                  style={[
                    styles.categoryText,
                    active && { color: colors.white },
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Recurrence */}
      <View style={styles.field}>
        <Text style={styles.label}>Repeat</Text>
        <View style={styles.kindRow}>
          {KINDS.map((k) => (
            <Pressable
              key={k.value}
              onPress={() => setKind(k.value)}
              style={[styles.kindBtn, kind === k.value && styles.kindActive]}
            >
              <Text style={[styles.kindText, kind === k.value && styles.kindTextActive]}>
                {k.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {kind === "weekly" && (
          <View style={styles.subField}>
            <WeekdayPicker value={weekdays} onChange={setWeekdays} />
          </View>
        )}
        {kind === "monthly" && (
          <View style={styles.monthGrid}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
              const active = monthDays.includes(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => toggleMonthDay(d)}
                  style={[styles.monthDay, active && styles.monthDayActive]}
                >
                  <Text style={[styles.monthDayText, active && styles.monthDayTextActive]}>
                    {d}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Start date & Time */}
      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Start date</Text>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.faint}
            style={styles.input}
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Time of day</Text>
          <TextInput
            value={timeOfDay}
            onChangeText={setTimeOfDay}
            placeholder="HH:MM"
            placeholderTextColor={colors.faint}
            style={styles.input}
          />
        </View>
      </View>

      {/* Priority */}
      <View style={styles.field}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.kindRow}>
          {PRIORITIES.map((p) => (
            <Pressable
              key={p}
              onPress={() => setPriority(p)}
              style={[styles.kindBtn, priority === p && styles.kindActive]}
            >
              <Text style={[styles.kindText, priority === p && styles.kindTextActive]}>
                {PRIORITY_LABEL[p]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Reminder toggle */}
      <View style={styles.reminderRow}>
        <Text style={styles.label}>Reminder</Text>
        <Switch
          value={reminderOn}
          onValueChange={setReminderOn}
          trackColor={{ false: colors.surface2, true: colors.accent + "60" }}
          thumbColor={reminderOn ? colors.accent : colors.muted}
        />
      </View>
      {reminderOn && (
        <TextInput
          value={reminderTime}
          onChangeText={setReminderTime}
          placeholder="HH:MM"
          placeholderTextColor={colors.faint}
          style={[styles.input, { marginTop: 8 }]}
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={!name.trim()}
          style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
        >
          <Text style={styles.saveText}>
            {initial ? "Save changes" : "Add habit"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: {
    flex: 1,
  },
  formContent: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  subField: {
    marginTop: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,

  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.muted,
  },
  kindRow: {
    flexDirection: "row",
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    padding: 4,
  },
  kindBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  kindActive: {
    backgroundColor: colors.accent,
  },
  kindText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.muted,
  },
  kindTextActive: {
    color: colors.white,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  monthDay: {
    width: 36,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  monthDayActive: {
    backgroundColor: colors.accent,
  },
  monthDayText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.muted,
  },
  monthDayTextActive: {
    color: colors.white,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
    marginBottom: 32,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.muted,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
});
