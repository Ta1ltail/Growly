// Mobile HabitCard — a single habit row with name, category dot, streak flame,
// and a MarkButton for today. Used in TodayScreen and TrackerScreen.

import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import type { Habit, MarkStatus } from "@project101/shared";
import { CATEGORY_COLORS, habitStreaks, dateKey } from "@project101/shared";
import { colors } from "../../lib/colors";
import { MarkButton } from "./MarkButton";
import { StreakFlame } from "./StreakFlame";

interface Props {
  habit: Habit;
  marks: Record<string, Record<string, MarkStatus>>;
  today: Date;
  frozen: Set<string>;
  onMark: (habitId: string) => void;
  onPress?: () => void;
}

export function HabitCard({ habit, marks, today, frozen, onMark, onPress }: Props) {
  const todayKey = dateKey(today);
  const status = marks[todayKey]?.[habit.id] as MarkStatus | undefined;
  const { current } = habitStreaks(habit, marks, today, frozen);
  const color = CATEGORY_COLORS[habit.category] ?? colors.accent;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
          <View style={styles.meta}>
            <Text style={styles.category}>{habit.category}</Text>
            {current > 0 && <StreakFlame streak={current} size={12} />}
          </View>
        </View>
      </View>
      <MarkButton
        status={status}
        onPress={() => onMark(habit.id)}
        size={20}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
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
  cardPressed: {
    opacity: 0.8,
    borderColor: colors.accent + "60",
  },
  left: {
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
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  category: {
    fontSize: 11,
    color: colors.muted,
  },
});
