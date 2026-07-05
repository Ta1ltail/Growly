// TrackerScreen — habits list with today's mark buttons and category filter.
// Past days lock automatically per the Honest Tracking Policy.

import React, { useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import {
  CATEGORIES,
  CATEGORY_COLORS,
  isScheduled,
  canEditMark,
  habitStreaks,
  frozenSet,
  dateKey,
} from "@project101/shared";
import type { Habit, MarkStatus } from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { colors } from "../lib/colors";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { MarkButton } from "../components/habits/MarkButton";
import { StreakFlame } from "../components/habits/StreakFlame";

export default function TrackerScreen() {
  const { data, isLoading, actions } = useAppData();
  const today = useMemo(() => new Date(), []);
  const grace = data.settings.graceHours ?? 5;
  const frozen = useMemo(() => frozenSet(data.economy), [data.economy]);

  const [filter, setFilter] = useState<string | "All">("All");

  const activeHabits = useMemo(
    () =>
      data.habits
        .filter((h) => !h.archived)
        .filter((h) => filter === "All" || h.category === filter),
    [data.habits, filter],
  );

  const usedCategories = useMemo(
    () =>
      CATEGORIES.filter((c) =>
        data.habits.some((h) => !h.archived && h.category === c),
      ),
    [data.habits],
  );

  const handleMark = useCallback(
    (habitId: string, category: string) => {
      actions.cycleMark(dateKey(today), habitId, category);
    },
    [actions, today],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <PageHeader title="Tracker" subtitle="Tap to mark today's habits" />

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
      >
        <FilterChip
          label="All"
          active={filter === "All"}
          onPress={() => setFilter("All")}
        />
        {usedCategories.map((c) => (
          <FilterChip
            key={c}
            label={c}
            active={filter === c}
            color={CATEGORY_COLORS[c as keyof typeof CATEGORY_COLORS]}
            onPress={() => setFilter(c)}
          />
        ))}
      </ScrollView>

      {activeHabits.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nothing to track yet</Text>
          <Text style={styles.emptyHint}>
            Add habits from the Today screen to start tracking.
          </Text>
        </Card>
      ) : (
        <View style={styles.habitList}>
          {activeHabits.map((habit: Habit) => {
            const todayKey = dateKey(today);
            const status = data.marks[todayKey]?.[habit.id] as MarkStatus | undefined;
            const scheduled = isScheduled(habit, today);
            const editable = canEditMark(todayKey, today, grace);
            const { current } = habitStreaks(habit, data.marks, today, frozen);
            const color =  CATEGORY_COLORS[habit.category] ?? colors.accent;

            return (
              <View key={habit.id} style={styles.habitRow}>
                <View style={styles.habitInfo}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <View style={styles.habitText}>
                    <Text style={styles.habitName} numberOfLines={1}>
                      {habit.name}
                    </Text>
                    <View style={styles.habitMeta}>
                      <Text style={styles.habitCategory}>{habit.category}</Text>
                      {!scheduled && !status && (
                        <Text style={styles.notScheduled}>Not scheduled</Text>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.habitActions}>
                  {current > 0 && <StreakFlame streak={current} size={14} />}
                  {scheduled && (
                    <MarkButton
                      status={status}
                      onPress={() => handleMark(habit.id, habit.category)}
                      size={22}
                      locked={!editable && !status}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <LegendItem color={colors.done} label="done" />
        <LegendItem color={colors.missed} label="missed" />
        <LegendItem color={colors.skipped} label="skipped" />
        <Text style={styles.legendText}>🔒 locked (past)</Text>
      </View>
    </ScrollView>
  );
}

function FilterChip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && {
          backgroundColor: color ? color + "26" : colors.accent + "26",
          borderColor: color ?? colors.accent,
        },
      ]}
    >
      {color && (
        <View style={[styles.chipDot, { backgroundColor: color }]} />
      )}
      <Text
        style={[
          styles.chipText,
          active && { color: color ?? colors.accent },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.empty,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.empty,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    marginBottom: 16,
    flexGrow: 0,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.muted,
  },
  habitList: {
    gap: 0,
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface + "CC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 8,
  },
  habitInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  habitText: {
    flex: 1,
  },
  habitName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
  habitMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  habitCategory: {
    fontSize: 11,
    color: colors.muted,
  },
  notScheduled: {
    fontSize: 11,
    color: colors.faint,
    fontStyle: "italic",
  },
  habitActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: colors.muted,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.ink,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
});
