// Mobile WeekdayPicker — Mon-first weekday selector with quick shortcuts.
// Matches the web's WeekdayPicker component.

import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { colors } from "../../lib/colors";

interface Props {
  value: number[];
  onChange: (days: number[]) => void;
}

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];

const WEEKDAY_LABELS: Record<number, string> = {
  0: "S", 1: "M", 2: "T", 3: "W", 4: "T", 5: "F", 6: "S",
};

const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

export function WeekdayPicker({ value, onChange }: Props) {
  const toggle = (day: number) => {
    onChange(
      value.includes(day) ? value.filter((d) => d !== day) : [...value, day],
    );
  };

  const isEveryDay = value.length === 7 || value.length === 0;
  const isWeekdays = VALUE_MATCHES(value, WEEKDAYS);
  const isWeekends = VALUE_MATCHES(value, WEEKENDS);

  return (
    <View>
      <View style={styles.grid}>
        {MON_FIRST.map((day) => {
          const active = value.includes(day);
          return (
            <Pressable
              key={day}
              onPress={() => toggle(day)}
              accessibilityLabel={WEEKDAY_LABELS[day]}
              accessibilityState={{ selected: active }}
              style={[
                styles.dayBtn,
                active && styles.dayActive,
              ]}
            >
              <Text style={[styles.dayText, active && styles.dayTextActive]}>
                {WEEKDAY_LABELS[day]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.shortcuts}>
        <Shortcut
          label="Every day"
          active={isEveryDay}
          onPress={() => onChange([0, 1, 2, 3, 4, 5, 6])}
        />
        <Shortcut
          label="Weekdays"
          active={isWeekdays}
          onPress={() => onChange([1, 2, 3, 4, 5])}
        />
        <Shortcut
          label="Weekends"
          active={isWeekends}
          onPress={() => onChange([0, 6])}
        />
      </View>
    </View>
  );
}

function Shortcut({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.shortcutBtn, active && styles.shortcutActive]}
    >
      <Text style={[styles.shortcutText, active && styles.shortcutTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function VALUE_MATCHES(a: number[], b: number[]): boolean {
  return a.length === b.length && b.every((v) => a.includes(v));
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: 6,
  },
  dayBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayActive: {
    backgroundColor: colors.accent,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  dayTextActive: {
    color: colors.white,
  },
  shortcuts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  shortcutBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  shortcutActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + "1A",
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.muted,
  },
  shortcutTextActive: {
    color: colors.accent,
  },
});
