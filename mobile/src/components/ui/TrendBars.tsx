// TrendBars — simple bar chart for weekly completion trends.
// Each bar represents a day with height proportional to completion rate.

import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { colors } from "../../lib/colors";

interface TrendPoint {
  date: Date;
  rate: number;
}

interface Props {
  data: TrendPoint[];
  height?: number;
}

export function TrendBars({ data, height = 120 }: Props) {
  if (data.length === 0) return null;

  const maxVal = 100;

  return (
    <View style={[styles.container, { height }]}>
      {data.map((point) => {
        const barHeight = Math.max(point.rate, 4); // minimum 4% for visibility
        const isComplete = point.rate >= 100;

        return (
          <View key={point.date.toISOString()} style={styles.barWrapper}>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${(barHeight / maxVal) * 100}%`,
                    backgroundColor: isComplete ? colors.done : colors.accent,
                    opacity: point.rate === 0 ? 0.3 : 1,
                  },
                ]}
              />
            </View>
            <Text style={styles.label}>
              {point.date.toLocaleDateString(undefined, {
                weekday: "narrow",
              })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    height: "100%",
  },
  barContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    maxHeight: "85%",
  },
  bar: {
    width: "60%",
    maxWidth: 24,
    borderRadius: 4,
    minHeight: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: "monospace",
    color: colors.faint,
    marginTop: 4,
  },
});
